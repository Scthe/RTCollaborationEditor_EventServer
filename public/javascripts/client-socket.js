$(document).ready(function () {
  // TODO init config - move to other file
  var client_id = Date.now() % 1000;
  var user_count = $("#user_count");
  $("#current_client_id").text(client_id);

  // get chat room we are in
  var chat_room = "a";
  var url_args = window.location.search.substring(1).split("&");
  var room_arg = _.find(url_args, function (url) {
    return /^room=[ab]$/.test(url);
  });
  if (room_arg) {
    chat_room = room_arg[5];
  }
  $("#current_room").text(chat_room);

  // socket part starts here !
  var SOCKET_PORT = 8082; // TODO move SOCKET_PORT to some config file
  var socket = io.connect('http://localhost:' + SOCKET_PORT);

  // send client data as quickly as possible
  socket.on('connect', function () {
    socket.emit('client_data', {
      client_id: client_id,
      chat_room: chat_room
    });
  });

  socket.on('system', function (data) {
    client_id = data.client_id;
  });

  // listen on message_return channel
  socket.on('message_return', function (data) {
    console.log(data);
  });

  socket.on('user_mgmt', function (data) {
    console.log(data);
    user_count.text(data.user_count);
  });

  function send_message(msg) {
    socket.emit('message', {text: msg });
    message_input.val('');

    // TODO can show message now, but should check to not display own message twice
  }
});