var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Friend = new Schema({
})

var User = new Schema({
})

exports.friendSchema = mongoose.model('friend', Friend);
exports.userSchema = mongoose.model('user', User);

mongoose.connect(process.env.DB || 'mongodb://localhost/dataglobe');