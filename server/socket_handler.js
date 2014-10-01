var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    util = require('util');

// TODO validate
// TODO enrich
// TODO publish

var sockets = [];

function socket_connected(app, socket) {
  // TODO check if client has r/w rights
  // TODO return client id

  _.each(sockets, function (s) {
    s.emit('user_mgmt', { text: 'user connected'});
  });
  sockets.push(socket);

  var chat_room = { id: 12345};
  app.emit('new user', chat_room);
  return chat_room;
}

function socket_disconnected(app, chat_room, socket) {
  sockets.splice(sockets.indexOf(socket), 1);

  _.each(sockets, function (s) {
    s.emit('user_mgmt', { text: 'user disconnected'});
  });

  app.emit('remove user', chat_room);
}

function on_message(socket, chat_room, data) {
  console.log(util.format('[%d] got: %j', chat_room.id, data));

  _.each(sockets, function (s) {
    s.emit('message_return', data);
  });
}

function socketHandler(app, port) {
  var server = http.createServer(app).listen(port);
  var io = socketIO(server);
  io.sockets.on('connection', function (socket) {

    var chat_room = socket_connected(app, socket);

    socket.on('disconnect', _.partial(socket_disconnected, app, chat_room, socket));

    var message_handler = _.partial(on_message, socket, chat_room);
    socket.on('message', message_handler);
  });
}

module.exports = socketHandler;