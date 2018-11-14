const request = require('request');

let token_url = 'https://login.eloqua.com/auth/oauth2/token';

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

        if(!result){
          result = {
            statusCode : res.statusCode,
				    statusMessage : res.statusMessage
          }
          reject(result);
        }
        else{
          if(result.result){
            resolve(result);
          }
          else if(result.error){
            reject(result);
          }
          else{
            resolve(result);  
          }
        }
        
        
      }
    })
  });
};

module.exports = function(emitter){
  
  emitter.registerHook('eloqua::oauth::refresh',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret &&  options.refresh_token && options.redirect_uri){ 
        let credentials = new Buffer(options.client_id + ':' + options.client_secret).toString('base64');
        let grant_option = {
          method: 'POST', url: token_url,
          body: { grant_type: 'refresh_token', refresh_token: options.refresh_token, scope: 'full', redirect_uri: options.redirect_uri  },
          headers: { 'Authorization': 'Basic ' + credentials }
        };
        let grant_api = execute_api(grant_option);
        grant_api.then(function(grant_api_res){
          resolve(grant_api_res);
        }, function(err){
          reject(err);
        });
      }
      else{
        reject("Missing one of these required parameters: refresh_token, redirect_uri, client_id, client_secret");
      }
    });

  });
  
  emitter.registerHook('eloqua::contact::fields',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret &&  options.eloqua_base_url && options.access_token){ 
        let contact_fields_option = {
          url: options.eloqua_base_url + '/api/bulk/2.0/contacts/fields?limit=1000&orderBy=name%20asc',            
          method: 'GET',        
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + options.access_token
          },
        };
        let contact_fields = execute_api(contact_fields_option);
        contact_fields.then(function(contact_fields_res){
          let response = contact_fields_res;
          resolve(response);
        }, function(err){
          reject(err);
        });
      }
      else{
        reject("Missing one of these required parameters: access_token, eloqua_base_url, client_id, client_secret");
      }
    });

  });
  
  emitter.registerHook('eloqua::customobject::fields',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret &&  options.eloqua_base_url && options.access_token && options.coid){ 
        let customobject_field_option = {
          url: options.eloqua_base_url + '/api/REST/2.0/assets/customObject/' + options.coid,           
          method: 'GET',        
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + options.access_token
          },
        };
        let customobject_field = execute_api(customobject_field_option);
        customobject_field.then(function(customobject_field_res){
          resolve(customobject_field_res);
        }, function(err){
          reject(err);
        });
      }
      else{
        reject("Missing one of these required parameters: access_token, eloqua_base_url, client_id, client_secret, coid");
      }
    });

  });
  
  emitter.registerHook('eloqua::customobjects',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret &&  options.eloqua_base_url && options.access_token){ 
        let customobject_option = {
          url: options.eloqua_base_url + '/api/REST/2.0/assets/customObjects',           
          method: 'GET',        
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + options.access_token
          },
        };
        let customobject = execute_api(customobject_option);
        customobject.then(function(customobject_res){
          resolve(customobject_res);
        }, function(err){
          reject(err);
        });
      }
      else{
        reject("Missing one of these required parameters: access_token, eloqua_base_url, client_id, client_secret");
      }
    });

  });
  
  emitter.registerHook('transmitsms::numbers',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret &&  options.transmitsmsurl){ 
        let auth = new Buffer(options.client_id + ":" + options.client_secret).toString("base64");
        let numbers_option = {
          url: options.transmitsmsurl + '/get-numbers.json',           
          method: 'GET',        
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + auth
          },
        };
        let numbers = execute_api(numbers_option);
        numbers.then(function(number_res){
          resolve(number_res);
        }, function(err){
          reject(err);
        });
      }
      else{
        reject("Missing one of these required parameters: transmitsmsurl, client_id, client_secret");
      }
    });

  });
  emitter.registerHook('transmitsms::senderids',function(options){
         
    return new Promise(function(resolve,reject){
      if(options.client_id && options.client_secret &&  options.transmitsmsurl){ 
        let auth = new Buffer(options.client_id + ":" + options.client_secret).toString("base64");
        let senderIdOption = {
          url: options.transmitsmsurl + '/get-sender-ids.json',           
          method: 'GET',        
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + auth
          },
        };
        let senderId = execute_api(senderIdOption);
        senderId.then(function(senderIdRes){
          resolve(senderIdRes.result.caller_ids);
        }, function(err){
          reject(err);
        });
      }
      else{
        reject("Missing one of these required parameters: transmitsmsurl, client_id, client_secret");
      }
    });

  });
  
}