'use strict';
/*global config*/

var redis = require('redis'),
    util = require('util'),
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


function RedisAdapter(clientData) {
  this.clientData = clientData;  // TODO remove from here ?
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

//
// implementation

function redisClientFactory() {
  var client = redis.createClient(config.redis_port, config.redis_host);

  var clientLogName = arguments.length > 0 ? arguments[0] : 'from socket';
  client.on('ready', function () {
    console.debug(util.format('redis client -%s- ready', clientLogName));
  });

  return client;
}

function subscribe(clientId, messageHandler) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object

  // there is no a particular need to separate setMessageHandler
  // and addToClientList. Although it makes for a nicer sentence
  // on invocation.
  var self = this,
      redisSubscribe = Q.nbind(this.client.subscribe, this.client),
      setMessageHandler = self.client.on.bind(self.client, 'message', messageHandler),
      addToClientList = function () {
        var redisAddClient = Q.nbind(redisPublisher.sadd, redisPublisher);
        return redisAddClient(self.documentUsersPath, clientId);
      };

  return redisSubscribe(this.documentPath).then(setMessageHandler).then(addToClientList);
}

function unsubscribe() {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var self = this;
  self.client.quit();

  var redisRemoveClient = Q.nbind(redisPublisher.srem, redisPublisher);

  return redisRemoveClient(self.documentUsersPath, self.clientData.clientId);
}

function getUsersForDocument() {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  return Q.denodeify(redisPublisher.scard.bind(redisPublisher, this.documentUsersPath))();
}

function publish(msg) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var redisPublish = Q.nbind(redisPublisher.publish, redisPublisher);
  return redisPublish(this.documentPath, JSON.stringify(msg));
}
