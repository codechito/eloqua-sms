const express = require('express');
const router = express.Router();
const config = require('config');
const mongoose = require('mongoose');

module.exports = function(emitter){
  
  router.post('/enable', function(req, res){
    
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
        res.status(400).json(err);
      });
    },function(err){
      res.status(400).json(err);
    });
    
  });

  router.get('/callback/:InstallId', function(req, res){
    
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
          res.status(400).json(err);
        });
      },function(err){
        res.status(400).json(err);
      });
    }
    else{
      res.status(400).json("Missing one of these required parameters: code, InstallId");
    }
    
  });
  
  router.use(function(req, res, next){
    
    console.log(req.method, req.originalUrl);
    let verify_options = {
      "originalUrl": config.serverurl + req.originalUrl,           	                        
      "method" : req.method,
      "client_id" : config.client_id,
      "client_secret" : config.client_secret
    };
    let verify = emitter.invokeHook('eloqua::request::verify',verify_options);
    verify.then(function(verify_res){
      if(verify_res[0]){
        next();
      }
      else{
        res.status(400).json("Oauth Verification failed");
      }
      
    },function(err){
      res.status(400).json(err);
    });

    next();
    
  }).get('/configure/:InstallId', function(req, res){
    
    res.render('application');
    
  }).post('/disable/:InstallId', function(req, res){ 
    
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
      console.log(err);
      res.status(400).json(err);
    });

  }).get('/status', function(req, res){
    
    res.status(200).json({
      database: mongoose.connection.readyState ? "Up" : "Down"
    });
    
  });

  return router;
}

