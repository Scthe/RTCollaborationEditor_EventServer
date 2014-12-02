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

var winston = require('winston'),
    util = require('util');

var myCustomLevels = {
  levels: {
    debug  : 0,
    redis  : 0,
    verbose: 1,
    info   : 2,
    warn   : 3,
    error  : 3
  },
  colors: {
    debug  : 'green',
    redis  : 'magenta',
    verbose: 'white',
    info   : 'blue',
    warn   : 'yellow',
    error  : 'red'
  }
};

winston.addColors(myCustomLevels.colors);

module.exports = function (logFilePath, logLevel) {
  if (!logLevel) {
    logLevel = 'info';
  }
//  logLevel = 'debug';

  var logger = new (winston.Logger)({
    levels    : myCustomLevels.levels,
    transports: [
      new (winston.transports.Console)({
          level    : logLevel,
          colorize : 'true',
          timestamp: function () {
            var d = new Date();
            return util.format('%d:%d:%d.%d', d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
          }
        }
      )]
  });
  if (logFilePath) {
    logger.add(winston.transports.File, {
        filename        : logFilePath,
        handleExceptions: true,
        level           : 'debug'
      }
    );
  }

  logger.printStackTrace = function (err) {
    logger.error(err.stack);
  };


  GLOBAL.log = logger;

// small ad-hoc tests
//  logger.debug('~debug');
//  logger.redis('~redis');
//  logger.verbose('~verbose');
//  logger.info('~info');
//  logger.warn('~warn');
//  logger.error('~error');
//  try {
//    var a = {};
//    a.a.a = 4;
//  } catch (e) {
//    logger.printStackTrace(e);
//  }

};
