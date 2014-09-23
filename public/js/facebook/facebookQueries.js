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
          data = formatCheckinDataForDB(Qresponse);
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
  get: getRequest
};
})();