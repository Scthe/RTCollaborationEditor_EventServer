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
function Pipeline(app, client_data, emitterCallbacks) {
  // TODO check if client has r/w rights, return undefined if not

  this.client_data = client_data;
  this.redis_adapter = new RedisAdapter(client_data, emitterCallbacks);

  // node-level message
  app.emit('new user', client_data);
}

Pipeline.prototype = {
  onDisconnected    : onDisconnected,
  onOperationMessage: onOperationMessage,
  onSelectionMessage: onSelectionMessage
};

module.exports = Pipeline;


function onDisconnected(app) {
  /* jshint -W040 */ // binded to Pipeline prototype object
  this.redis_adapter.unsubscribe();

  // node-level message
  app.emit('remove user', this.client_data);
}

function onOperationMessage(data) {
  /* jshint -W040 */ // binded to Pipeline prototype object

  // TODO validate
  // TODO enrich

  // publish
  data.username = this.client_data.client_id;
  this.redis_adapter.publish_operation(data);

  // TODO might as well use node event system to propagate the message to db store
}
function onSelectionMessage(data) {
  /* jshint -W040 */ // binded to Pipeline prototype object
  data.username = this.client_data.client_id;
  this.redis_adapter.publish_selection(data);
}

