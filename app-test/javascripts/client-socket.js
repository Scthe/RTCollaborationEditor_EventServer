'use strict';
/* global io */

var remoteInterface;

$(document).ready(function () {
  var SOCKET_PORT = 8082; // TODO move SOCKET_PORT to some config file
  var token = $('[name="token"]').val();
  console.log('token: ', token);
  var socket = io.connect('http://localhost:' + SOCKET_PORT, {
    query: 'token=' + token
  });

  socket.on('connect', function () {
    console.log('authenticated');
  }).on('disconnect', function () {
    console.log('disconnected');
  });

  // listen on message_return channel
  socket.on('operation', function (data) {
    console.log(data);
    remoteInterface.on_operation(data);
  });

  socket.on('selection', function (data) {
//    console.log(data);
    remoteInterface.on_selection(data);
  });

  socket.on('reconnect', function (data) {
//    console.log('reconnect', data);
    remoteInterface.on_reconnect(data);
  });

  socket.on('client_left', function (data) {
//    console.log('client_left', data);
    remoteInterface.on_client_left(data);
  });

  function send_operation(msg) {
    socket.emit('operation', {data: msg });
    // TODO can show message now, but should check to not display own message twice
  }

  function send_selection(msg) {
    socket.emit('selection', {data: msg });
  }

  remoteInterface = {
    send_operation: send_operation,
    send_selection: send_selection,
    on_operation  : voidFunction,
    on_selection  : voidFunction,
    on_reconnect  : voidFunction,
    on_client_left: voidFunction
  };

  function voidFunction() {
  }
});