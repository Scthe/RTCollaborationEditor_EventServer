var redis = require('redis'),
    _ = require('underscore'),
    util = require('util');

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

  var client_id = that.chat_room.client_id;
  redis_publisher.srem(that.redis_user_count_path, client_id, function () {
    __get_user_count(that.redis_user_count_path, function (err, count) {
      var m = {
        type   : "user_mgmt",
        payload: {
          text      : 'user \'' + client_id + '\' disconnected',
          user_count: count
        }
      };
      redis_publisher.publish(that.redis_path, JSON.stringify(m));
    });
  });
}

function __get_user_count(redis_path, callback) {
  return redis_publisher.scard(redis_path, callback);
}

var RedisAdapter = function (chat_room, msg_callback, user_status_callback) {
  // TODO can add f.e. add user count operations here

  var chat_room_id = chat_room.id;
  var client_id = chat_room.client_id;
  var redis_path = 'chat/room/' + chat_room_id;
  var redis_user_count_path = 'chat/room/' + chat_room_id + '/user_list';

  // configure redis client
  var client = defaultRedisClient();
  client.subscribe(redis_path, function () {// switches to subscriber mode !
    client.on('message', function (ch, msg) {
      var m = JSON.parse(msg);
      if (m.type === 'msg') {
        msg_callback(m.payload);
      } else {
        user_status_callback(m.payload);
      }
    });

    redis_publisher.sadd(redis_user_count_path, client_id, function () {
      __get_user_count(redis_user_count_path, function (err, count) {
        var m = {
          type   : "user_mgmt",
          payload: {
            text      : 'user \'' + client_id + '\' connected',
            user_count: count
          }
        };
        redis_publisher.publish(redis_path, JSON.stringify(m));
      });
    });
  });


  return {
    chat_room            : chat_room,
    client               : client,
    redis_path           : redis_path,
    redis_user_count_path: redis_user_count_path,
    unsubscribe          : unsubscribe,
    publish_message      : publish_message
  };
};

module.exports = RedisAdapter;