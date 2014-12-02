/** @module server/pipeline */

'use strict';

var RedisAdapter = require('./redis_adapter');

/**
 * ClientData
 * @typedef {Object} ClientData
 * @property {String} documentId
 * @property {Number} clientId
 */
/**
 * ToClientCallbacks
 * @typedef {Object} ToClientCallbacks
 * @property {function} operation
 * @property {function} join
 * @property {function} disconnect
 */

/**
 * Controller class. After receiving the message we want to pipe in through several steps ( hence the class name).
 * For example when each new user joins to the document we have to communicate
 * it to other document users and subscribe to the event queue.
 *
 * @param {EventEmitter} app application object used for server-only event bus
 * @param {ClientData} clientData object containing following information: clientId and documentId
 * @param {ToClientCallbacks} emitterCallbacks set of callbacks containing means to send various types of information to the client's editor: <i>operation</i>, <i>join</i>, <i>disconnect</i>
 * @constructor
 */
function Pipeline(app, clientData, emitterCallbacks) {
  // TODO check if client has r/w rights, return undefined if not
  /*jshint camelcase: false */

  /** reference to current application*/
  this.app = app;
  /** object containing following information: clientId and documentId*/
  this.clientData = clientData;
  /** redis adapter instance used to communicate with other clients*/
  this.redisAdapter = new RedisAdapter(clientData, emitterCallbacks);
  /** set of callbacks containing means to send various types of information to the client's editor: <i>operation</i>, <i>join</i>, <i>disconnect</i>*/
  this.emitterCallbacks = emitterCallbacks;

  var self = this,
      getUsersForDocument = this.redisAdapter.getUsersForDocument.bind(this.redisAdapter),
      clientEditorCount = -1; // how many editors does this client have open to this doc

  // subscribe client to document events
  // THEN set the message callback AND add client to the document's user list
  // THEN get client count after changes
  // THEN publish 'client connected' event to queue
  self.redisAdapter.init(this.onPropagatedMessage.bind(self))
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

/**
 * Actions to take when the user lefts editor. For example we have to unsubscribe
 * it from the event stream and publish the 'user left' message.
 * It is worth noting that the sequence of actions is different when user closes
 * his last editor tab and when there are still windows open to this very document.
 *
 * @returns {*}
 */
Pipeline.prototype.onDisconnected = function () {
  /* jshint -W040 */ // binded to Pipeline prototype object
  /*jshint camelcase: false */
  var self = this,
      getUsersForDocument = this.redisAdapter.getUsersForDocument.bind(this.redisAdapter),
      removeUserNodeMessage = this.app.emit.bind(this.app, 'remove user', self.clientData);

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
};

/**
 *  Invoked every time the client does something interesting
 *  f.e. changes it's selection or inserts a letter. Some basics steps along the message pipeline:
 * - validate if the message is correct
 * - enrich it with id of the client that is responsible for the change
 * - publish it to the event stream
 *
 * @param data message to propagate to other clients editing this document
 * @returns {*}
 */
Pipeline.prototype.onOperationMessage = function (data) {
  /* jshint -W040 */ // binded to Pipeline prototype object

  // TODO validate
  // TODO enrich

  // publish
  data.username = this.clientData.clientId;
  var m = {type: 'msg', payload: data};
  this.redisAdapter.publish(m);

  // TODO might as well use node event system to propagate the message to db store
};

/**
 * Invoked when we receive notification about client action f.e. operation, joined/left status
 *
 * @param {string}[ch] not used
 * @param {object} msg notification received, should have a field 'type'
 * @returns {*}
 */
Pipeline.prototype.onPropagatedMessage = function (ch, msg) {
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
};

module.exports = Pipeline;