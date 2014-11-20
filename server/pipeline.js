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

  var self = this,
      getUsersForDocument = this.redisAdapter.getUsersForDocument.bind(this.redisAdapter);
//      publishUserJoin = this.redisAdapter.publishUserJoin.bind(this.redisAdapter, clientData);

  self.redisAdapter.init()
    .then(getUsersForDocument)
    .then(function (count) {
      var m = {
        type   : 'join',
        payload: { client: clientData.clientId, user_count: count }
      };
      return  self.redisAdapter.publish(m);
    })
    .catch(console.printStackTrace)
    .done();

  // node-level message
  app.emit('new user', clientData); // TODO move to promise chain, include current users list
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
  var m = {type: 'msg', payload: data};
  this.redisAdapter.publish(m);

  // TODO might as well use node event system to propagate the message to db store
}

