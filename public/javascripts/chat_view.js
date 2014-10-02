$(document).ready(function () {
  var client_id;
  var SOCKET_PORT = 8082; // TODO move SOCKET_PORT to some config file
  var socket = io.connect('http://localhost:' + SOCKET_PORT);

  var message_input = $('#message-input');
  var jumbotron = $('#message-list-empty');
  var message_area = $('#message-list');
  var message_template = $("#template-message").html();
  var user_count = $("#user_count");
  message_template = _.template(message_template);

  var client_id = Date.now() % 1000;
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

  // send client data as quickly as possible
  socket.on('connect', function () {
    socket.emit('client_data', {
      client_id: client_id,
      chat_room: chat_room
    });
  });

  function send_message(msg) {
    socket.emit('message', {text: msg });
    message_input.val('');

    // TODO can show message now, but should check to not display own message twice
  }

  socket.on('system', function (data) {
    client_id = data.client_id;
  });

  // listen on message_return channel
  socket.on('message_return', function (data) {
    console.log(data);
    display_message(data.username, data.text);
  });

  socket.on('user_mgmt', function (data) {
    console.log(data);
    display_message('System', data.text);
    user_count.text(data.user_count);
  });

  function display_message(username, msg) {
    var html = message_template({ 'username': username, 'text': msg });
    message_area.prepend(html);
//    message_area.scrollTop(message_area.prop("scrollHeight"));

    jumbotron.hide();
  }

  // chat screen
  message_input.keydown(function (e) {
    if (e.keyCode === 13) {
      var msg = $('#message-input').val().trim();
      send_message(msg);
      e.preventDefault();
    }
  });

});