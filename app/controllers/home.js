var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose');

module.exports = function (app, db) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {
    res.render('index', {
      title: 'Compass',
      articles: []
    });
});
