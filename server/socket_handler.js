var http = require('http'),
    socketIO = require('socket.io');

function socketHandler(app, port) {
  var server = http.createServer(app).listen(port);
  var io = socketIO(server);
  io.sockets.on('connection', function (socket) {

    console.log('socket got connection !');

    socket.on('message', function (data) {
      console.log('socket got: ');
      console.log(data);
      socket.emit('message_return', data);
    });

  });
}

module.exports = socketHandler;