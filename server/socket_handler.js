'use strict';
/* global config */

var http = require('http'),
    socketIO = require('socket.io'),
    socketioJwt = require('socketio-jwt'),
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

  io.set('authorization', socketioJwt.authorize({
    secret   : config.secret_key,
    handshake: true
  }));

  // create handler for socket connections
  io.sockets.on('connection', _.partial(onNewConnection, app));

  // give possibility to gracefully close socket server
  return server;
};

function onNewConnection(app, socket) {
  var data = socket.client.request.decoded_token;
//  console.log(data, 'connected');
  // TODO on incorrect token

  // read client data
  var clientData = {
    clientId  : data.client_id,
    documentId: data.document_id
  };
//  console.log(clientData, 'connected');

  // server to client sending channel
  var emitterCallbacks = {
    operation : socket.emit.bind(socket, 'operation'),
    selection : socket.emit.bind(socket, 'selection'),
    join      : socket.emit.bind(socket, 'reconnect'),
    disconnect: socket.emit.bind(socket, 'client_left')
  };

  // create logic module
  clientData.msgPipeline = new MsgPipeline(app, clientData, emitterCallbacks);
  var pipe = clientData.msgPipeline;

  // socket callbacks - whatever happened forward it to pipeline ( logic module)
  socket.on('disconnect', pipe.onDisconnected.bind(pipe, app));
  socket.on('operation', pipe.onOperationMessage.bind(pipe));
  socket.on('selection', pipe.onSelectionMessage.bind(pipe));
}
