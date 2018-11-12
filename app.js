var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var app = express();
var emitter = require('psharky');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/assets",express.static(path.join(__dirname, 'public')));


module.exports = app;
