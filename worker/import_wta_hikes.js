var async = require('async'),
    fs = require('fs'),
    _ = require('lodash'),
    config = require('../config/config'),
    Database = require('../app/db')(config);

// db.hikes.ensureIndex({active: 1, length: 1, elevGain: 1, numTripReports: 1, 'meta.estFlatDistance': 1, 'location': "2dsphere"}, {name: "mainindex"});

var estFlatDistance = function(distanceMiles, elevGainFeet){

    if (_.isString(distanceMiles)) {
        distanceMiles = parseFloat(distanceMiles);
    }

    if (_.isString(elevGainFeet)){
        elevGainFeet = parseFloat(elevGainFeet);
    }

    var feetToMiles = 0.000189394;
    var elevToDistFactor = 8;  // Source: http://en.wikipedia.org/wiki/Naismith's_rule#Assumptions_and_calculations
    var averageHumanCorrection = 1.4; // Naismith's formula gives a lower bound. Apply correction for regular walk breaks, fatigue etc. Src: http://en.wikipedia.org/wiki/Naismith's_rule#Modifications

    var minDist = distanceMiles + (elevGainFeet * feetToMiles * elevToDistFactor);
    return parseFloat((minDist * averageHumanCorrection).toFixed(2));  // Hacky adjust to 2 decimals
};

var toFloat = function(str){
    return str ? parseFloat(str) : null;
}


var filename = "./data/scrapedWtaHikes.json";
var hikes = JSON.parse(fs.readFileSync(filename));

var db = null;
async.waterfall([
    function(callback){
        db = new Database(callback);
    },

    function(callback){

        async.each(hikes, function(hike, cb){

            var active = true;
            if (!hike.length || !hike.lng || !hike.lat){
                active = false
            }

            var toInsert = {

                active: active,
                id: Date.now(),
                name: hike.name,
                length: toFloat(hike.length),
                location: {
                    "type": "Point",
                    "coordinates": [toFloat(hike.lng), toFloat(hike.lat)]
                },
                elevGain: toFloat(hike.elevGain),
                elevMax: toFloat(hike.elevMax),
                desc: hike.desc,
                imgurl: hike.imgurl ? hike.imgurl.url : null,
                drivingDirections: hike.drivingDirections,
                numTripReports: hike.numTripReports,
                rating: toFloat(hike.rating),

                meta: {
                    estFlatDistance: estFlatDistance(hike.length, hike.elevGain)
                },

                datasrc: {
                    id: hike.id,
                    sourceName: 'www.wta.org',
                    lastSync: new Date()
                }
            };

            db.insert({schema: 'hike', data: toInsert}, cb);
        }, callback);
    }
],

function(err){
    if (err) throw(err);
    console.log("Done inserting all docs to db");
    process.exit(0);
});

