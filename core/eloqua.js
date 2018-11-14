const qs = require('querystring');
const request = require('request');
const url = require('url');
const crypto = require('crypto');

let authorize_url = 'https://login.eloqua.com/auth/oauth2/authorize';
let token_url = 'https://login.eloqua.com/auth/oauth2/token';
let base_url = 'https://login.eloqua.com/id';

const execute_api = function(options){
  return new Promise(function(resolve,reject){
    request({
      method: options.method,
      url: options.url,
      headers: options.headers || {},
      json: options.body || {}
    },function(err, res, body){
      if(err){
        reject(err);
      }
      else{
        let result = res ? res.body : body;
        if(result.error){
          reject(result);
        }
        else{
          resolve(result);  
        }
      }
    })
  });
};

const parse_url = function(uri,method){
  let parsed = url.parse(uri, true);
  parsed.baseUrl = parsed.protocol + '//' + parsed.host + parsed.pathname;
  parsed.method = method.toUpperCase();
  return parsed;
}

const queryfy = function(params){
  let array = [];
  for (var prop in params) {
      array.push(prop + '=' + params[prop]);
  }
  let encoded = array.sort().join('&');
  return encoded;
}

const sign_request = function(params, request, client_secret){

  let base = encodeURIComponent(request.method).replace(/!/g, '%21') + '&' +
  encodeURIComponent(request.baseUrl).replace(/!/g, '%21') + '&' + 
  encodeURIComponent(queryfy(params)).replace(/!/g, '%21')
  
  let signingKey = encodeURIComponent(client_secret).replace(/!/g, '%21') + '&';
  let signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');

  return signature;
}

module.exports = function(emitter){

  if(!emitter){
    emitter = require('psharky');
  }
  emitter.registerHook('eloqua::application::enable',function(options){
      return new Promise(function(resolve,reject){
        if(options.install_id && options.redirect_uri && options.client_id){
          let parameters = qs.stringify({
            client_id: options.client_id,
            redirect_uri: options.redirect_uri,
            state: options.install_id,
            response_type: 'code',
            scope: 'full'
          });    
          resolve(authorize_url + '?' + parameters);
        }
        else{
          reject("Missing one of these required parameters: install_id, redirect_uri, client_id");
        }
      });
  });

  emitter.registerHook('eloqua::application::enable::callback',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret && options.authorization_code && options.redirect_uri){
        let credentials = new Buffer(options.client_id + ':' + options.client_secret).toString('base64');
        let grant_option = {
          method: 'POST', url: token_url,
          body: { grant_type: 'authorization_code', code: options.authorization_code, redirect_uri: options.redirect_uri },
          headers: { 'Authorization': 'Basic ' + credentials }
        };
        let grant_api = execute_api(grant_option);
        grant_api.then(function(grant_res){
          let base_url_option = {
            url: base_url,            
						method: 'GET',        
						headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + grant_res.access_token }
          };
          let base_url_api = execute_api(base_url_option);
          base_url_api.then(function(base_url_res){
            if(base_url_res && base_url_res.urls){
              let content = {
                refresh_token: grant_res.refresh_token,
                access_token: grant_res.access_token,
                eloqua_base_url: base_url_res.urls.base
              };
              resolve(content);
            }
            else{
              reject(base_url_res);
            }
          },function(err){
            reject(err);
          });
        },function(err){
          reject(err);
        })
      }
      else{
        reject("Missing one of these required parameters: client_id, client_secret, authorization_code, redirect_uri");
      }
    });

  });

  emitter.registerHook('eloqua::request::verify',function(options){
    
    return new Promise(function(resolve,reject){
      if(options.originalUrl && options.method && options.client_id && options.client_secret){
          let request = parse_url(options.originalUrl, options.method);       
          let signature = request.query.oauth_signature;
          delete request.query.oauth_signature;
          let generated = sign_request(request.query, request, options.client_secret);
          let status  = options.client_id === request.query.oauth_consumer_key && generated === signature;
          resolve({status:status});
      }
      else{
        reject("Missing one of these required parameters: originalUrl, method, client_id, client_secret");
      }
    });

  });

};