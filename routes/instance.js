const express = require('express');
const router = express.Router();
const config = require('config');


module.exports = function(emitter){
  
  const mdlware = require('./middleware')(emitter);
  
  router.post('/eloqua/:InstanceType/create/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    console.log(req.body);
    let queryOption = {
      table: 'Instance',
      condition: { InstallId: req.params.InstallId },
      content: {
        "InstallId": req.params.InstallId,                  
        "InstanceId": req.params.InstanceId,               
        "InstanceType": req.params.InstanceType,
        "DateCreated": Date.now()
      }
    };
    let consumer = emitter.invokeHook('db::upsert', queryOption);
      consumer.then(function(consumer_res){
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

        res.status(400).json(err);
    });

  });

  router.all('/eloqua/:InstanceType/configure/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    
  });

  router.post('/eloqua/:InstanceType/copy/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    
  });

  router.delete('/eloqua/:InstanceType/remove/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    
  });

  router.post('/eloqua/:InstanceType/notify/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    
  });

  return router;

}