var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Friend = new Schema({
  name: String,
  fbId: Number,
  latitude: String,
  longitude: String,
  picture_url: String
});

var User = new Schema({
  first_name: String,
  last_name: String,
  latitude: String,
  longitude: String,
  fbId: Number
});

var Checkin = new Schema({
  // id to checkin object and not the place
  fbId: Number,
  created_at: String
  // the place
  place: {
    fbId: Number,
    name: String,
    photo: String
  },
  latitude: String,
  longitude: String,
  // the personal
  from: { name: String, fbId: Number }
});

exports.friendSchema = mongoose.model('friend', Friend);
exports.userSchema = mongoose.model('user', User);

mongoose.connect(process.env.DB || 'mongodb://localhost/dataglobe');