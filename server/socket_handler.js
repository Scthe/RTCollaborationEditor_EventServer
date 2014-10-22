'use strict';
/* global config */

var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    RedisAdapter = require('./redis_adapter');

module.exports = function (app) {

  var server, io;
  if (!config.socket_only) {
    server = http.createServer(app).listen(config.socket_port);
    io = socketIO(server);
  } else {
    server = http.createServer().listen(config.socket_port, config.socket_host);
    io = socketIO.listen(server);
  }

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
  client_data.redis_adapter = new RedisAdapter(
    client_data,
    _.partial(emit_operation, socket),
    _.partial(emit_selection, socket),
    _.partial(emit_client_reconnected, socket),
    _.partial(emit_client_left, socket));

  // socket callbacks
  socket.on('disconnect', _.partial(on_socket_disconnected, app, client_data));
  socket.on('operation', _.partial(on_operation_message, client_data));
  socket.on('selection', _.partial(on_selection_message, client_data));

  // node-level message
  app.emit('new user', client_data);
}

//region socket lifecycle
function on_socket_disconnected(app, client_data) {
  client_data.redis_adapter.unsubscribe();

  // node-level message
  app.emit('remove user', client_data);
}

function on_operation_message(client_data, data) {
  // TODO validate
  // TODO enrich
  // publish
  data.username = client_data.client_id;
  client_data.redis_adapter.publish_operation(data);

  // TODO can as well use node event system to propagate the message to db store
}
function on_selection_message(client_data, data) {
  data.username = client_data.client_id;
  client_data.redis_adapter.publish_selection(data);
}

//endregion

//region event callbacks ( called after message propagation)

function emit_operation(socket, data) {
  socket.emit('operation', data);
}

function emit_selection(socket, data) {
  socket.emit('selection', data);
}

function emit_client_reconnected(socket, data) {
  socket.emit('reconnect', data);
}

function emit_client_left(socket, data) {
  socket.emit('client_left', data);
}
//endregion
