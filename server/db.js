var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Friend = new Schema({
	name: String,
	image: String,
	latitude: Number,
	longitude: Number,
})

var User = new Schema({
	fbId: String,
	name: String,
	latitude: Number,
	longitude: Number
})

exports.friendSchema = mongoose.model('friend', Friend);
exports.userSchema = mongoose.model('user', User);

mongoose.connect(process.env.DB || 'mongodb://localhost/dataglobe');