'use strict';
/*global config*/

var express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken');

/**
 *
 * GET home page
 * <p/>
 * Express route handler. Used only in testing environment.
 * <p/>
 * @module server/routes/index
 * @exports {Express.Router} route handler
 */


/**
 * Express route handler. Used only in testing environment.
 * Common route: /:docId
 *
 * @param {Request }req  request object
 * @param {Stream }res response object
 */
function documentRoute(req, res) {
  /* jshint unused:false */ // req is not used
  var data = {
    documentId: req.params.id,
    clientId  : Date.now() % 1000
  };

  var token = jwt.sign(data, config.secretKey, { expiresInMinutes: 60 * 5 });

  res.render('index', { token: token});
}

router.get('/:id', documentRoute);

module.exports = router;
