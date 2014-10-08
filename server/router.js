var express = require('express');
var request = require('request');
var router = express.Router();
var schemas = require('./db.js');
var User = schemas.userSchema;
var Checkin = schemas.checkinSchema;
var Mutual = schemas.mutualSchema;
//var drawing = require('../public/js/sphere_graph')

router.get("/", function (req,res){
  res.render("home");
});

router.post("/",function (req,res){
  res.end("successful post response");
});

router.get('/friends', function (req, res){
  res.render('globe');
})

router.post('/save-user', function (req, res){
  var userData = req.body.user;
  userData = userData[0];
  User.findOneAndUpdate({fbId: userData.uid},{
    first_name: userData.first_name,
    last_name: userData.last_name,
    fbId: userData.uid,
    latitude: userData.current_location.latitude,
    longitude: userData.current_location.longitude,
    picture_url: userData.pic_square
    },{upsert: true}, function (err, data){
      if(err) console.log(err);
      req.session.userId = data.id;
      req.session.fbId = data.fbId;
      res.end();
    })
});

router.post('/save-friends', function (req, res){
  var friendData = req.body.response;
  friendData = JSON.parse(friendData);
  friendData = friendData.data;
  var saveFriends = function(friendData){
    var current = friendData.pop();
    User.findOneAndUpdate({ fbId: current.uid },{
      name: current.name,
      fbId: current.uid,
      latitude: (current.current_location !== null) ? current.current_location.latitude : null,
      longitude: (current.current_location !== null) ? current.current_location.longitude : null,
      picture_url: current.pic_square
    },{upsert: true}, function (err, data){
      if(err) console.log(err);
      User.findByIdAndUpdate(req.session.userId,{$addToSet: {friends: data.fbId}},
        {upsert: false}, function (err, data){
          if(err) console.log(data);
          if(friendData.length){
            return saveFriends(friendData);
          } else {
            res.end();
          }
        })
    })
  }
  saveFriends(friendData);
});

router.post('/save-checkins', function (req, res){
  var data = req.body.response;
  var checkin;
  console.log('checkin data to be saved to mongo',data);
  var saveCheckins = function(checkins){

        checkin = data[i];
        // TODO: value types don't match the mongoose schema
        Checkin.findOneAndUpdate(
          // find the checkin by this id
          { fbId: checkin.fbId },
          // update it's values
          {
            fbId: checkin.fbId,
            checkin_date: checkin.checkin_date,
            // the place
            place: checkin.place,
            latitude: checkin.latitude,
            longitude: checkin.longitude,
            // the personal
            from: checkin.from,
            message: checkin.message,
            clique: checkin.clique
          },
          // if checkin doesn't exist then create it
          { upsert: true},
          //
          function (err, data){
            if(err) console.log(err);
            console.log('checkin data saved to mongo:',data);
          }
        );
    res.end();
  }
});

router.get('/get-friends', function(req, res){
  var results = [];
  var getAllFriends = function(idArray){
    var current = idArray.pop();
    User.findOne({fbId: current}).exec(function(err, data){
      if(err) console.log(err);
      results.push(data);
      if(idArray.length){
        return getAllFriends(idArray);
      } else {
        results = JSON.stringify({data: results})
        res.end(results);
      }
    })
  }
  User.findById(req.session.userId, function(err, data){
    if(err) console.log(err);
    if(!data){
      res.redirect('/');
    } else {
      var idArray = data.friends;
      getAllFriends(idArray);
    }
  })
})

router.post('/save-mutual', function(req, res){
  var data = req.body;
  var userArray = [req.session.fbId, data.userB];
  Mutual.findOneAndUpdate({mutual_of: {$all: userArray}},{
    $addToSet: {mutual_of: {$each: userArray}, mutual_friends: {$each: data.mutuals}},
  },{upsert: true}, function(err, data){
    if(err) console.log(err);
    res.end();
  })
})

router.get('/get-user', function(req, res){
  User.findById(req.session.userId, function(err, data){
    if(data){
      data = JSON.stringify(data);
      res.end(data);  
    } else {
      res.end()
    }
  })
})

router.post('/get-mutual', function(req, res){
  var fbId = req.body.id;
  Mutual.findOne({ mutual_of: {$all:[req.session.fbId, fbId]} }).exec(function(err, data){
    if(err) console.log(err);
    if(data && data.mutual_friends){
      var data = data.mutual_friends;
      data = JSON.stringify(data);
      res.end(data);
    } else {
      res.end('[]');
    }
  })
})

module.exports = router;