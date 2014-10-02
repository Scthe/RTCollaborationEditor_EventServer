var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    util = require('util'),
    RedisAdapter = require('./redis_adapter');


//region Socket lifecycle
function socket_connected(app, socket) {
  // TODO check if client has r/w rights
  // TODO return client id

  var chat_room_id = 12345;
  var redis_adapter = RedisAdapter(chat_room_id, _.partial(on_message, socket), _.partial(on_user_status, socket));
  redis_adapter.publish_user_status({ text: 'user connected'});

  // get some chat room data
  var chat_room = {
    id           : chat_room_id,
    redis_adapter: redis_adapter
  };

  // node-level message
  app.emit('new user', chat_room);

  return chat_room;
}

function socket_disconnected(app, chat_room, socket) {
  // TODO redis unsub.
  chat_room.redis_adapter.publish_user_status({ text: 'user disconnected'});

  // node-level message
  app.emit('remove user', chat_room);
}

function on_message_from_client(chat_room, data) {
//  console.log(util.format('[%d] got: %j', chat_room.id, data));

  // TODO validate
  // TODO enrich
  // publish
  chat_room.redis_adapter.publish_message(data);

  // TODO can as well use node event system to propagate the message to db store
}
//endregion

//region event callbacks ( called after message propagation)
function on_message(socket, data) {
  socket.emit('message_return', data);
}

function on_user_status(socket, data) {
  socket.emit('user_mgmt', data);
}
//endregion

function socketHandler(app, port) {
  var server = http.createServer(app).listen(port);
  var io = socketIO(server);
  io.sockets.on('connection', function (socket) {

    var chat_room = socket_connected(app, socket);

    // disconnect callback
    socket.on('disconnect', _.partial(socket_disconnected, app, chat_room, socket));

    // message callback
    var message_handler = _.partial(on_message_from_client, chat_room);
    socket.on('message', message_handler);
  });
}

module.exports = socketHandler;