var express = require('express'),
  router = express.Router(),
  _ = require('lodash'),
  utils = require('../utils'),
  geoip = require('../../geoip-lite'),
  async = require('async'),
  config = require('../../config/config'),
  querystring = require('querystring'),
  request = require('request'),
  geolib = require('geolib'),
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

    var addDifficultyDataToResults = function(hikes){

        _.forEach(hikes, function(hike){
            hike.difficultyNumber = '-';
            hike.difficultyText = 'unknown difficulty';
            if (hike.meta && hike.meta.estFlatDistance){

                var flat = hike.meta.estFlatDistance;
                var diffNum, diffText;

                if (flat < 3.1) diffNum = 1;
                else if (flat < 6.2) diffNum = 2;
                else if (flat < 12.4) diffNum = 3;
                else if (flat < 18.6) diffNum = 4;
                else diffNum = 5;


                if (flat < 6.2) diffText = 'easy'
                else if (flat < 18.6) diffText = 'moderate'
                else diffText = 'hard';

                hike.difficultyNumber = diffNum;
                hike.difficultyText = diffText;
            }

        });

        return hikes;
    };

    var addHikeLocationStr = function(hikes){
        _.forEach(hikes, function(hike){
            if (!hike.location || !hike.location.coordinates) return;
            hike.locationStr = hike.location.coordinates[1] + "," + hike.location.coordinates[0];
        });

        return hikes;
    };

    var addDrivingDurationCondition = function(currentLocation, maxDriveDuration, query){

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

    var googleMapsDistance = function(origin, dest, userIp, callback){

        var url = "https://maps.googleapis.com/maps/api/distancematrix/json?" + querystring.stringify({
            key: config.googleApiKey,
            units: 'imperial',
            origins: origin,
            destinations: dest,
            userIp: userIp
        });

        console.log(url);

        request.get(url, function(err, resp, body){
            if (err) return callback(err);

            if (resp.statusCode == 200){
                return callback(null, JSON.parse(body));
            }

            // something is wrong
            err = new Error(body);
            err.code = resp.statusCode;
            return callback(err, body);
        })
    };

    var METERS_TO_MILES = 0.000621371;
    var addStraightLineDistance = function(hikes, userLoc){

        _.forEach(hikes, function(hike){

            if (!hike.location || !hike.location.coordinates) return;

            var distMeters = geolib.getDistance({latitude: hike.location.coordinates[1], longitude: hike.location.coordinates[0]},
                {latitude: userLoc.lat, longitude: userLoc.lng});

            hike.straightLineDistance = distMeters * METERS_TO_MILES;
        });

        return hikes;
    };

    var getDrivingDistance = function(hikes, userIp, userLoc, callback){
        // All hikes will have lat/lng data

        if (!userLoc) return callback(null, hikes);

        hikes = addStraightLineDistance(hikes, userLoc);

        // Format: lat,lng|lat,lng|lat,lng
        var origin = _.map(hikes, function(hike){return hike.location.coordinates[1] + "," + hike.location.coordinates[0]}).join('|');
        var dest = userLoc.lat + "," + userLoc.lng;

        googleMapsDistance(origin, dest, userIp, function(err, results){

                if (err || results.status != "OK") {
                    console.log("Google maps returned error: ", err, results.status);
                    return callback(err || new Error("GOOGLE MAPS STATUS " + results.status));
                }

                _.forEach(hikes, function(hike, index){

                    var element = results.rows[index].elements[0];
                    if (element.status != "OK") return;

                    hike.googleMapsResults = {
                        hikeAddress: results.origin_addresses[index],
                        distanceMeters: element.distance.value,
                        distanceMiles: (element.distance.value * METERS_TO_MILES).toFixed(2),
                        durationSeconds: element.duration.value,
                        durationText: element.duration.text
                    }
                });

                console.log("Google maps returns ", hikes.length);
                callback(null, hikes);
        });
    };

    var filterByDrivingDuration = function(hikes, filter){

        if (!filter || (!filter.min && !filter.max)){
            console.log("NO driving duration filter");
            return hikes;
        }

        return _.filter(hikes, function(hike){

            // Don't Include hikes that don't have results from Google maps
            if (!_.has(hike, 'googleMapsResults')) {
                console.log("Hike " + hike.id + " doesn't have google maps results");
                return false;
            }

            var durationHrs = hike.googleMapsResults.durationSeconds / 3600;

            var result = true;
            if (filter.min){
                result = result && (durationHrs > filter.min);
            }

            if (filter.max){
                result = result && (durationHrs < filter.max);
            }

            return result;
        })

    };

    router.get('/search-results', function (req, res, next) {

        var userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        // When there are multiple proxies, they add the IPs to the forwareded header. Grab the first one
        if (!_.isUndefined(userIp) || !_.isNull(userIp) || userIp.indexOf(',') > -1)
            userIp = userIp.split(',')[0];

        var locresult = geoip.lookup(userIp);
        var userLoc = null;
        if (locresult){
            userLoc = {lat: locresult.ll[0], lng: locresult.ll[1]};
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
        if (req.query.drivingDuration && userLoc){

            drivingDuration = parseMinMaxQuery(req.query.drivingDuration);
            var max = drivingDuration.max ? drivingDuration.max : drivingDuration.min;
            query = addDrivingDurationCondition(userLoc, max, query);
        }

        console.log(userIp);
        console.log(userLoc);
        console.log(JSON.stringify(query,null,2));

        async.waterfall([
            function(callback){
                var hikes = [];
                _this.db.find({
                    schema: 'hike',
                    query: query,
                    limit: req.query.limit || 20,
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
                getDrivingDistance(hikes, userIp, userLoc, function(err, hikes){
                    // Ignore errors from Google Maps. Its okie
                    if (err) {
                        console.log("Google API returned error: ");
                        console.error(err);
                        return callback(null, hikes);
                    }

                    hikes = filterByDrivingDuration(hikes, drivingDuration);
                    console.log(hikes.length + " hikes after filter");
                    callback(null, hikes);
                })
            },

            function(hikes, callback){
                // Add more data points for search results page to display
                addDifficultyDataToResults(hikes);
                addHikeLocationStr(hikes);
                callback(null, hikes);
            }
        ],
        function(err, hikes){
            if (err){
                return next(err)
            }

            res.render('search-results', {
                hikes: hikes
            });
        });


    });
};
