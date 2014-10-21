#!/usr/bin/env node

'use strict';

var cfg = require('../config');
var argv = require('minimist')(process.argv.slice(2));
//console.dir(argv);

if (argv._.length > 0 && 'profiles' in cfg) {
  var profileName = argv._[0];
  if (profileName in cfg.profiles) {
    var profileSettings = cfg.profiles[profileName];
    for (var k in profileSettings) {
      cfg[k] = profileSettings[k];
    }
  }
}

// do not pollute the config object
delete cfg.profiles;

if (require.main === module) {
  console.log(cfg);
}

module.export = cfg;