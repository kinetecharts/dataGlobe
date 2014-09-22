var FBData = (function(){

// array to store formatted data from an API response
var lastResponse;

var resourceEndpointMap = {
  firends: "/fql",
  checkins: "/me/friends",
  posts: null
};


////////////////////////////////////////////////// queries ////////////////////////////////////////

// get user and user_friends current locations and a pic
var queryMap = queryStringData;
////////////////////////////////////////////// end of queries /////////////////////////////////////

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
  // querying attempt using FQL + facebook API
  FB.api(
    queryType,
    queryParameters,

    // callback when async http request responds
    function(Qresponse){
      if(Qresponse){
        var data = JSON.stringify(Qresponse)
        $.post(queryData.url, {friends: data}).then(function(response){
          console.log(response);
        })
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