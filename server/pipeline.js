'use strict';

var RedisAdapter = require('./redis_adapter');

/**
 * Ok, so You've like got a message, right ? The from-client type of message.
 * Pipe it down through several steps:
 * - validate the message
 * - enrich it ( assign id and do some other operations on it)
 * - publish to redis
 *
 * There is quite a lot of logic in here !
 */
function Pipeline(app, clientData, emitterCallbacks) {
  // TODO check if client has r/w rights, return undefined if not

  this.clientData = clientData;
  this.redisAdapter = new RedisAdapter(clientData, emitterCallbacks);

  // node-level message
  app.emit('new user', clientData);
}

Pipeline.prototype = {
  onDisconnected    : onDisconnected,
  onOperationMessage: onOperationMessage
};

module.exports = Pipeline;


function onDisconnected(app) {
  /* jshint -W040 */ // binded to Pipeline prototype object
  this.redisAdapter.unsubscribe();

  // node-level message
  app.emit('remove user', this.clientData);
}

function onOperationMessage(data) {
  /* jshint -W040 */ // binded to Pipeline prototype object

  // TODO validate
  // TODO enrich

  // publish
  data.username = this.clientData.clientId;
  this.redisAdapter.publishOperation(data);

  // TODO might as well use node event system to propagate the message to db store
}

