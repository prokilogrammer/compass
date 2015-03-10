var express = require('express'),
  config = require('./config/config'),
  Database = require('./app/db')(config);

var app = express();

var db = null;
db = new Database(function(err){
    if (err) {
        throw(err);
    }

    require('./config/express')(app, config, db);
    app.listen(config.port);
});

