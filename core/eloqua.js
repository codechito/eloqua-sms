const qs = require('querystring');
const request = require('request');

let authorize_url = 'https://login.eloqua.com/auth/oauth2/authorize';
let token_url = 'https://login.eloqua.com/auth/oauth2/token';
let base_url = 'https://login.eloqua.com/id';

let execute_api = function(options){
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
        resolve(result);
      }
    })
  });
};

module.exports = function(emitter){

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
            let content = {
              refresh_token: grant_res.refresh_token,
              access_token: grant_res.access_token,
              eloqua_base_url: base_url_res.urls.base
            };
            resolve(content);
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

};