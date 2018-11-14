const express = require('express');
const router = express.Router();
const config = require('config');
const async = require('async');


module.exports = function(emitter){
  
  const mdlware = require('./middleware')(emitter);
  
  router.post('/:InstanceType/create/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    let queryOption = {
      table: 'Instance',
      condition: { InstanceId: req.params.InstanceId },
      content: {
        "InstallId": req.params.InstallId,                  
        "InstanceId": req.params.InstanceId,               
        "InstanceType": req.params.InstanceType,
        "DateCreated": Date.now(),
        "status": "created"
      }
    };
    let instance = emitter.invokeHook('db::upsert', queryOption);
    instance.then(function(instance_res){
      res.status(200).json({
        "recordDefinition" :
        {
            "Country" : "{{Contact.Field(C_Country)}}",
            "ContactID" : "{{Contact.Id}}",
            "EmailAddress" : "{{Contact.Field(C_EmailAddress)}}",
            "MobilePhone" : "{{Contact.Field(C_MobilePhone)}}"
        },
        "requiresConfiguration": false
      });
    },function(err){
      let error = {
        code: "E-0009",
        message: "Something went wrong while creating the instance info",
        details: err
      };
      res.status(400).json(error);
    });

  });

  router.all('/action/configure/:InstallId/:InstanceId', mdlware.verify, function(req, res, next){

    async.auto({

      consumer : function(callback) {    
        let queryOption = {
          table: 'Consumer',
          condition: { InstallId: req.params.InstallId }
        };
        let consumer = emitter.invokeHook('db::findOne', queryOption);
        consumer.then(function(consumer_res){    
          callback(null,consumer_res[0]);
        }, function(err){
          let error = {
            code: "E-0010",
            message: "Something went wrong while looking for the client info",
            details: err
          };
          next(error);
        });       
      },
      token: ['consumer',function(results, callback){
        if(((new Date) - results.consumer.LastLogin) > (7 * 60 * 60 * 1000)){
          let redirect_uri = config.serverurl + '/eloqua/lifecycle/callback/' + req.params.InstallId;
          let queryOption = {
            client_id: config.client_id,
            client_secret: config.client_secret,
            refresh_token : results.consumer.refresh_token,
            redirect_uri: redirect_uri
          };
          let refresh = emitter.invokeHook('eloqua::oauth::refresh', queryOption);
          refresh.then(function(refresh_res){ 
            let token = refresh_res[0];
            let queryOption = {
              table: 'Consumer',
              condition: { InstallId: req.params.InstallId },
              content: {
                refresh_token: token.refresh_token,
                access_token: token.access_token,
                LastLogin: Date.now()
              }
            };
            let upsert = emitter.invokeHook('db::upsert', queryOption);
            upsert.then(function(upsert_res){
              callback(null,upsert_res[0].access_token);
            }, function(err){
              let error = {
                code: "E-0011",
                message: "Something went wrong while updating the client info",
                details: err
              };
              next(error);
            });
            
            
          }, function(err){
            let error = {
              code: "E-0012",
              message: "Something went wrong while refreshing the login info",
              details: err
            };
            next(error);
          });
        }
        else{
          callback(null, results.consumer.access_token);
        }
      }],
      instance : function(callback) {    
        let queryOption = {
          table: 'Instance',
          condition: { InstanceId: req.params.InstanceId }
        };
        let instance = emitter.invokeHook('db::findOne', queryOption);
        instance.then(function(instance_res){     
          callback(null,instance_res[0]);
        }, function(err){
          let error = {
            code: "E-0013",
            message: "Something went wrong while refreshing the login info",
            details: err
          };
          next(error);
        });       
      },
      merge_fields: ['token', function(results, callback) {
        let queryOption = {
          client_id: config.client_id,
          client_secret: config.client_secret,
          eloqua_base_url: results.consumer.eloqua_base_url,
          access_token: results.token
        };
        let contact = emitter.invokeHook('eloqua::contact::fields', queryOption);
        contact.then(function(contact_res){    
          let items = contact_res[0].items;
          callback(null,items);
        }, function(err){
          let error = {
            code: "E-0014",
            message: "Something went wrong while refreshing the login info",
            details: err
          };
          next(error);
        });
      }],
      custom_objects: ['token',function(results, callback) {
        
        let queryOption = {
          client_id: config.client_id,
          client_secret: config.client_secret,
          eloqua_base_url: results.consumer.eloqua_base_url,
          access_token: results.token
        };
        let custom_object = emitter.invokeHook('eloqua::customobjects', queryOption);
        custom_object.then(function(custom_object_res){     
          callback(null,custom_object_res[0]);
        }, function(err){
          let error = {
            code: "E-0015",
            message: "Something went wrong while refreshing the login info",
            details: err
          };
          next(error);
        });  
      }],
      sender_ids: ['consumer', function(results, callback) {
        let queryOption = {
          client_id: results.consumer.transmitsms_api_key,
          client_secret: results.consumer.transmitsms_api_secret,
          transmitsmsurl: config.transmitsmsurl
        };
        let sender_ids = emitter.invokeHook('transmitsms::senderids', queryOption);
        sender_ids.then(function(sender_ids_res){  
          callback(null,sender_ids_res[0]);
        }, function(err){
          let error = {
            code: "E-0016",
            message: "Something went wrong while obtaining the client burstsms sender id list.",
            details: err,
            solution: "Check if you have configure the application properly, Fill in your Burst SMS api key and secret in the configuration page which can be found in the App Catalog"
          };
          next(error);
        });  
      }],
      message: ['consumer', function(results, callback){
        if(req.body.message){
          let queryOption = {
            table: 'Instance',
            condition: { InstanceId: req.params.InstanceId },
            content: {
              "caller_id": req.body.caller_id,
              "message": req.body.message,
              "recipient_field": req.body.recipient_field,
              "country_field": req.body.country_field,
              "country_setting": req.body.country_setting,
              "custom_object_id": req.body.custom_object_id,
              "notification_field": req.body.notification_field,
              "mobile_field": req.body.mobile_field,
              "email_field": req.body.email_field,
              "title_field": req.body.title_field,
              "DateConfigured": Date.now(),
              "status": "configured"
            }
          };
          let upsert = emitter.invokeHook('db::upsert', queryOption);
          upsert.then(function(upsert_res){
            callback(null,"Settings Saved");
          }, function(err){
            let error = {
              code: "E-0017",
              message: "Something went wrong while updating the instance info",
              details: err
            };
            next(error);
          });
        }
        else{
          callback(null,null);
        }
      }]
    },
    function(err, results) {
      if(err){
        next(err);
      }
      else{
        if(!results.instance.message){
          results.instance.message = "Enter your text message here, you can send up to 4 joined messages of 153 characters each. Please allow for extra characters if using a Merge field. \n\nStandardised opt out message can be removed if not legally required. Please see your local SPAM compliance rules on use. \n\nOpt-out reply STOP"
        }

        res.render('action',results);
      }
    });

    
  });
  
  router.all('/decision/configure/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    res.render('decision');
  });

  router.post('/:InstanceType/copy/:InstallId/:InstanceId/:OriginalInstanceId', mdlware.verify, function(req, res, next){

    let queryOption = {
      table: 'Instance',
      condition: { InstanceId: req.params.OriginalInstanceId }
    };
    let origInstance = emitter.invokeHook('db::findOne', queryOption);
    origInstance.then(function(origInstance_res){
      
      let content = JSON.parse(JSON.stringify(origInstance_res[0]));
      delete content._id;
      content.InstallId = req.params.InstallId;
      content.InstanceId = req.params.InstanceId;
      content.InstanceType = req.params.InstanceType;
      content.DateCreated = Date.now();
      content.CopiedInstanceId = req.params.OriginalInstanceId
      content.status =  "created";
      let queryOption = {
        table: 'Instance',
        condition: { InstanceId: req.params.InstanceId },
        content: content
      };
      let instance = emitter.invokeHook('db::upsert', queryOption);
      instance.then(function(instance_res){
        res.status(200).json({
          "recordDefinition" :
          {
              "Country" : "{{Contact.Field(C_Country)}}",
              "ContactID" : "{{Contact.Id}}",
              "EmailAddress" : "{{Contact.Field(C_EmailAddress)}}",
              "MobilePhone" : "{{Contact.Field(C_MobilePhone)}}"
          },
          "requiresConfiguration": false
        });
      },function(err){
        let error = {
          code: "E-0018",
          message: "Something went wrong while copying the instance info",
          details: err
        };
        next(error);
      });
    },function(err){
      let error = {
        code: "E-0019",
        message: "Something went wrong while copying the instance info",
        details: err
      };
      next(error);
    });
    
  });

  router.post('/:InstanceType/remove/:InstallId/:InstanceId', mdlware.verify, function(req, res, next){

    let queryOption = {
      table: 'Instance',
      condition: { InstanceId: req.params.InstanceId },
      content: {
        "DateRemoved": Date.now(),
        "status": "removed"
      }
    };
    let instance = emitter.invokeHook('db::upsert', queryOption);
    instance.then(function(instance_res){
      res.status(200).send("Successfully removed");
    },function(err){
      let error = {
        code: "E-0020",
        message: "Something went wrong while removing the instance",
        details: err
      };
      next(error);
    });
    
  });

  router.get('/customobject/:InstallId/:CustomObjectId', function(req, res, next){

    let queryOption = {
      table: 'Consumer',
      condition: { InstallId: req.params.InstallId }
    };
    let consumer = emitter.invokeHook('db::findOne', queryOption);
    consumer.then(function(consumer_res){     
      let custom_object_option = {
        client_id: config.client_id,
        client_secret: config.client_secret,
        eloqua_base_url: consumer_res[0].eloqua_base_url,
        access_token: consumer_res[0].access_token,
        coid: req.params.CustomObjectId
      };
      let custom_object_fields = emitter.invokeHook('eloqua::customobject::fields', custom_object_option);
      custom_object_fields.then(function(custom_object_fields_res){     
        res.status(200).json(custom_object_fields_res[0]);
      }, function(err){
        let error = {
          code: "E-0021",
          message: "Something went wrong while obtaining custom object fields",
          details: err
        };
        next(error);
      });
    }, function(err){
      let error = {
        code: "E-0022",
        message: "Something went wrong while obtaining custom object fields",
        details: err
      };
      next(error);
    }); 
    
  });
  
  router.post('/:InstanceType/notify/:InstallId/:InstanceId', mdlware.verify, function(req, res, next){

    
  });

  return router;

}