'use strict';
/* global config */

var http = require('http'),
    socketIO = require('socket.io'),
    socketioJwt = require('socketio-jwt'),
    _ = require('underscore'),
    MsgPipeline = require('./pipeline');

/**
 * @module server/server_handler
 *
 * @exports {function(EventEmitter):Server} factory function to create socket server
 */


module.exports = startSocketServer;

/**
 *
 * Starts separate server to handle incoming socket connection.
 * Uses config.socketPort and  config.socketHost.
 *
 * @method startSocketServer
 * @param {EventEmitter} app application object used for server-only event bus
 * @return {Server} http.createServer object
 */
function startSocketServer(app) {
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
}

/**
 *
 * Handler for the incoming client connection. This function has as least
 * responsibilities as possible to not violate singe responsibility practice.
 * It makes tests less costly too !
 *
 * All we want to do here is:
 * - read provided client data ( clientId and documentId)
 * - wrap functions used to send data back to client
 * - delegate all socket events to newly created pipeline object
 *
 * Note that token authorization is handled in filter before this function
 * is even invoked so we don't even have to care about that.
 *
 * @method onNewConnection
 * @param {EventEmitter} app application object used for server-only event bus
 * @param {Socket} socket incoming client connection
 */
function onNewConnection(app, socket) {
  /*jshint camelcase: false */ // decoded_token is part of external lib

  // read client data
  var data = socket.client.request.decoded_token;
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
  socket.on('disconnect', pipe.onDisconnected.bind(pipe));
  socket.on('operation', pipe.onOperationMessage.bind(pipe));
}
