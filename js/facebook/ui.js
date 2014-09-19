$(function(){

  var queryMap = {
    getLocations: "currentLocations",
    getCheckins: "checkins",
    getPosts: "posts"
  }

  $("button.query").on("click", function(event){
    event.preventDefault();

    var query = queryMap[event.currentTarget.id];

    FBData.get(query);
  });
});
