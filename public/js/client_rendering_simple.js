$(document).ready(function(){
  var drawing = new Drawing.SimpleGraph({numNodes: 50, showStats: false, showInfo: true});
  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);
    console.log('user: ', user)
    drawing.createGraph(user, true);
    $.get('/api/get-friends').then(function(response){
      var friends = JSON.parse(response);
      friends = friends.data;
      setInterval(function(){
        if(friends.length){
          drawing.createGraph(friends.pop());
        }
      }, 500)
    });
  });
});
