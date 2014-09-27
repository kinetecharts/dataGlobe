//rendering all friends is not possible when friends number in the hundreds
//perhaps go through all user posts and first render friends that like the posts
//then go through friends posts and render posts that mention/are with user

$(document).ready(function(){
  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);
    var friendsList = user.friends;
    console.log('user: ', user)
    window.drawing.createGraph(user, true);
    $.get('/api/get-friends').then(function(response){
      //get all friends from database and store in hashTable with fbId as key
      //for later reference
      var friends = JSON.parse(response);
      friends = friends.data;
      var storage = {};
      for(var i = 0; i < friends.length; i++){
        var current = friends[i];
        storage[current.fbId] = current;
      }
      FBData.get('newsFeed', 'me', function(data){
      var myPosts = JSON.parse(data);
      var investigatePosts = function(posts){
        var current = posts.pop();
        FBData.get('postLikes', '', function(data){
          //deal with data
          if(posts.length){
            return investigatePosts(posts);
          } else {
            return;
          }
        })
      }
      })
    });
  });
});