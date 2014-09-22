var FBData = (function(){

// array to store formatted data from an API response
var lastResponse;

var resourceEndpointMap = {
  currentLocations: "/fql",
  checkins: "/me/friends",
  posts: null
};

var queryMap = {
  currentLocations: null,
  checkins: null,
  posts: null
};

////////////////////////////////////////////////// queries ////////////////////////////////////////

// get user and user_friends current locations and a pic
var locationQuery = [ "SELECT name, current_location.latitude, current_location.longitude, pic_square ",
"FROM user ",
"WHERE uid in (",
"SELECT uid2 FROM friend ",
"WHERE uid1 = me())" ]

queryMap["currentLocations"]  = locationQuery.join('');

// get checkins that a user or user_friends is associated with
queryMap["checkins"]          = "name,checkins{created_time,place,message}";

////////////////////////////////////////////// end of queries /////////////////////////////////////

function getRequest(query){
  // generate a parameter object for either FQL or Graph API syntax
  var queryType = resourceEndpointMap[query];
  var queryParameters = {};
  if(queryType === "/fql"){
    queryParameters["q"] = queryMap[query];
  } else {
    queryParameters["fields"] = queryMap[query];
  }
  // querying attempt using FQL + facebook API
  FB.api(
    resourceEndpointMap[query],
    queryParameters,

    // callback when async http request responds
    function(response){
      lastResponse = null;
      if(response && Array.isArray(response.data)){
        lastResponse = formatDataForGraph(response.data);
      }
      if(lastResponse){
      setInterval(function(){
        if(lastResponse.length){
          window.drawing.createGraph(lastResponse.splice(0,1))
        }
      }, 10)
      }
    }
  );

}
// currently unused function
function formatDataForGraph(arrayOfAPIReesults){
  var results = [];
  arrayOfAPIReesults.forEach(function(item, index){

    var formattedItem = {
      hometown: {
        name: null,
        coords: {
          lat: null,
          lng: null
        }
      },
      location: {
        name: null,
        coords: {
          latitude: null,
          longitude: null
        }
      },
      picture: null
    };

    formattedItem.location.name = (item.location) ? item.location.name : null;
    formattedItem.location.coords.latitude = (item.current_location) ? item.current_location.latitude : null;
    formattedItem.location.coords.longitude = (item.current_location) ? item.current_location.longitude : null;

    formattedItem.hometown.name = (item.hometown) ? item.hometown.name : null;
    formattedItem.picture = (item.picture) ? item.picture.data.url : null;

    results.push(formattedItem);
  });
  return results;
}

return {
  lastResponse: lastResponse,
  get: getRequest
};
})();