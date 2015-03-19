var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'compass'
    },
    port: 3000,
    db: 'mongodb://localhost/compass-development',
    googleApiKey: "AIzaSyAYpKMEph6yhHUgQdw0K75NY51UB_vIeaQ"
  },

  test: {
    root: rootPath,
    app: {
      name: 'compass'
    },
    port: 3000,
    db: 'mongodb://localhost/compass-test',
    googleApiKey: "AIzaSyAYpKMEph6yhHUgQdw0K75NY51UB_vIeaQ"
  },

  production: {
    root: rootPath,
    app: {
      name: 'compass'
    },
    port: 3000,
    db: 'mongodb://localhost/compass-production',
    googleApiKey: "AIzaSyAYpKMEph6yhHUgQdw0K75NY51UB_vIeaQ"
  }
};

module.exports = config[env];
