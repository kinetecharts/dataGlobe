var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
  first_name: String,
  last_name: String,
  latitude: String,
  longitude: String,
  fbId: Number,
  friends: {type: Array, default: []},
  picture_url: String,
})

exports.userSchema = mongoose.model('user', User);

mongoose.connect(process.env.DB || 'mongodb://localhost/dataglobe');