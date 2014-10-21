#!/usr/bin/env node

'use strict';
/* exported server */

// setup
var debug = require('debug')('chat2');
GLOBAL.config = require('../utils/config_loader');
require('../utils/log_utils')();

// app
var app = require('../app');
app.set('port', process.env.PORT || 3000);

// start the HTML server
var server = app.listen(app.get('port'), function () {
  debug('Express server listening on port ' + server.address().port);
  console.log('Express server listening on port ' + server.address().port);
});

