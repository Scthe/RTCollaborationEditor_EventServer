#!/usr/bin/env node

'use strict';
/* exported server */

var debug = require('debug')('chat2');
var app = require('../app');

GLOBAL.config = require('../utils/config_loader');

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
  debug('Express server listening on port ' + server.address().port);
  console.log('Express server listening on port ' + server.address().port);
});


// config
var chalk = require('chalk');

var ce = console.error;
var ci = console.info;
var cl = console.log;
var cw = console.warn;

console.error = function (e) {
  ce(chalk.bold.red(e));
};
console.info = function (e) {
  ci(chalk.blue(e));
};
console.debug = function (e) {
  cl(chalk.green(e));
};
console.warn = function (e) {
  cw(chalk.yellow(e));
};
console.redis = function (e) {
  cl(chalk.bold.magenta(e));
};
console.printStackTrace = function (err) {
  console.error(err.stack);
};