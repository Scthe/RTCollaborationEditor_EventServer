'use strict';
/*global config*/

var express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken');


/* GET home page. */
router.get('/', function (req, res) {
  /* jshint unused:false */ // req is not used
  // TODO read client_id from cookie
  // TODO store the ( client_id, room_id, auth_token)
  // TODO render the page with the token or set is as cache
  // TODO client sends us the token back on socket handshake
  // TODO make token one time use

  var profile = {
    first_name: 'John',
    last_name : 'Doe',
    email     : 'john@doe.com',
    id        : 123
  };

  // we are sending the profile in the token
  var token = jwt.sign(profile, config.secret_key, { expiresInMinutes: 60 * 5 });

  res.render('index', { token: token});
});

module.exports = router;
