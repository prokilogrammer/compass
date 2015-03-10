var _ = require('lodash');

var utils = {};

// Iterate through all supplied parameters and check if everyone of them is valid
// Checking is done from left to right and short-circuited. So you can supply parameters
// like obj, obj.key1, obj.key1.subkey1 and obj.key1 will be checked only if obj is valid.
utils.isValid = function(obj /* obj1, obj2, obj3... */){

    var args = Array.prototype.slice.call(arguments);
    for (var i=0; i < args.length; i++){
        if (_.isUndefined(args[i]) || _.isNull(args[i]) || _.isNaN(args[i])) return false;
    }

    return true;
};

module.exports = utils;
