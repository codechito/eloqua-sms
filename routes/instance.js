const express = require('express');
const router = express.Router();
const config = require('config');


module.exports = function(emitter){
  
  const mdlware = require('./middleware')(emitter);

  router.use(function(req,res,next){
    console.log(req.originalUrl);
    console.log(req.body);
    next();
  });
  
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
      res.status(400).json(err);
    });

  });

  router.all('/:InstanceType/configure/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    
  });

  router.post('/:InstanceType/copy/:InstallId/:InstanceId/:OriginalInstanceId', mdlware.verify, function(req, res){

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
        res.status(400).json(err);
      });
    },function(err){
      res.status(400).json(err);
    });
    
  });

  router.delete('/:InstanceType/remove/:InstallId/:InstanceId', mdlware.verify, function(req, res){

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
      res.status(400).json(err);
    });
    
  });

  router.post('/:InstanceType/notify/:InstallId/:InstanceId', mdlware.verify, function(req, res){

    
  });

  return router;

}