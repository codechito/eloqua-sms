const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

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

let application = require('./routes/application')(emitter);

app.use('/eloqua/lifecycle/', application);

module.exports = app;
