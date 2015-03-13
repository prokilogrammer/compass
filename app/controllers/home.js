var express = require('express'),
  router = express.Router(),
  _ = require('lodash'),
  utils = require('../utils'),
  geoip = require('../../geoip-lite'),
  async = require('async'),
  mongoose = require('mongoose');

module.exports = function (app, db) {
    var _this = this;
    _this.db = db;
    geoip.init();

    app.use('/', router);

    router.get('/', function (req, res, next) {
        res.render('index', {
          title: 'Compass',
          articles: []
        });
    });

    // Avg hiking speed: 3.1mph
    // Easy hikes are 2hrs round trip = 3.1*2 = 6.2miles flat
    // moderate hikes are 2 to 6hrs round trip => 6.2miles to 6*3.1 = 18.6miles
    // hard hikes are >6hrs round trip => > 18.6miles
    var addDifficultyCondition = function(difficulty, query){

        switch(difficulty){
            case "easy":
                query['meta.estFlatDistance'] = {$lte: 6.2};
                break;

            case "moderate":
                query['meta.estFlatDistance'] = {$gt: 6.2, $lte: 18.6};
                break;

            case "hard":
                query['meta.estFlatDistance'] = {$gt: 18.6};
                break;

            case "all":
                // Nothing to do
                break;

            default:
                throw new Error("Invalid difficulty param");
                break;
        }

        return query;
    };

    addDrivingDurationCondition = function(currentLocation, maxDriveDuration, query){

        // Assuming fastest one can get from their location to destination is 70mph,
        // the hike must be within 70*maxDriveDuration miles from their current location.
        // Use Mongo geo-index to find hikes within this radius

        if (!utils.isValid(currentLocation)) {throw new Error("Invalid user current location")}

        var milesToMeters = 1609.34;
        var distMeters = (maxDriveDuration * 70) * milesToMeters;
        query['location'] = {
            $near: {
                $geometry: {
                    type: "Point" ,
                    coordinates: [ currentLocation.lng , currentLocation.lat ]
                },

                $maxDistance: distMeters
            }
        };

        return query;
    };

    var parseMinMaxQuery = function(querystr){
        var split = querystr.split(',');
        var result = {min: _.parseInt(split[0])}
        if (split.length>1){
            result.max = _.parseInt(split[1])
        }

        return result;
    };

    router.get('/search', function (req, res, next) {

        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        // When there are multiple proxies, they add the IPs to the forwareded header. Grab the first one
        if (!_.isUndefined(ip) || !_.isNull(ip) || ip.indexOf(',') > -1)
            ip = ip.split(',')[0];

        var locresult = geoip.lookup(ip);
        var clientLoc = null;
        if (locresult){
            clientLoc = {lat: locresult.ll[0], lng: locresult.ll[1]};
        }

        var query = {
            active: true
        };

        if (req.query.length){

            // I get a comma seperated list like 3,5
            var length = parseMinMaxQuery(req.query.length);
            query['length'] = {$gte: length.min};
            if (length.max){
                query.length.$lt = length.max;
            }
        }

        if (req.query.elevGain){

            var elevGain = parseMinMaxQuery(req.query.elevGain);
            query.elevGain = {$gte: elevGain.min};
            if (elevGain.max){
                query.elevGain.$lt = elevGain.max;
            }
        }

        if (req.query.difficulty){
            query = addDifficultyCondition(req.query.difficulty, query);
        }

        var drivingDuration = null;
        if (req.query.drivingDuration && clientLoc){

            drivingDuration = parseMinMaxQuery(req.query.drivingDuration);
            var max = drivingDuration.max ? drivingDuration.max : drivingDuration.min;
            query = addDrivingDurationCondition(clientLoc, max, query);
        }

        console.log(ip);
        console.log(clientLoc);
        console.log(JSON.stringify(query,null,2));

        async.waterfall([
            function(callback){
                var hikes = [];
                _this.db.find({
                    schema: 'hike',
                    query: query,
                    limit: 50,
                    skip: req.query.skip,
                    lean: true
                })
                    .on('data', function(d){
                        hikes.push(d);
                    })
                    .on('error', function(err){
                        callback(err);
                    })
                    .on('end', function(){
                        callback(null, hikes);
                    })
            },

            function(hikes, callback){

                // Call Google and get driving directions.
                callback(null, hikes);

            }
        ],
        function(err, hikes){
            if (err){
                return next(err)
            }

            res.render('search', {
                hikes: hikes
            });
        });


    });
};
