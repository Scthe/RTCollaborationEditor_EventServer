#!/usr/bin/env node

'use strict';
/* exported server */
/* global config */

// setup
var debug = require('debug')('chat2');
GLOBAL.config = require('../utils/config_loader');
require('../utils/log_utils')();

var app;
if (!config.socketOnly) {
  app = require('../app');
  // start the HTML server
  var server = app.listen(config.appPort, function () {
    var msg = 'Express server listening on port: ' + server.address().port;
    debug(msg);
    console.log(msg);
  });
} else {
  var events = require('events');
  app = new events.EventEmitter();
  var socketHandler = require('../server/socket_handler'); // TODO only app variable differs between branches, merge this !
  socketHandler(app);

  var msg = 'Socket server listening on port: ' + config.socketPort;
  debug(msg);
  console.log(msg);

}

// add node event handler
var system_events_receiver = require('../server/server_events_receiver');
system_events_receiver(app);
