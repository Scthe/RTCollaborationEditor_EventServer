var _ = require('underscore'),
    util = require('util');

module.exports = function (app) {
  app.on('new user', onNewUser);
  app.on('remove user', onRemoveUser);
};

function onNewUser(data) {
  console.info(util.format('[system event] new user: %d', data.client_id));
}

function onRemoveUser(data) {
  console.info(util.format('[system event] remove user: %d', data.client_id));
}