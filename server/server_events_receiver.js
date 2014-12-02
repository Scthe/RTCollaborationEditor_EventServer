'use strict';

/**
 *
 * @type {exports}
 */

var util = require('util');

module.exports = function (app) {
  app.on('new user', onNewUser);
  app.on('remove user', onRemoveUser);
};

function onNewUser(data) {
  console.info(util.format('[system event] new user: %s', data.clientId));
}

function onRemoveUser(data) {
  console.info(util.format('[system event] remove user: %s', data.clientId));
}