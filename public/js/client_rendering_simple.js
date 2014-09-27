var userNode;

$(document).ready(function(){
  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);
    var friendsList = user.friends;
    console.log('user: ', user)
    userNode = window.drawing.insertNode(user, true);
    $.get('/api/get-friends').then(function(response){
      //get all friends from database and store in hashTable with fbId as key
      //for later reference
      var friends = JSON.parse(response);
      friends = friends.data;

      // setInterval(function(){
      //   if(friends.length){
      //     drawing.createGraph(friends.pop());
      //   }
      // }, 500)

      var storage = {};
      for(var i = 0; i < friends.length; i++){
        var current = friends[i];
        storage[current.fbId] = current;
      }
    });
  });
  $('.go').on('click', function(){
    FBData.get('newsFeed', 'me', function(data){
    var myPosts = JSON.parse(data).posts.data;
    var investigatePosts = function(posts){
      var current = posts.pop();
      current = window.drawing.insertNode(current);
      window.drawing.addEdge(userNode, current, 'yellow')
      FBData.getPostLikes(current.id, function(data){
        data = data.data;
        for(var l = 0; l < data.length; l++){
          var liker = data[l];
          liker = window.drawing.insertNode(liker);
          window.drawing.addEdge(current, liker, 'blue');
        }
        if(posts.length){
          return investigatePosts(posts);
        } else {
          return;
        }
      })
    }
    investigatePosts(myPosts);
    })    
  })

});
