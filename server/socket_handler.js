'use strict';
/* global config */

var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    MsgPipeline = require('./pipeline');

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
  // read client data
  var client_data = {
    client_id: Date.now() % 1000,   // TODO read from socket handshake
    chat_room: 'aaa'                // TODO read from socket handshake
  };

  // server to client sending channel
  var toClientEmitter = function (channel, data) {// TODO simplify
    socket.emit(channel, data);
  };
  var emitterCallbacks = {
    operation : _.partial(toClientEmitter, 'operation'),
    selection : _.partial(toClientEmitter, 'selection'),
    join      : _.partial(toClientEmitter, 'reconnect'),
    disconnect: _.partial(toClientEmitter, 'client_left')
  };

  // create logic module
  client_data.msgPipeline = new MsgPipeline(app, client_data, emitterCallbacks);
  var pipe = client_data.msgPipeline;

  // socket callbacks - whatever happened forward it to pipeline ( logic module)
  socket.on('disconnect', pipe.onDisconnected.bind(pipe, app));
  socket.on('operation', pipe.onOperationMessage.bind(pipe));
  socket.on('selection', pipe.onSelectionMessage.bind(pipe));
}
