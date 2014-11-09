var userNode;
var friendsList;
$(document).ready(function(){

  // $('body').mousemove(function(event){
  //   window.drawing.onMouseMove(event);
  // })

  $.get('/api/get-user').then(function(response){
    var user = JSON.parse(response);
    friendsList = user.friends;
    userNode = window.drawing.insertNode(user, true);
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
      $('.info-header').text('Ready to Go!');
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
          if(window.drawing.getNode(liker.id) !== undefined){
            liker = window.drawing.getNode(liker.id)
          } else {
            liker = window.drawing.insertNode(liker);  
          }
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
  $('.fly').on('click', function(){
    var nodes = window.drawing.getAllNodes();
    setInterval(function(){
      var current = nodes.pop();
      window.drawing.goToNode(current.id);
    }, 5000)
  })

    $('.mutual').on('click', function(){
      var getMutual = function(idArray){
        var currentFriend = idArray.pop()
        var inGraph = window.drawing.getNode(currentFriend);
        if(inGraph !== undefined){
          currentFriend = inGraph;
        } else {
          currentFriend = window.drawing.insertNode(currentFriend);
        }
        window.drawing.addEdge(currentFriend, userNode, 'red');
        var payload = {id: currentFriend.id};
        $.post('/api/get-mutual', payload).then(function(response){
          var mutualList = JSON.parse(response);

          var loadMutual = function(list){
            var currentMutual = list.pop();
            var inGraph = window.drawing.getNode(currentMutual);
            if(inGraph !== undefined){
              currentMutual = inGraph;
            } else {
              currentMutual = window.drawing.insertNode(currentMutual);
            }
            window.drawing.addEdge(currentFriend, currentMutual, 'green');
            if(list.length){
              return loadMutual(list);
            } else {
              return;
            }
          }

          if(mutualList.length){
            loadMutual(mutualList);
          }
        })

        if(idArray.length){
            return getMutual(idArray);
        } else {
            return;
        }
      }
      getMutual(friendsList);
  });

});
