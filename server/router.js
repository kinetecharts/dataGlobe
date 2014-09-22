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

router.post('/save-user', function(req, res){
  var user = req.body.user;
  console.log(user);
  res.end();
});

router.post('/save-friends', function(req, res){
  var data = req.body.friends;
  console.log(data);
  res.end();
});

router.post('/save-checkins', function(req, res){
  var data = req.body.friends;
  console.log(data);
  res.end();
})

module.exports = router;