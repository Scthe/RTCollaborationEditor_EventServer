/**
 * Script used to register logging methods.
 * <p/>
 * Allows to use following loggers:
 * <ul>
 *   <li>error</li>
 *   <li>info</li>
 *   <li>debug</li>
 *   <li>warn</li>
 *   <li>redis</li>
 * </ul>
 *
 * Also adds utility method <b>printStackTrace</b>
 *
 *
 * @module utils/log_utils
 */
'use strict';

// TODO configure morgan ?

var chalk = require('chalk');

module.exports = function () {

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
};
