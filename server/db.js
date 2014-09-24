var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
  name: String,
  latitude: String,
  longitude: String,
  fbId: Number,
  friends: {type: Array, default: []},
  picture_url: String,
});

var Mutual = new Schema({
  mutual_of: {type: Array, default: [], dropDups: true},
  mutual_friends: {type: Array, default: [], dropDups: true}
})

var Checkin = new Schema({
  // id to checkin object and not the place
  fbId: Number,
  checkin_date: String,
  // the place
  place: {
    fbId: Number,
    name: String,
    photo: {type: String, default: null}
  },
  latitude: String,
  longitude: String,
  // the personal
  from: { name: String, fbId: Number },
  message: String,
  clique: [ /* and array of facebook uid's */]
});

exports.userSchema = mongoose.model('user', User);
exports.checkinSchema = mongoose.model('checkin', Checkin);
exports.mutualSchema = mongoose.model('mutual', Mutual);

mongoose.connect(process.env.DB || 'mongodb://localhost/dataglobe');