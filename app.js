/**
 *
 * Main script module.
 * <p/>
 * Responsibilities:
 * <ul>
 *   <li>Configure HTTP server</li>
 *   <li>Set up the view engine</li>
 *   <li>Create router</li>
 *   <li>Register the socket handler</li>
 *   <li>Handling the 404 errors</li>
 * </ul>
 *
 * @module app
 */
'use strict';

var express = require('express'),
    path = require('path'),
    //    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');

/** main route to documents*/
var docRoute = require('./server/routes/index');
/** method used to register the socket handler*/
var registerSocketHandler = require('./server/socket_handler');
/** app instance, often used as EventEmitter object*/
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'app-test'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'app-test')));

app.use('/', docRoute);


// configure socket server
registerSocketHandler(app);


// catch 404 and forward to error handler
app.use(function (err, req, res, next) {
  /* jshint unused:false */ // next, res is not used
  err = new Error('Not Found'); // override
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    /* jshint unused:false */ // next, req is not used
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error  : err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  /* jshint unused:false */ // next, req is not used
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error  : {}
  });
});


module.exports = app;
