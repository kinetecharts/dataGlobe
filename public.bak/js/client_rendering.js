var initialize3d = function(){
  drawing = new Drawing.SphereGraph({numNodes: 50, showStats: true, showInfo: true});
  // this will kickoff Facebook API get requests and subsequent posts to app server
  // for data needed by Graph.js
  FBData.get('friendsQuery', function(){

  setTimeout(function(){
    FBData.getMutual();
  },100);
  // this will kickoff WebGL rendering
  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);

    // TODO: creategraph->addNode or addUserNode
    userNode = drawing.createGraph(user, true);
  })

	$.get('/api/get-friends').then(function(response){
		var friends = JSON.parse(response);
		friends = friends.data;
		setInterval(function(){
			if(friends.length){
				drawing.createGraph(friends.pop());
			}
      /*
      TODO: bjhb
      check if friends list empty && maybe 15s later then clear interval
      var idleTime =
      if(friends.length){
        drawing.createGraph(friends.pop());
      } else if(friends.length === 0 && idleTime){

      }
      */
		}, 0)
	});

  });

}
