var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('chat_view', { title: 'Chat' });
});

module.exports = router;
