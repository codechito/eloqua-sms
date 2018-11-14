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
require('eloquafy')(emitter);

let application = require('./routes/application')(emitter);
let instance = require('./routes/instance')(emitter);

app.use('/eloqua/lifecycle/', application);
app.use('/eloqua/', instance);

module.exports = app;
