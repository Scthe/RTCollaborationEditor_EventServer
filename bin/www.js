#!/usr/bin/env node

'use strict';
/* exported server */
/* global config */

// setup
var debug = require('debug')('chat2');
GLOBAL.config = require('../utils/config_loader');
require('../utils/log_utils')();


// app
var app = require('../app');

// start the HTML server
var server = app.listen(config.app_port, function () {
  var msg = 'Express server listening on port: ' + server.address().port;
  debug(msg);
  console.log(msg);
});
