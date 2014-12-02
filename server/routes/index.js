'use strict';
/*global config*/

var express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken');


/* GET home page. */
router.get('/:id', function (req, res) {
  /* jshint unused:false */ // req is not used
  var data = {
    documentId: req.params.id,
    clientId  : Date.now() % 1000 // this can be read from cookie
//    clientId  : 15
  };

  var token = jwt.sign(data, config.secretKey, { expiresInMinutes: 60 * 5 });

  res.render('index', { token: token});
});

module.exports = router;
