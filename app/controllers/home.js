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

router.get('/search', function (req, res, next) {
    var hikes = [
        {
            name: "Hike 1",
            length: 6.5, //miles
            location: [0.123, -123.23], // lat, lon
            elevGain: 1000, //feet
            elevMax: 2000, //feet
            desc: "description",
            imgurl: "http://whatever",
            drivingDirections: "How to get ther?",
            popularity: 3,
            rating: 2.5,
            difficulty: 4,
            drivingDistance: 80.2, //miles
            drivingTime: 120, //minutes
        }
    ];

    res.render('search', {
        hikes: hikes
    });
});
