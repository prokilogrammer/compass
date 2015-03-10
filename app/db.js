var mongoose = require('mongoose'),
    async = require('async'),
    _ = require('lodash'),
    utils = require('./utils');

module.exports = function(config){

    var m = function(done){
        var _this = this;

        _this.db = mongoose.connect(config.db);

        mongoose.connection.on('error', function () {
          done(new Error('unable to connect to database at ' + config.db));
        });

        mongoose.connection.once('connected', function(){
            _this.initModels();
            done();
        })
    };

    m.prototype.initModels = function(){
        var _this = this;

        // Initialize all models
        _this.models = {};
        _this.models['hike'] = require('./models/hike');
    };

    m.prototype.insert = function(params, cb){
        var _this = this;

        if (!utils.isValid(params.schema, params.data)) { return cb(new Error("Missing params - " + JSON.stringify(params)))}

        var model = _this.models[params.schema];
        var toInsert = new model(params.data);
        toInsert.save(function(err){
            cb(err || null);
        });
    };

    m.prototype.search = function(params, cb){
        var _this = this;

        if (!utils.isValid(params.schema)) {return cb(new Error("Missing params - " + JSON.stringify(params)))}

        var model = _this.models[params.schema];
        var queryStream = model
            .find()
            .select(params.select ? params.select : '')
            .limit(params.limit ? params.limit : 50)
            .stream();

    };

    return m;
};