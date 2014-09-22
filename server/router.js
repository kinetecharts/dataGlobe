var schemas = require('./db.js');
var express = require('express');
var request = require('request');
var router = express.Router();
var User = schemas.userSchema;
var Friend = schemas.friendSchema;
var drawing = require('../public/js/sphere_graph')

router.get("/", function (req,res){
  res.render("home");
});

router.post("/",function (req,res){
  res.end("successful post response");
});

router.get('/friends', function(req, res){
  res.render('globe');
})

router.get('/api/friends', function(req, res){
  var data = [
  {name: 'john', latitude: 44, longitude: 77},
  {name: 'sam', latitude: 22, longitude: 120}
  ];
  data = JSON.stringify(data);
  res.end(data)
});

router.get('/api/requestFriendsFB', function(req, res){
  console.log(req.session.passport.user.accessToken);
  request({
    uri: "https://graph.facebook.com/v1.0/fql?q=select+uid+from+friend+where+uid=me()&access_token="+req.session.passport.user.accessToken,
    method: "GET",
    timeout: 10000,
    followRedirect: true,
    maxRedirects: 10
  }, function(error, response, body) {
    console.log('server request response',body);
    res.end(body)
  });
});

// router.get('/api/friends', function(req, res){
//   Friend.find().exec(function(err, data){
//     res.end(data)
//   })
// })

module.exports = router;