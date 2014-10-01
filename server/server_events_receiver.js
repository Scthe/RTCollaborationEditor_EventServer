var _ = require('underscore'),
    util = require('util');

function systemEventsReceiver(app) {

  app.on('new user', function (data) {
    console.log(util.format('[new user] system event: %j', data));
  });

  app.on('remove user', function (data) {
    console.log(util.format('[remove user] system event: %j', data));
  });

}

module.exports = systemEventsReceiver;