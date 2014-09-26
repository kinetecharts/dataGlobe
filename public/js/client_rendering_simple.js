$(document).ready(function(){
  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);
    window.drawing.createGraph(user, true);
    $.get('/api/get-friends').then(function(response){
      var friends = JSON.parse(response);
      friends = friends.data;
      setInterval(function(){
        if(friends.length){
          window.drawing.createGraph(friends.pop());
        }
      }, 0)
    })
});