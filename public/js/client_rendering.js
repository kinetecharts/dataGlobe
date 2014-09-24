$(document).ready(function(){
	$.get('/api/get-friends').then(function(response){
		var friends = JSON.parse(response);
		friends = friends.data;
		setInterval(function(){
			if(friends.length){
				window.drawing.createGraph(friends.pop());
			}
		}, 0)
	});

  $('.mutual').on('click', function(){
    $.get('/api/get-user').then(function(response){
      friendList = JSON.parse(response).friends;
      var getMutual = function(idArray){
        var currentFriend = idArray.pop();
        var payload = {id: currentFriend};
        $.post('/api/get-mutual', payload).then(function(response){
          console.log('response: ', response)
          var mutualList = JSON.parse(response);
          var loadMutual = function(list){
            var currentMutual = list.pop();
            window.drawing.addEdge(currentFriend, currentMutual);
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
      getMutual(friendList);
    })
  });

  $('.connect').on('click', function(){
    $.get('/api/get-user').then(function(response){
      var user = JSON.parse(response);
      window.drawing.addUser(user, true);
    })
  });

  $('.fly').on('click', function(){
    $.get('/api/get-user').then(function(response){
      var friends = JSON.parse(response).friends;
      var current;
      var $info = $('.info-data');
      setInterval(function(){
        current = friends.pop();
        window.drawing.goToNode(current);
        $info.empty();
        FBData.get('newsFeed',current, function(data){
          data = JSON.parse(data);
          if(data.posts){
            data = data.posts.data;
            console.log('posts: ',data)
            for(var i = 0; i < data.length; i++){
              var post = data[i];
              console.log('post: ', post.type);
              // display posts
              displayInfo(post);
            }
          }
        })
      }, 2000)
    })
  });
  $('.newsFeed').on('click', function(){
    FBData.get('newsFeed', 'me', function(data){
      data = JSON.parse(data);
      console.log(data);
    })
  });
///// for info display //////////////////////////////////////////////////
  var $infoHTML = $('<div class="panel panel-default info-box"><div class="panel-heading info-header"></div><div class="panel-body info-data"></div></div>');
  var displayInfo = function(post){
    var $infoHTMLClone = $infoHTMl.clone();
    var $info = $infoHTMLClone.find('.info-data');
    if(post.message){
      $info.append('<p>'+post.message+'</p>')
      $info.append('<p>'+post.created_time+'</p>')
    }
    if(post.picture){
      $info.append('<img src="'+post.picture+'"></img>');
      $info.append('<p>'+post.created_time+'</p>')
    }
    if(post.story){
      $info.append('<p>'+post.story+'</p>');
      if(post.link){
        $info.append('<a href="'+post.link+'">Take a Look</a>')
      }
    }
    $('panel-wrapper').append($infoHTMLCLone);
    $infoHTMLClone.fadeOut("8000");
  }
//////////////////////////////////////////////////////////////////////////
});