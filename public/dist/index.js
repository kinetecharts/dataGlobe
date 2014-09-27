var queryStringData = {
  friendsQuery: {
    queryString: [ "SELECT uid, name, current_location.latitude, current_location.longitude, pic_square ","FROM user ","WHERE uid in (","SELECT uid2 FROM friend ","WHERE uid1 = me())" ],
    url: '/api/save-friends',
    endpoint: '/fql'
  },
  timelineQuery: {
    queryString: [],
    url: '/api/save-timeline'
  },
  checkinsQuery: {
    queryString: ['checkins{place,id,from,created_time,message,tags}'],
    type: 'checkins',
    url: '/api/save-checkins',
    endpoint: '/me'
  },
  mutualFriends: {
    queryString: ['SELECT uid1 FROM friend WHERE uid2=[targetID] AND uid1 IN (SELECT uid2 FROM friend WHERE uid1=me())'],
    url: '/api/save-mutual',
    endpoint: '/me'
  },
  newsFeed: {
    queryString: ['posts{id,type,from,to,with_tags,created_time,message,story,link,name,tags,picture}'],
    endpoint: false
  }
}
;var filter = function(array){
  var results = [];
  for(var i = 0; i < array.length; i++){
    results.push(array[i].id)
  }
  return results;
}

var FBData = (function(){

var queryMap = queryStringData;

function getRequest(query, endpoint, cb){
  var queryData = queryMap[query];
  // generate a parameter object for either FQL or Graph API syntax
  var queryType;
  if(!queryData.endpoint){
    queryType = '/' + endpoint;
  } else {
    queryType = queryData.endpoint;
  }
  var queryParameters = {};
  if(queryType === "/fql"){
    queryParameters["q"] = queryData.queryString.join('');
  } else {
    queryParameters["fields"] = queryData.queryString.join('');;
  }
  console.log('my query:', queryType, queryParameters);
  // querying attempt using FQL + facebook API
  FB.api(
    queryType,
    queryParameters,

    // callback when async http request responds
    function(Qresponse){
      var payload;
      var data;
      if(Qresponse){
        // special prep just for checkin data from facebook to app server
        if(queryData.type === 'checkins'){
          fetchPaginatedCheckinData(Qresponse);
        }
        data = data || Qresponse;
        payload = JSON.stringify(data)
        if(queryData.url){
          $.post(queryData.url, {response: payload}).then(function(response){
            console.log('ajax success:', queryData.url, response);
          })
        } else {
          return cb(payload);
        }
      }
    }
  );
}

function fetchPaginatedCheckinData(initialGetResponse){
  if(initialGetResponse.next){
    var nextPage = initialGetResponse.next;
    var data = formatCheckinDataForDB(initialGetResponse);
    console.table(data);
    setTimeout(function(data){
      $.get(nextPage,
        function(nextResponse){
          console.table('paginated response:', nextResponse);
          fetchPaginatedCheckinData(nextResponse);
        }
      );
    });
  }
}

function getMutual(){
  $.get('/api/get-friends').then(function(response){
    console.log(response);
    response = JSON.parse(response);
    var friends = response.data;
    $('.friends').text(friends.length.toString());
    $('.helper').toggle();
    $('.title').toggle();
    var done = 0;
    var eachFriend = function(friendsArray){
      var current = friendsArray.pop();
      var id = current.fbId;
      FB.api('/me/mutualfriends/'+id, function(response){
        var mutuals = filter(response.data);
        var payload = {userB: id, mutuals: mutuals}
        $.post('/api/save-mutual', payload).then(function(response){
          done++;
          $('.done').text(''+ done);
          if(friendsArray.length){
            return eachFriend(friendsArray);
          } else {
            return;
          }
        })
      });
    };
    eachFriend(friends);
  });
}

function getPostLikes(id, cb){
  FB.api('/'+id+'/likes',function (response){
    cb(response);
  });
}

// https:graph.facebook.com/{user-id}?fields=checkins{tags,from,message,...}
function formatCheckinDataForDB(facebookResponse){
  var formattedData = [];
  console.log('fb response',facebookResponse);
  arrayOfCheckins = (facebookResponse.checkins) ? facebookResponse.checkins.data : [];
  arrayOfCheckins.forEach(function(item, index){
    if(item){
      var formattedItem = {
        fbId: item.id,
        checkin_date: item.data[index].created_time,

        place: {
          fbId: item.place.id,
          name: item.place.name,
          photo: null
        } || null,
        latitude: item.place.latitude,
        longitude: item.place.longitude,

        from: {
          name: item.from.name,
          fbId: item.from.id
        } || null,
        message: item.message || null,
        clique: item.tags.data || []
      };
    results.push(formattedItem);
    }
  });
  return formattedData;
}

return {
  get: getRequest,
  getMutual: getMutual,
  getPostLikes: getPostLikes
};
})();
;(function(window){
// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
  // The response object is returned with a status field that lets the
  // app know the current login status of the person.
  // Full docs on the response object can be found in the documentation
  // for FB.getLoginStatus().
  if (response.status === 'connected') {
    // Logged into your app and Facebook.
    testAPI();
  } else if (response.status === 'not_authorized') {
    // The person is logged into Facebook, but not your app.
    document.getElementById('status').innerHTML = 'Please log ' +
      'into this app.';
  } else {
    // The person is not logged into Facebook, so we're not sure if
    // they are logged into this app or not.
    document.getElementById('status').innerHTML = 'Please log ' +
      'into Facebook.';
  }
}

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
  FB.getLoginStatus(function(response) {
    statusChangeCallback(response);
  });
}

window.fbAsyncInit = function() {
  $.get('/fbconfig').then(function(id){
    console.log(id);
    console.log(typeof id);

    FB.init({
      appId      : id || appConfig.fbId,
      cookie     : true,  // enable cookies to allow the server to access
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v1.0' // use version 2.1
    });
    setTimeout(function(){
      checkLoginState();
    });
  })

    // Now that we've initialized the JavaScript SDK, we call
    // FB.getLoginStatus() from within checkLoginState().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

};

// Load the SDK asynchronously
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
// successful response adds property FB.dataGlobeUserLocation with latitude, longitude for initial user graph node
function testAPI() {
  console.log('Welcome!  Fetching your information.... ');
  FB.api('/me',
    function(response) {
      console.log('Successful login for: ' + response.name);
      document.getElementById('status').innerHTML =
        'Thanks for logging in, ' + response.name + '!';
      console.log('isloggedIn response:',response);

      FB.api('/fql',
        {
          q: "SELECT current_location.latitude, current_location.longitude, first_name, last_name, uid, pic_square FROM user WHERE uid = me()"
        },
        function(response){
          console.log('save user: ', response);
          $.post('/api/save-user', {user: response.data})
        }
      );
  });
}

})(window);
;$(function(){

  $("button.query").on("click", function(event){
    event.preventDefault();
    var query = event.currentTarget.id;
    if(query === 'mutualFriends'){
      FBData.getMutual()
    } else {
      FBData.get(query);  
    }
  });
});
