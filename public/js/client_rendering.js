var initialize3d = function(){
  var drawing = new Drawing.SphereGraph({numNodes: 50, showStats: true, showInfo: true});

  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);
    friendsList = user.friends;
    userNode = drawing.createGraph(user, true);
  })

	$.get('/api/get-friends').then(function(response){
		var friends = JSON.parse(response);
		friends = friends.data;
		setInterval(function(){
			if(friends.length){
				drawing.createGraph(friends.pop());
			}
		}, 0)
	});
}