/**
 * Script used to load config from config.js located in root directory.
 * <p/>
 * Can be used as a start file to check the loaded configurations profiles
 *
 * @module utils/config_loader
 */
'use strict';

var winston = require('winston'),
    cfg = require('../config'),
    argv = require('minimist')(process.argv.slice(2));

if (argv._.length > 0 && 'profiles' in cfg) {
  var profileName = argv._[0];
  if (profileName in cfg.profiles) {
    var profileSettings = cfg.profiles[profileName];
    for (var k in profileSettings) {
      cfg[k] = profileSettings[k];
    }
    winston.add(winston.transports.File, { filename: cfg.logFilePath });
    winston.info('Using profile: \'%s\'', profileName);
  } else {
    winston.add(winston.transports.File, { filename: cfg.logFilePath });
    winston.error('Could not find profile: \'%s\'', profileName);
  }
} else {
  winston.add(winston.transports.File, { filename: cfg.logFilePath });
  winston.info('Using default profile');
}

// do not pollute the config object
delete cfg.profiles;

if (require.main === module) {
  console.log(cfg);
}

module.exports = cfg;
