var http = require('http'),
    socketIO = require('socket.io'),
    _ = require('underscore'),
    RedisAdapter = require('./redis_adapter');


//region Socket lifecycle
function on_socket_connected(app, socket) {
  // TODO check if client has r/w rights

  var client_data = {
    id       : 12345,
    client_id: socket.id
  };
  console.log(">>[client_id]" + client_data["client_id"]);

  client_data["redis_adapter"] = RedisAdapter(client_data,
    _.partial(on_message, socket),
    _.partial(on_user_status, socket));

  // node-level message
  app.emit('new user', client_data);

  // inform the client about the communication parameters
  // ( should be read from handshake cookies really)
  socket.emit("system", {client_id: client_data["client_id"]});

  return client_data;
}

function on_socket_disconnected(app, client_data) {
  client_data.redis_adapter.unsubscribe();

  // node-level message
  app.emit('remove user', client_data);
}

function on_socket_message(client_data, data) {
//  console.log(util.format('[%d] got: %j', chat_room.id, data));

  // TODO validate
  // TODO enrich
  // publish
  client_data.redis_adapter.publish_message(data);

  // TODO can as well use node event system to propagate the message to db store
}
//endregion

//region event callbacks ( called after message propagation)
function on_message(socket, data) {
  socket.emit('message_return', data);
}

function on_user_status(socket, data) {
  socket.emit('user_mgmt', data);
}
//endregion

function socketHandler(app, port) {
  var server = http.createServer(app).listen(port);
  var io = socketIO(server);
  io.sockets.on('connection', function (socket) {

    var client_data = on_socket_connected(app, socket);

    // disconnect callback
    socket.on('disconnect', _.partial(on_socket_disconnected, app, client_data));

    // message callback
    var message_handler = _.partial(on_socket_message, client_data);
    socket.on('message', message_handler);
  });
}

module.exports = socketHandler;