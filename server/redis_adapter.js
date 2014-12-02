'use strict';
/*global config*/

var redis = require('redis'),
    util = require('util'),
    _ = require('underscore'),
    Q = require('q');

var documentPathPattern = 'document/%s',
    documentUsersPathPattern = 'document/%s/user_list';

// separate publisher needed since can't publish in subscribe mode
var redisPublisher = redisClientFactory('PUBLISHER');

// create redis monitor to log all operations
(function () {
  var monitor = redisClientFactory('MONITOR');
  monitor.monitor(function () {
    console.info('Entering monitoring mode.');
  });
  monitor.on('monitor', function (time, args) {
    var d = new Date(0);
    d.setUTCSeconds(time);
    console.redis(
      util.format('[REDIS] %d:%d:%d $%s', d.getHours(), d.getMinutes(), d.getSeconds(), args.join(' ')));
  });
})();


/**
 * @module server/redis_adapter
 *
 * @exports {RedisAdapter} RedisAdapter class
 */

/**
 *
 * Class created to allow for easier communication with the cache layer.
 * Following data are currently held in cache for every document:
 * - list of active users and number associated with how many editors have this client open
 * - the event stream
 *
 * @class RedisAdapter
 * @constructor
 *
 * @param {Object} clientData object containing following information: clientId and documentId
 */
function RedisAdapter(clientData) {
  this.clientId = clientData.clientId;
  this.documentPath = util.format(documentPathPattern, clientData.documentId);
  this.documentUsersPath = util.format(documentUsersPathPattern, clientData.documentId);
  this.client = redisClientFactory();
}

RedisAdapter.prototype = {
  init               : subscribe,
  unsubscribe        : unsubscribe,
  getUsersForDocument: getUsersForDocument,
  publish            : publish
};

module.exports = RedisAdapter;


/**
 *
 * Utility function used to streamline creation of redis client
 *
 * @method redisClientFactory
 * @param {string} [clientLogName] name of the client
 * @return {RedisClient} raw library object
 */
function redisClientFactory(clientLogName) {
  var client = redis.createClient(config.redisPort, config.redisHost);

  if (clientLogName === undefined) {
    clientLogName = 'from socket';
  }

  client.on('ready', function () {
    console.debug(util.format('redis client -%s- ready', clientLogName));
  });

  return client;
}

/**
 *
 * Init method of the RedisAdapter. Main functions:
 * - subscribe to document event stream
 * - set the event handlers
 * - add user to document's user list
 *
 * Whole flow is asynchronous !
 *
 * @method subscribe
 * @param {function(string,object)} messageHandler function invoked when the message is received
 * @return {!Promise.<number>|Promise} number of current editor instances that belong to this client
 */
function subscribe(messageHandler) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object

  // there is no a particular need to separate setMessageHandler
  // and addToClientList. Although it makes for a nicer sentence
  // on invocation.
  var self = this,
      redisSubscribe = Q.nbind(this.client.subscribe, this.client),
      setMessageHandler = self.client.on.bind(self.client, 'message', messageHandler),
      addToClientList = function () {
        var redisAddClient = Q.nbind(redisPublisher.hincrby, redisPublisher);
        return redisAddClient(self.documentUsersPath, self.clientId, 1);
      };

  return redisSubscribe(self.documentPath).then(setMessageHandler).then(addToClientList);
}

/**
 *
 * Method to close this event stream subscription. Main functions:
 * - close subscription
 * - remove client from document's user list
 *
 * @method unsubscribe
 * @return {!Promise.<number>|Promise} number of current editor instances that belong to this client
 */
function unsubscribe() {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var self = this;
  self.client.quit();

  var redisRemClient = Q.nbind(redisPublisher.hincrby, redisPublisher);
  return redisRemClient(self.documentUsersPath, self.clientId, -1);
}

/**
 *
 * Get list of ids of all clients that are currently editing this document
 *
 * @method getUsersForDocument
 * @return {*|!Promise.<Array.<number>>|Promise} list of ids
 */
function getUsersForDocument() {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var f = Q.denodeify(redisPublisher.hgetall.bind(redisPublisher, this.documentUsersPath)),
      filterList = function (val) {
//        console.log(val);
        return _.chain(val)
          .keys()
          .filter(function (e) {
            return val[e] > 0;
          })
          .value();
      };
  return f().then(filterList);
}

/**
 *
 * Publish the message to all clients editing current document
 *
 * @method publish
 * @param {object} msg message to publish
 * @return {Promise} Promise to allow chaining of the flow
 */
function publish(msg) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var redisPublish = Q.nbind(redisPublisher.publish, redisPublisher);
  return redisPublish(this.documentPath, JSON.stringify(msg));
}
