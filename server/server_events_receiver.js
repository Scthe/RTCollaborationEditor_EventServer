'use strict';

/**
 * @module server/server_events_receiver
 */

var util = require('util');

module.exports = function (app) {
  app.on('new user', onNewUser);
  app.on('remove user', onRemoveUser);
};

/**
 * Function used to inform server about new client
 * <p/>
 * Invoked through internal server message bus on channel 'new user'
 *
 * @param {ClientData} data data of the new client
 * @returns *
 */
function onNewUser(data) {
  log.info(util.format('new user: %s', data.clientId));
}

/**
 * Function used to inform server about client's departure
 * <p/>
 * Invoked through internal server message bus on channel 'remove user'
 *
 * @param {ClientData} data data of the new client
 * @returns *
 */
function onRemoveUser(data) {
  log.info(util.format('remove user: %s', data.clientId));
}