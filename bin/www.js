#!/usr/bin/env node

'use strict';
/* exported server */
/* global config */

// setup
var debug = require('debug')('chat2');
GLOBAL.config = require('../utils/config_loader');
require('../utils/log_utils')();

var app;
if (!config.socket_only) {
  app = require('../app');
  // start the HTML server
  var server = app.listen(config.app_port, function () {
    var msg = 'Express server listening on port: ' + server.address().port;
    debug(msg);
    console.log(msg);
  });
} else {
  var events = require('events');
  app = new events.EventEmitter();
  var socket_handler = require('../server/socket_handler'); // TODO only app variable differs between branches, merge this !
  socket_handler(app);

  var msg = 'Socket server listening on port: ' + config.socket_port;
  debug(msg);
  console.log(msg);

}

// add node event handler
var system_events_receiver = require('../server/server_events_receiver');
system_events_receiver(app);
