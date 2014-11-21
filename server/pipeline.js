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
  this.emitterCallbacks = emitterCallbacks;

  var self = this,
      getUsersForDocument = this.redisAdapter.getUsersForDocument.bind(this.redisAdapter),
      clientEditorCount = -1; // how many editors does this client have open to this doc

  // subscribe client to document events
  // THEN set the message callback AND add client to the document's user list
  // THEN get client count after changes
  // THEN publish 'client connected' event to queue
  self.redisAdapter.init(onPropagatedMessage.bind(self))
    .then(function (_clientEditorCount) {
      clientEditorCount = _clientEditorCount;
    })
    .then(getUsersForDocument)
    .then(function (userList) {
      var m = {
        type   : 'join',
        payload: { client: clientData.clientId, user_count: userList }
      };
      return  self.redisAdapter.publish(m);
    })
    .then(function () {
      if (clientEditorCount === 1) {
        app.emit('new user', self.clientData);
      }
    })
    .catch(console.printStackTrace)
    .done();
}

Pipeline.prototype = {
  onDisconnected     : onDisconnected,
  onOperationMessage : onOperationMessage,
  onPropagatedMessage: onPropagatedMessage
};

module.exports = Pipeline;


function onDisconnected(app) {
  /* jshint -W040 */ // binded to Pipeline prototype object
  var self = this,
      getUsersForDocument = this.redisAdapter.getUsersForDocument.bind(this.redisAdapter),
      removeUserNodeMessage = app.emit.bind(app, 'remove user', self.clientData);

  // remove client from document's client list
  // THEN get client count after changes
  // THEN publish 'client disconnected' event to queue
  self.redisAdapter.unsubscribe()
    .then(function (clientEditorCount) {
      return clientEditorCount > 0 ? '' // there is at least one tab more with this doc open
        : getUsersForDocument() // user closed last tab containing this doc
        .then(function (userList) {
          var m = {
            type   : 'left',
            payload: { client: self.clientData.clientId, user_count: userList }
          };
          return  self.redisAdapter.publish(m);
        })
        .then(removeUserNodeMessage);
    })
    .catch(console.printStackTrace)
    .done();
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

function onPropagatedMessage(ch, msg) {
  /* jshint unused:false */ // ch is not used
  /* jshint -W040 */ // binded to Pipeline prototype object
  var m = JSON.parse(msg);
  var data = m.payload;

  // TODO remove msg.type if, make it const time
  if (m.type === 'msg') {
    this.emitterCallbacks.operation(data);
  } else if (m.type === 'join') {
    this.emitterCallbacks.join(data);
  } else { // disconnect
    this.emitterCallbacks.disconnect(data);
  }
}

