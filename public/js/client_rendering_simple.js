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
      var friends = JSON.parse(response);
      friends = friends.data;
      setInterval(function(){
        if(friends.length){
          window.drawing.createGraph(friends.pop());
        }
      }, 200)
    });
  });
});