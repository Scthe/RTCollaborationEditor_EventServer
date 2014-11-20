'use strict';

var RedisAdapter = require('./redis_adapter'),
    Q = require('q');

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


  // subscribe client to chat room events
  // THEN set the message callback AND add client to the chat room list ( sadd := set add)
  // THEN get client count after changes
  // THEN publish 'client connected' event to queue


  this.redisAdapter.init()
    .then(this.redisAdapter.getUsersForDocument.bind(this.redisAdapter))
    .then(this.redisAdapter.publishUserJoin.bind(this.redisAdapter, clientData))
    .catch(console.printStackTrace)
    .done();

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

