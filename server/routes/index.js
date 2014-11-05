'use strict';

var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function (req, res) {
  /* jshint unused:false */ // req is not used
  // TODO read client_id from cookie
  // TODO store the ( client_id, room_id, auth_token)
  // TODO render the page with the token or set is as cache
  // TODO client sends us the token back on socket handshake
  // TODO make token one time use
  res.render('index', { title: 'Home'});
});

module.exports = router;
