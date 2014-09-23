var filter = function(array){
  var results = [];
  for(var i = 0; i < array.length; i++){
    results.push(array[i].id)
  }
  return results;
}

var FBData = (function(){

var queryMap = queryStringData;

function getRequest(query){
  var queryData = queryMap[query];
  // generate a parameter object for either FQL or Graph API syntax
  var queryType = queryData.endpoint;
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
          postFetchNextPostCheckinData(Qresponse);
        }
        data = data || Qresponse;
        payload = JSON.stringify(data)
        $.post(queryData.url, {response: payload}).then(function(response){
          console.log('ajax success:', queryData.url, response);
        })
      }
    }
  );
}

function postFetchNextPostCheckinData(initialGetResponse){
  if(initialGetResponse.next){
    var nextPage = initialGetResponse.next;
    var data = formatCheckinDataForDB(initialGetResponse);
    console.table(data);
    setTimeout(function(data){
      $.get(nextPage,
        function(nextResponse){
          console.table('paginated response:', nextResponse);
          postFetchNextPostCheckinData(nextResponse);
        }
      );
    });
  }
}

<<<<<<< HEAD
=======
function getMutual(){
  $.get('/api/get-friends').then(function(response){
    console.log(response);
    response = JSON.parse(response);
    var friends = response.data;
    var eachFriend = function(friendsArray){
      var current = friendsArray.pop();
      var id = current.fbId;
      FB.api('/me/mutualfriends/'+id, function(response){
        var mutuals = filter(response.data);
        var payload = {userB: id, mutuals: mutuals}
        $.post('/api/save-mutual', payload).then(function(response){
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
>>>>>>> 8137ca25e593c49deaf3c4490ce40e5311d77fdb
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
  getMutual: getMutual
};
})();