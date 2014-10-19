'use strict';

var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    RedisAdapter = require('./redis_adapter');

module.exports = function (app, port) {
  var server = http.createServer(app).listen(port);
  var io = socketIO(server);

  // create handler for socket connections
  io.sockets.on('connection', _.partial(onNewConnection, app));

  // give possibility to gracefully close socket server
  return server;
};

function onNewConnection(app, socket) {
  // TODO check if client has r/w rights

  var client_data = {
    client_id: Date.now() % 1000,   // TODO read from socket handshake
    chat_room: 'aaa'                // TODO read from socket handshake
  };
  client_data.redis_adapter = new RedisAdapter(client_data,
    _.partial(on_message, socket),
    _.partial(on_user_status, socket));

  console.log('[client_id]' + client_data.client_id);

  // socket callbacks
  socket.on('disconnect', _.partial(on_socket_disconnected, app, client_data));
  socket.on('message', _.partial(on_socket_message, client_data));

  // node-level message
  app.emit('new user', client_data);
}

//region socket lifecycle
function on_socket_disconnected(app, client_data) {
  client_data.redis_adapter.unsubscribe();

  // node-level message
  app.emit('remove user', client_data);
}

function on_socket_message(client_data, data) {
  // TODO validate
  // TODO enrich
  // publish
  data.username = client_data.client_id;
  client_data.redis_adapter.publish_message(data);

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
