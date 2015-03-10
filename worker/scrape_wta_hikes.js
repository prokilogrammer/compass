var sandcrawler = require('sandcrawler'),
    fs = require('fs'),
    _ = require('lodash'),
    async = require('async');

var tripReportCount = function(text){
    if (!text || !_.isString(text)) return 0;

    text = text.trim();
    var matches = text.match(/(\d+).*/); // ex: 10 trip reports
    if (matches && matches.length > 1){
        return _.parseInt(matches[1])
    }
    else {
        return 0;
    }
}

var hikesList = JSON.parse(fs.readFileSync("./data/hikes-list.json"));

var scrapeUrls = _.map(hikesList, function(hike){
    return {
        url: "http://www.wta.org/go-hiking/hikes/" + hike.id,
        data: hike
    }
});

var totalHikes = scrapeUrls.length;
var completedScrapes = 0;
var scrapedHikes = [];
var spider = sandcrawler.spider()
    .urls(scrapeUrls)
    .scraper(function($, done){

        var hike = {};
        hike['desc'] = $('#hike-body-text').scrapeOne('html');
        hike['imgurl'] = $('.image-with-caption div+img').scrapeOne({url: {attr: 'src'}})
        hike['drivingDirections'] = $('#driving-directions p').scrape().join(' ');
        hike['passRequired'] = $('#pass-required-info a').scrapeOne();
        hike['numTripReports'] = tripReportCount($('#trip-report-listing-header h2').scrapeOne());

        done(null, hike);
    })
    .result(function(err, req, res){
        if (err) {
            console.error("Something went wrong when scrapping ", req.url);
            return console.error(err);
        }

        completedScrapes++;
        console.log("["+completedScrapes+"/"+totalHikes+"]", req.url);
        var hike = _.clone(req.data);
        hike = _.merge(hike, res.data);
        scrapedHikes.push(hike);
    })
    .on('job:fail', function(err, job){
        console.error("Crawl job failed. ", err, url);
    })
    .on('spider:fail', function(err){
        console.error("Something terrible happened ", err);
    })
    .on('spider:success', function(remain){
        if (remain && remain.length > 0){
            console.error("Crawl incomplete. Remaining items " + JSON.stringify(_.pluck(remain, 'url')));
        }

        console.log("Crawl success");
        fs.writeFileSync('./data/scrapedWtaHikes.json', JSON.stringify(scrapedHikes, null, 2));
        console.log("Write done");
    })
    .run();
