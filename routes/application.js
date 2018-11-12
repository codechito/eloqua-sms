var express = require('express');
var router = express.Router();
var config = require('config');

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
        let consumer = {
          InstallId: req.params.InstallId,
          refresh_token: enable_uri_res.refresh_token,
          access_token: enable_uri_res.access_token,
          eloqua_base_url: enable_uri_res.eloqua_base_url
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
        })
      },function(err){
        res.status(400).json(err);
      });
    }
    else{
      res.status(400).json("Missing one of these required parameters: code, InstallId");
    }
  });

  router.post('/configure', function(req, res){

  });

  router.post('/disable', function(req, res){

  });

  router.post('/status', function(req, res){

  });

  return router;
}

