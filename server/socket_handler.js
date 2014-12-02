'use strict';
/* global config */

var http = require('http'),
    socketIO = require('socket.io'),
    socketioJwt = require('socketio-jwt'),
    _ = require('underscore'),
    MsgPipeline = require('./pipeline');

module.exports = function (app) {

  var server, io;
  if (!config.socketOnly) {
    server = http.createServer(app).listen(config.socketPort);
    io = socketIO(server);
  } else {
    server = http.createServer().listen(config.socketPort, config.socketHost);
    io = socketIO.listen(server);
  }

  io.set('authorization', socketioJwt.authorize({
    secret   : config.secretKey,
    handshake: true
  }));

  // create handler for socket connections
  io.sockets.on('connection', _.partial(onNewConnection, app));

  // give possibility to gracefully close socket server
  return server;
};

function onNewConnection(app, socket) {
  var data = socket.client.request.decoded_token;
  // NOTE: if the provided auth token is not ok
  // the execution does not reach this point

  // read client data
  var clientData = {
    clientId  : data.clientId,
    documentId: data.documentId
  };
//  console.log(clientData, 'connected');

  // server to client sending channel
  var emitterCallbacks = {
    operation : socket.emit.bind(socket, 'operation'),
    join      : socket.emit.bind(socket, 'reconnect'),
    disconnect: socket.emit.bind(socket, 'client_left')
  };

  // create logic module
  var pipe = new MsgPipeline(app, clientData, emitterCallbacks);

  // socket callbacks - whatever happened forward it to pipeline ( logic module)
  socket.on('disconnect', pipe.onDisconnected.bind(pipe, app));
  socket.on('operation', pipe.onOperationMessage.bind(pipe));
}
