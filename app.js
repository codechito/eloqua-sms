const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const Slack = require('slack-node');
const config = require('config');

let slack = new Slack();
slack.setWebhook(config.slack_webhook);

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/assets",express.static(path.join(__dirname, 'public')));

let emitter = require('psharky');
require('./core/mongo')(emitter);
require('./core/eloqua')(emitter);

app.use(function (req, res, next) {
  function afterResponse() {
    res.removeListener('finish', afterResponse);
    // let color = "";
    // let priority = "";
    // switch(res.signal){
    //   case "error":  color = "#e53c30"; priority = "High"; break;
    //   case "success": color = "#36a64f"; priority = "None"; break;
    //   case "warning":  color = "#f3f71b"; priority = "Medium" break;
    // };
    // var attachments = [];
    // attachments.push({
    //   "color": color, "pretext": options.pretext,
    //   "author_name": "Eloqua", "title": options.title,
    //   "text": options.text, "fields": options.fields,
    //   "footer": "Sharky", "ts":  Date.now()/1000
    // });
    // slack.webhook({
    //   channel: "integrated-apps", username: "sharky",
    //   text: options.text, attachments: attachments
    // });
  }
  res.on('finish', afterResponse);
  next();
});

let application = require('./routes/application')(emitter);

app.use('/eloqua/lifecycle/', application);

module.exports = app;
