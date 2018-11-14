const express = require('express');
const router = express.Router();
const config = require('config');
const mongoose = require('mongoose');
const countries = require('country-data').countries;

module.exports = function(emitter){
  
  const mdlware = require('./middleware')(emitter);
  
  router.post('/enable', function(req, res, next){
    
    let redirect_uri = config.serverurl + '/eloqua/lifecycle/callback/' + req.query.InstallId;
    let enable_uri_option = {
      install_id: req.query.InstallId ,
      redirect_uri: redirect_uri,
      client_id: req.query.AppId
    };
    let enable_app = emitter.invokeHook('eloqua::application::enable',enable_uri_option);
    enable_app.then(function(enable_app_res){
      let queryOption = {
        table: 'Consumer',
        condition: {
          InstallId: req.query.InstallId,
          UserId: req.query.UserId,
          SiteId: req.query.SiteId
        },
        content: {
          InstallId: req.query.InstallId,
          CallbackUrl: req.query.CallbackUrl,
          UserId: req.query.UserId,
          UserName: req.query.UserName,
          SiteId: req.query.SiteId,
          SiteName: req.query.SiteName
        }
      };
      let upsert = emitter.invokeHook('db::upsert', queryOption);
      upsert.then(function(upsert_res){
        res.redirect(enable_app_res[0]);    
      },function(err){
        let error = {
          code: "E-0001",
          message: "Something went wrong while inserting client info",
          details: err
        };
        next(error);
      });
    },function(err){
      let error = {
        code: "E-0002",
        message: "Something went wrong while installing the application",
        details: err
      };
      next(error);
    });
    
  });

  router.get('/callback/:InstallId', function(req, res, next){
    
    if(req.query.code && req.params.InstallId){
      let redirect_uri = config.serverurl + '/eloqua/lifecycle/callback/' + req.params.InstallId;
      let callback_option = {
        client_id: config.client_id ,
        client_secret: config.client_secret,
        authorization_code: req.query.code,
        redirect_uri: redirect_uri
      };
      let enable_uri = emitter.invokeHook('eloqua::application::enable::callback',callback_option);
      enable_uri.then(function(enable_uri_res){
        let token = enable_uri_res[0];
        let consumer = {
          InstallId: req.params.InstallId,
          refresh_token: token.refresh_token,
          access_token: token.access_token,
          eloqua_base_url: token.eloqua_base_url,
          status: 'enabled',
          DateEnabled: Date.now(),
          LastLogin: Date.now()
        };
        let queryOption = {
          table: 'Consumer',
          condition: { InstallId: req.params.InstallId },
          content: consumer
        };
        let upsert = emitter.invokeHook('db::upsert', queryOption);        
        upsert.then(function(upsert_res){
          res.redirect(upsert_res[0].CallbackUrl);
        },function(err){
          let error = {
            code: "E-0003",
            message: "Something went wrong while updating the client info",
            details: err
          };
          next(error);
        });
      },function(err){
        let error = {
          code: "E-0004",
          message: "Something went wrong while confirming the installation of the application",
          details: err
        };
        next(error);
      });
    }
    else{
      let error = {
        code: "E-0005",
        message: "Something went wrong while confirming the installation of the application",
        details: "Missing one of these required parameters: code, InstallId"
      };
      next(error);
    }
    
  });
  
  router.all('/configure/:InstallId', mdlware.verify, function(req, res, next){
    
    let consumer = emitter.invokeHook('db::findOne', { table:'Consumer', condition: { InstallId: req.params.InstallId }});        
    consumer.then(function(consumer_res){
      if(req.body.transmitsms_api_key){
        let queryOption = {
          table: 'Consumer',
          condition: { InstallId: req.params.InstallId },
          content: {
            transmitsms_api_key: req.body.transmitsms_api_key,
            transmitsms_api_secret: req.body.transmitsms_api_secret,
            default_country: req.body.default_country,
            DateConfigured: Date.now()
          }
        };
        let upsert = emitter.invokeHook('db::upsert', queryOption);        
        upsert.then(function(upsert_res){
          upsert_res[0].message = "Account successfully updated";
          upsert_res[0].countries = countries;
          res.render('application',upsert_res[0]);
        },function(err){
          let error = {
            code: "E-0006",
            message: "Something went wrong while updating the client info",
            details: err
          };
          next(error);
        });
      }
      else{
        consumer_res[0].countries = countries;
        res.render('application',consumer_res[0]);
      }     
    },function(err){
        let error = {
          code: "E-0007",
          message: "Something went wrong while configuring the application",
          details: err
        };
        next(error);
    });   
    
  });
  
  router.post('/disable/:InstallId', mdlware.verify, function(req, res, next){ 
    
    let queryOption = {
      table: 'Consumer',
      condition: { InstallId: req.params.InstallId },
      content: {
        status: 'disabled',
        DateDisabled: Date.now()     
      }
    };
    let upsert = emitter.invokeHook('db::upsert', queryOption);       
    upsert.then(function(upsert_res){
      res.status(200).send('application uninstalled successfully');
    },function(err){
      let error = {
        code: "E-0008",
        message: "Something went wrong while updating the client info",
        details: err
      };
      next(error);
    });

  });
    
  router.get('/status/:InstallId', mdlware.verify, function(req, res){
    
    if(req.params.InstallId){
      res.status(200).json({
        database: mongoose.connection.readyState ? "Up" : "Down"
      });
    } 
    
  });

  return router;
}

