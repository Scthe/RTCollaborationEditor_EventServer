/**
 * Start point of the application
 * <p/>
 * Responsibilities:
 * <ul>
 *   <li>Set the configuration</li>
 *   <li>Start the logging system</li>
 *   <li>Start server based on provided configuration</li>
 * </ul>
 *
 * @module bin/www
 */

'use strict';
/* exported server */
/* global config, log */

var debug = require('debug')('sublimeDocs-SocketServer');

// read the configuration
GLOBAL.config = require('../utils/config_loader');

// start logs
require('../utils/log_utils')(config.logFilePath, config.logLevel);

var app;
if (!config.socketOnly) {
  app = require('../app');
  // start the HTML server
  var server = app.listen(config.appPort, function () {
    var msg = 'Express server listening on port: ' + server.address().port;
    debug(msg);
    log.info(msg);
  });
} else {
  // TODO only the 'app' variable differs between branches, merge this !
  var events = require('events');
  app = new events.EventEmitter();
  var socketHandler = require('../server/socket_handler');
  socketHandler(app);

  var msg = 'Socket server listening on port: ' + config.socketPort;
  debug(msg);
  log.info(msg);
}

// add node event handler
var systemEventsReceiver = require('../server/server_events_receiver');
systemEventsReceiver(app);
