const express = require('express');
const router = express.Router();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const Slack = require('slack-node');
const config = require('config');

let slack = new Slack();
slack.setWebhook(config.slack_webhook);

module.exports = function(emitter){

  return {
    verify: function(req, res, next){   
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
          res.status(400).json("Oauth Verification failed");
        }
      },function(err){
        res.status(400).json(err);
      });
    },
    notify: function(req, res, next){   
      
      if(req.notify){
        let color = "";
        let priority = "";
        switch(req.notify.signal){
          case "error":  color = "#e53c30"; priority = "High"; break;
          case "success": color = "#36a64f"; priority = "None"; break;
          case "warning":  color = "#f3f71b"; priority = "Medium"; break;
        };
        var attachments = [];
        attachments.push({
          "color": color, "pretext": req.notify.consumer.SiteName,
          "author_name": req.notify.consumer.UserName , "title": req.notify.title,
          "text": req.notify.text, "fields": req.notify.fields,
          "footer": "TechnologyPartnerBurstSMS", "ts":  Date.now()/1000
        });
        slack.webhook({
          channel: "integrated-apps", username: "Sharky",
          text: "Activity Details", attachments: attachments
        },function(){
          next();
        });
      }
      else{
        next();
      }
    }
  }
};