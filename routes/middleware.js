const express = require('express');
const router = express.Router();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const Slack = require('slack-node');
const config = require('config');
const createError = require('http-errors');

let slack = new Slack();
slack.setWebhook(config.slack_webhook);

module.exports = function(emitter){

  return {
    verify: function(req, res, next){   
      console.log(req.method,req.originalUrl);
      let verify_options = {
        "originalUrl": config.serverurl + req.originalUrl,           	                        
        "method" : req.method,
        "client_id" : config.client_id,
        "client_secret" : config.client_secret
      };
      let verify = emitter.invokeHook('eloqua::request::verify',verify_options);
      verify.then(function(verify_res){
        if(verify_res[0].status){
          next();
        }
        else{
          let error = {
            code: "E-0023",
            message: "Something went wrong while verifying the request",
            details: "Oauth Verification failed"
          };
          res._error = error;
          res.status(400).json(error);
        }
      },function(err){
        let error = {
          code: "E-0023",
          message: "Something went wrong while verifying the request",
          details: err
        };
        res._error = error;
        res.status(400).json(error);
      });
    },
    notify: function(req, res, next){   
      
      if(req.notify && req.session.consumer){
        let color = "";
        let priority = "";
        switch(req.notify.signal){
          case "error":  color = "#e53c30"; priority = "High"; break;
          case "success": color = "#36a64f"; priority = "None"; break;
          case "warning":  color = "#f3f71b"; priority = "Medium"; break;
        };
        var attachments = [];
        attachments.push({
          "color": color, "pretext": req.session.consumer.SiteName,
          "author_name": req.session.consumer.UserName , "title": req.notify.title,
          "text": req.notify.text, "fields": req.notify.fields,
          "footer": "TechnologyPartnerBurstSMS", "ts":  Date.now()/1000
        });
        slack.webhook({
          channel: "integrated-apps", username: "Sharky",
          text: req.notify.text, attachments: attachments
        },function(){
          next();
        });
      }
      else{
        next();
      }
    },    
    oversight: function(req, res, next){
      next(createError(400));
    },
    catch: function(err,req, res, next){
        res.status(400).render('error',err);
    }
  }
};