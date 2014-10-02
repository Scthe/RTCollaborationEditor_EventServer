var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    RedisAdapter = require('./redis_adapter');


//region Socket lifecycle
function on_socket_connected(app, socket) {
  // TODO check if client has r/w rights

  var chat_room = {
    id       : 12345,
    client_id: socket.id
  };
  console.log(">>[client_id]" + chat_room["client_id"]);

  chat_room["redis_adapter"] = RedisAdapter(chat_room,
    _.partial(on_message, socket),
    _.partial(on_user_status, socket));

  // node-level message
  app.emit('new user', chat_room);

  // inform the client about the communication parameters
  // ( should be read from handshake cookies really)
  socket.emit("system", {client_id: chat_room["client_id"]});

  return chat_room;
}

function on_socket_disconnected(app, chat_room) {
  chat_room.redis_adapter.unsubscribe();

  // node-level message
  app.emit('remove user', chat_room);
}

function on_socket_message(chat_room, data) {
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

    var chat_room = on_socket_connected(app, socket);

    // disconnect callback
    socket.on('disconnect', _.partial(on_socket_disconnected, app, chat_room));

    // message callback
    var message_handler = _.partial(on_socket_message, chat_room);
    socket.on('message', message_handler);
  });
}

module.exports = socketHandler;