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

function publish_user_status(msg) {
  var m = {type: "user_mgmt", payload: msg};
  redis_publisher.publish(this.redis_path, JSON.stringify(m));
}

var RedisAdapter = function (chat_room_id, msg_callback, user_status_callback) {
  // TODO can add f.e. add user count operations here

  var redis_path = 'chat/room/' + chat_room_id;
  console.log('socket subscription for: ' + redis_path);

  var client = defaultRedisClient();
  client.subscribe(redis_path); // switches to subscriber mode !

  client.on('message', function (ch, msg) {
    var m = JSON.parse(msg);
//    console.log(m);
    if (m.type === 'msg') {
      msg_callback(m.payload);
    } else {
      user_status_callback(m.payload);
    }
  });

  return {
    client             : client,
    redis_path         : redis_path,
    publish_message    : publish_message,
    publish_user_status: publish_user_status
  };
};

module.exports = RedisAdapter;