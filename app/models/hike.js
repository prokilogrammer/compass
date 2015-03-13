var mongoose = require('mongoose'),
    timestamps = require('mongoose-timestamps'),
  Schema = mongoose.Schema;

var HikeSchema = new Schema({

    id: String,
    active: {type: Boolean, default: false},
    name: String,
    length: Number,
    location: Schema.Types.Mixed,
    elevGain: Number,
    elevMax: Number,
    desc: String,
    imgurl: String,
    drivingDirections: String,
    numTripReports: Number,
    rating: Number,

    meta: {
        estFlatDistance: Number
    },

    datasrc: {
        id: String,
        sourceName: String,
        lastSync: Date
    }
});


HikeSchema.plugin(timestamps);

module.exports = mongoose.model('hike', HikeSchema);

