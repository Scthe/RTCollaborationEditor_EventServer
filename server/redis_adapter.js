'use strict';

var redis = require('redis'),
    _ = require('underscore'),
    util = require('util'),
    Q = require('Q');

var REDIS_PORT = 6379; // TODO move to config file
var REDIS_HOST = 'localhost';

// separate publisher needed since can't publish in subscribe mode
var redis_publisher = defaultRedisClient('PUBLISHER');

// create redis monitor to log all operations
(function () {
  var a = defaultRedisClient('MONITOR');
  a.monitor(function () {
    console.info('Entering monitoring mode.');
  });
  a.on('monitor', function (time, args) {
    var d = new Date(0);
    d.setUTCSeconds(time);
    console.redis(
      util.format('[REDIS] %d:%d:%d $%s', d.getHours(), d.getMinutes(), d.getSeconds(), args.join(" ")));
  });
  return a;
})();


function RedisAdapter(client_data, msg_callback, user_status_callback) {
  var that = this;
  this.client_data = client_data;
  this.redis_path = 'chat/room/' + client_data.chat_room;
  this.redis_user_count_path = 'chat/room/' + client_data.chat_room + '/user_list';
  this._messageHandler = _.partial(this._messageHandlerProto, msg_callback, user_status_callback);
  this.client = defaultRedisClient();

  // subscribe client to chat room events
  // THEN set the message callback AND add client to the chat room list ( sadd := set add)
  // THEN get client count after changes
  // THEN publish 'client connected' event to queue
  var msgText = 'user \'' + client_data.client_id + '\' connected';
  var redis_subscribe = Q.nbind(this.client.subscribe, this.client);

  redis_subscribe(this.redis_path)
    .then(function () {
      that.client.on('message', that._messageHandler);

      var redisAddClient = Q.nbind(redis_publisher.sadd, redis_publisher);
      return redisAddClient(that.redis_user_count_path, client_data.client_id);
    })
    .then(that._getUserCount.bind(that))
    .then(_.partial(publishUserMgmtMessage, msgText).bind(that))
    .catch(console.printStackTrace)
    .done();
}

RedisAdapter.prototype = {
  unsubscribe         : unsubscribe,
  publish_message     : publish_message,
  _getUserCount       : function () {
    return Q.denodeify(function (redis_path, callback) { // TODO use partial / simplify
      return redis_publisher.scard(redis_path, callback);
    })(this.redis_user_count_path);
  },
  _messageHandlerProto: function (msg_callback, user_status_callback, ch, msg) {
    var m = JSON.parse(msg);
    if (m.type === 'msg') { // TODO remove msg.type if, make it const time
      msg_callback(m.payload);
    } else {
      user_status_callback(m.payload);
    }
  }
};

module.exports = RedisAdapter;

function defaultRedisClient() {
  // redisClient.on('end', function() { console.log('redis( ' + name + ')-end'); });
  // redisClient.on('drain', function() { console.log('redis( ' + name + ')-drain : redis is bufferring !'); });

  var client = redis.createClient(REDIS_PORT, REDIS_HOST);

  var client_log_name = arguments.length > 0 ? arguments[0] : "from socket";
  client.on('ready', function () {
    console.debug(util.format('redis client -%s- ready', client_log_name));
  });

  return client;
}

function unsubscribe() {
  var that = this;
  that.client.quit();

  var client_id = that.client_data.client_id;
  var msgText = 'user \'' + client_id + '\' disconnected';

  // remove client from list of client for this chat room ( srem := set remove)
  // THEN get client count after changes
  // THEN publish 'client disconnected' event to queue
  var redisRemoveClient = Q.nbind(redis_publisher.srem, redis_publisher);

  redisRemoveClient(that.redis_user_count_path, client_id)
    .then(that._getUserCount.bind(that))
    .then(_.partial(publishUserMgmtMessage, msgText).bind(that))
    .catch(console.printStackTrace)
    .done();
}

function publish_message(msg) {
  var m = {type: "msg", payload: msg};
  redis_publisher.publish(this.redis_path, JSON.stringify(m));
}

function publishUserMgmtMessage(texxt, count) {
  var m = {
    type   : "user_mgmt",
    payload: { text: texxt, user_count: count }
  };
  var redisPublish = Q.nbind(redis_publisher.publish, redis_publisher);
  return redisPublish(this.redis_path, JSON.stringify(m));
}
