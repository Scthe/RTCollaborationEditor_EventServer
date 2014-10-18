var remoteInterface;

$(document).ready(function () {
  var SOCKET_PORT = 8082; // TODO move SOCKET_PORT to some config file
  var socket = io.connect('http://localhost:' + SOCKET_PORT);

  socket.on('system', function (data) {
    // TODO read this from cookie. Or just do not display this
    $("#current_client_id").text(data.client_id);
  });

  // listen on message_return channel
  socket.on('message_return', function (data) {
    console.log(data);
    remoteInterface.handler(data.data);
  });

  socket.on('user_mgmt', function (data) {
    console.log(data);
    $("#user_count").text(data.user_count);
  });

  function send_message(msg) {
    socket.emit('message', {data: msg });
    // TODO can show message now, but should check to not display own message twice
  }

  remoteInterface = {
    send_message: send_message,
    handler     : function () {
    }
  }
});