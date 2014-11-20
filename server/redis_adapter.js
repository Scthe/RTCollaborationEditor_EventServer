'use strict';
/*global config*/

var redis = require('redis'),
    _ = require('underscore'),
    util = require('util'),
    Q = require('q');

var documentPathPattern = 'document/%s',
    documentUsersPathPattern = 'document/%s/user_list';

// separate publisher needed since can't publish in subscribe mode
var redisPublisher = defaultRedisClient('PUBLISHER');

// create redis monitor to log all operations
(function () {
  var monitor = defaultRedisClient('MONITOR');
  monitor.monitor(function () {
    console.info('Entering monitoring mode.');
  });
  monitor.on('monitor', function (time, args) {
    var d = new Date(0);
    d.setUTCSeconds(time);
    console.redis(
      util.format('[REDIS] %d:%d:%d $%s', d.getHours(), d.getMinutes(), d.getSeconds(), args.join(' ')));
  });
  return monitor;
})();


function RedisAdapter(clientData, msgCallbacks) {
  this.clientData = clientData;  // TODO remove from here ?
  this.documentPath = util.format(documentPathPattern, clientData.documentId);
  this.documentUsersPath = util.format(documentUsersPathPattern, clientData.documentId);
  this._messageHandler = _.partial(_messageHandlerProto, msgCallbacks); // TODO remove from here
  this.client = defaultRedisClient();
}

RedisAdapter.prototype = {
  init               : subscribe,
  unsubscribe        : unsubscribe,
  getUsersForDocument: function () {
    return Q.denodeify(redisPublisher.scard.bind(redisPublisher, this.documentUsersPath))();
  },
  publish            : publish
};

module.exports = RedisAdapter;


function subscribe(clientId) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var that = this,
      redisSubscribe = Q.nbind(this.client.subscribe, this.client),
      setMessageHandler = function () {
        that.client.on('message', that._messageHandler);
      },
      addToClientList = function () {
        var redisAddClient = Q.nbind(redisPublisher.sadd, redisPublisher);
        return redisAddClient(that.documentUsersPath, clientId);
      };
  return redisSubscribe(this.documentPath).then(setMessageHandler).then(addToClientList);
}

function _messageHandlerProto(msgCallbacks, ch, msg) { // TODO move to pipeline
  /* jshint unused:false */ // ch is not used
  var m = JSON.parse(msg);
  var data = m.payload;

  // TODO remove msg.type if, make it const time
  if (m.type === 'msg') {
    msgCallbacks.operation(data);
  } else if (m.type === 'join') {
    msgCallbacks.join(data);
  } else { // disconnect
    msgCallbacks.disconnect(data);
  }
}

function defaultRedisClient() {
  var client = redis.createClient(config.redis_port, config.redis_host);

  var clientLogName = arguments.length > 0 ? arguments[0] : 'from socket';
  client.on('ready', function () {
    console.debug(util.format('redis client -%s- ready', clientLogName));
  });

  return client;
}

function unsubscribe() {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var that = this;
  that.client.quit();

  // remove client from list of client for this chat room ( srem := set remove)
  // THEN get client count after changes
  // THEN publish 'client disconnected' event to queue
  var redisRemoveClient = Q.nbind(redisPublisher.srem, redisPublisher);

  redisRemoveClient(that.documentUsersPath, that.clientData.clientId)
    .then(that._getUserCount.bind(that))
    .then(publishUserLeft.bind(that, that.clientData))
    .catch(console.printStackTrace)
    .done();
}

function publish(msg) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var redisPublish = Q.nbind(redisPublisher.publish, redisPublisher);
  return redisPublish(this.documentPath, JSON.stringify(msg));
}

function publishUserLeft(clientData, count) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var m = {
    type   : 'left',
    payload: { client: clientData.clientId, user_count: count }
  };
  var redisPublish = Q.nbind(redisPublisher.publish, redisPublisher);
  return redisPublish(this.documentPath, JSON.stringify(m));
}

