var redis = require('redis'),
    _ = require('underscore'),
    util = require('util'),
    Q = require('Q');

var REDIS_PORT = 6379; // TODO move to config file
var REDIS_HOST = 'localhost';

// separate publisher needed since can't publish in subscribe mode
var redis_publisher = defaultRedisClient('PUBLISHER');

// create redis monitor to log all operations
var redis_monitor = defaultRedisClient('MONITOR');
redis_monitor.monitor(function () {
  console.log('Entering monitoring mode.');
});
redis_monitor.on('monitor', function (time, args) {
  console.log('#' + time + ': ' + args);
});

function defaultRedisClient() {
  var client = redis.createClient(REDIS_PORT, REDIS_HOST);

  var client_log_name = arguments.length > 0 ? arguments[0] : "socket default";
  client.on('ready', function () {
    console.log(util.format('redis client -%s- ready', client_log_name));
  });

  // redisClient.on('end', function() { console.log('redis( ' + name + ')-end'); });
  // redisClient.on('drain', function() { console.log('redis( ' + name + ')-drain : redis is bufferring !'); });
  return client;
}

function publish_message(msg) {
  var m = {type: "msg", payload: msg};
  redis_publisher.publish(this.redis_path, JSON.stringify(m));
}

function unsubscribe() {
  var that = this;
  that.client.quit();

  var client_id = that.client_data.client_id;

  // remove client from list of client for this chat room ( srem := set remove)
  // THEN get client count after changes
  // THEN publish 'client disconnected' event to queue
  var redis_remove_client = Q.nbind(redis_publisher.srem, redis_publisher);
  redis_remove_client(that.redis_user_count_path, client_id)
    .then(function () {
      return Q.denodeify(__get_user_count)(that.redis_user_count_path);
    }).then(function (count) {
      var m = {
        type   : "user_mgmt",
        payload: { text: 'user \'' + client_id + '\' disconnected', user_count: count }
      };
      var redis_publish = Q.nbind(redis_publisher.publish, redis_publisher);
      return redis_publish(that.redis_path, JSON.stringify(m));
    }).catch(function (err) {
      console.error(err);
    }).done();
}

function __get_user_count(redis_path, callback) {
  // scard := set cardinality
  return redis_publisher.scard(redis_path, callback);
}

var RedisAdapter = function (client_data, msg_callback, user_status_callback) {
  var chat_room_id = client_data.chat_room;
  var client_id = client_data.client_id;
  var redis_path = 'chat/room/' + chat_room_id;
  var redis_user_count_path = 'chat/room/' + chat_room_id + '/user_list';

  // subscribe client to chat room events
  // THEN set the message callback AND add client to the chat room list ( sadd := set add)
  // THEN get client count after changes
  // THEN publish 'client connected' event to queue
  var client = defaultRedisClient();
  var redis_subscribe = Q.nbind(client.subscribe, client);
  redis_subscribe(redis_path)
    .then(function () {
      client.on('message', function (ch, msg) {
        var m = JSON.parse(msg);
        if (m.type === 'msg') {
          msg_callback(m.payload);
        } else {
          user_status_callback(m.payload);
        }
      });

      var redis_add_client = Q.nbind(redis_publisher.sadd, redis_publisher);
      return redis_add_client(redis_user_count_path, client_id);
    }).then(function () {
      return Q.denodeify(__get_user_count)(redis_user_count_path);
    }).then(function (count) {
      var m = {
        type   : "user_mgmt",
        payload: { text: 'user \'' + client_id + '\' connected', user_count: count }
      };
      var redis_publish = Q.nbind(redis_publisher.publish, redis_publisher);
      return redis_publish(redis_path, JSON.stringify(m));
    }).catch(function (err) {
      console.error(err);
    }).done();

  return {
    client_data            : client_data,
    client               : client,
    redis_path           : redis_path,
    redis_user_count_path: redis_user_count_path,
    unsubscribe          : unsubscribe,
    publish_message      : publish_message
  };
};

module.exports = RedisAdapter;