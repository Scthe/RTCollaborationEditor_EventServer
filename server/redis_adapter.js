'use strict';
/*global config*/

var redis = require('redis'),
    _ = require('underscore'),
    util = require('util'),
    Q = require('q');

// separate publisher needed since can't publish in subscribe mode
var redis_publisher = defaultRedisClient('PUBLISHER');

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


function RedisAdapter(client_data, operation_callback, selection_callback, join_callback, disconnect_callback) {
  var that = this;
  this.client_data = client_data;
  this.redis_path = 'chat/room/' + client_data.chat_room;
  this.redis_user_count_path = 'chat/room/' + client_data.chat_room + '/user_list';
  this._messageHandler = _.partial(this._messageHandlerProto, operation_callback, selection_callback, join_callback, disconnect_callback);
  this.client = defaultRedisClient();

  // subscribe client to chat room events
  // THEN set the message callback AND add client to the chat room list ( sadd := set add)
  // THEN get client count after changes
  // THEN publish 'client connected' event to queue
  var redis_subscribe = Q.nbind(this.client.subscribe, this.client);

  redis_subscribe(this.redis_path)
    .then(function () {
      that.client.on('message', that._messageHandler);

      var redisAddClient = Q.nbind(redis_publisher.sadd, redis_publisher);
      return redisAddClient(that.redis_user_count_path, client_data.client_id);
    })
    .then(that._getUserCount.bind(that))
    .then(publishUserJoin.bind(that, that.client_data))
    .catch(console.printStackTrace)
    .done();
}

RedisAdapter.prototype = {
  unsubscribe         : unsubscribe,
  publish_operation   : publish_message,
  publish_selection   : publish_selection,
  _getUserCount       : function () {
    return Q.denodeify(redis_publisher.scard.bind(redis_publisher, this.redis_user_count_path))();
  },
  _messageHandlerProto: function (operation_callback, selection_callback, join_callback, disconnect_callback, ch, msg) {
    /* jshint unused:false */ // ch is not used
    var m = JSON.parse(msg);
    var data = m.payload;

    // TODO remove msg.type if, make it const time
    if (m.type === 'msg') {
      operation_callback(data);
    } else if (m.type === 'sel') {
      selection_callback(data);
    } else if (m.type === 'join') {
      join_callback(data);
    } else { // disconnect
      disconnect_callback(data);
    }
  }
};

module.exports = RedisAdapter;


function defaultRedisClient() {
  var client = redis.createClient(config.redis_port, config.redis_host);

  var client_log_name = arguments.length > 0 ? arguments[0] : 'from socket';
  client.on('ready', function () {
    console.debug(util.format('redis client -%s- ready', client_log_name));
  });

  return client;
}

function unsubscribe() {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var that = this;
  that.client.quit();

  var client_id = that.client_data.client_id;

  // remove client from list of client for this chat room ( srem := set remove)
  // THEN get client count after changes
  // THEN publish 'client disconnected' event to queue
  var redisRemoveClient = Q.nbind(redis_publisher.srem, redis_publisher);

  redisRemoveClient(that.redis_user_count_path, client_id)
    .then(that._getUserCount.bind(that))
    .then(publishUserLeft.bind(that, that.client_data))
    .catch(console.printStackTrace)
    .done();
}

function publish_message(msg) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var m = {type: 'msg', payload: msg};
  redis_publisher.publish(this.redis_path, JSON.stringify(m));
}

function publish_selection(msg) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var m = {type: 'sel', payload: msg};
  redis_publisher.publish(this.redis_path, JSON.stringify(m));
}

function publishUserJoin(clientData, count) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var m = {
    type   : 'join',
    payload: { client: clientData.client_id, user_count: count }
  };
  var redisPublish = Q.nbind(redis_publisher.publish, redis_publisher);
  return redisPublish(this.redis_path, JSON.stringify(m));
}

function publishUserLeft(clientData, count) {
  /* jshint -W040 */ // binded to RedisAdapter prototype object
  var m = {
    type   : 'left',
    payload: { client: clientData.client_id, user_count: count }
  };
  var redisPublish = Q.nbind(redis_publisher.publish, redis_publisher);
  return redisPublish(this.redis_path, JSON.stringify(m));
}

