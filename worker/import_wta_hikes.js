var async = require('async'),
    fs = require('fs'),
    _ = require('lodash');

var filename = "./data/scrape_wta_hikes.js";

var hikes = JSON.parse(fs.readFileSync(filename));

async.each(hikes, function(hike, callback){

},

function(err){

    console.log("Done inserting all docs to db");

});
