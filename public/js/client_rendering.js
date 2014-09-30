var drawing = new Drawing.SphereGraph({numNodes: 50, showStats: true, showInfo: true});
	$.get('/api/get-friends').then(function(response){
		var friends = JSON.parse(response);
		friends = friends.data;
		setInterval(function(){
			if(friends.length){
				drawing.createGraph(friends.pop());
			}
		}, 0)
	});

  $('.mutual').on('click', function(){
    $.get('/api/get-user').then(function(response){
      friendList = JSON.parse(response).friends;
      getMutual(friendList);
    })
  });

  $('.connect').on('click', function(){
    $.get('/api/get-user').then(function(response){
      var user = JSON.parse(response);
      drawing.addUser(user, true);
    })
  });

  $('.fly').on('click', function(){
    $.get('/api/get-user').then(function(response){
      var friends = JSON.parse(response).friends;
      var current;
      var currentNode;
      var i = 0;
      setInterval(function(){
        if(i === friends.length){
          i = 0;
        }
        current = friends[i];
        currentNode = drawing.getNode(current);
        while(!currentNode){
          i += 1;
          if(i === friends.length){
            i = 0;
          }
          current = friends[i];
          currentNode = drawing.getNode(current);
        }
        drawing.goToNode(current);
        FBData.get('userPhotos',current, function(data){
          data = JSON.parse(data);
          console.log('data: ', data)
          var getPhotos = function(array){
            setInterval(function(){
              if(array.length){
                var current = array.pop();
                FBData.get('getPhoto', current.id, function(photoData){
                  photoData = JSON.parse(photoData);
                  displayInfo(photoData);
                })
              }
            }, 1000)
          }
          if(data.photos){
            getPhotos(data.photos.data);
          }
          // display posts
        })
        i += 1;
      }, 5000)
    })
  });
  $('.newsFeed').on('click', function(){
    FBData.get('newsFeed', 'me', function(data){
      data = JSON.parse(data);
      console.log(data);
    })
///// for info display //////////////////////////////////////////////////
  var infoHTMLlog = [];
  var $infoHTML = $('<div><div class="info-data img-box"></div></div>');
  function displayInfo(data){
    var $infoHTMLClone = $infoHTML.clone();
    var $info = $infoHTMLClone.find('.info-data');
    //var header = $infoHTMLClone.find('.info-header');
    if($('.panel-wrapper').children().length){
      $($('.panel-wrapper').children()[0]).addClass('target');
    }
    $info.append('<img class="info-img animated zoomIn" src="'+data.source+'"></img>');
    $('.panel-wrapper').prepend($infoHTMLClone);
    infoHTMLlog.push($infoHTMLClone);
    if(infoHTMLlog.length > 2){
      infoHTMLlog[0].fadeOut("slow");
      infoHTMLlog.shift();
    }
  }
//////////////////////////////////////////////////////////////////////////
});

function getMutual (idArray){
  if(Array.isArray(idArray)){
    var currentFriend = idArray.pop();  
  } else {
    var currentFriend = idArray;
    idArray = [];
  }
  var payload = {id: currentFriend};
  $.post('/api/get-mutual', payload).then(function(response){
    var mutualList = JSON.parse(response);
    if(mutualList.length){
      loadMutual(mutualList, currentFriend);
    }
  })
  if(idArray.length){
      return getMutual(idArray);
  } else {
      return;
  }
}

function loadMutual(list, currentFriend){
  var currentMutual = list.pop();
  drawing.addEdge(currentFriend, currentMutual);
  if(list.length){
    return loadMutual(list, currentFriend);
  } else {
    return;
  }
}
  // var $infoHTML = $('<div class="panel panel-default info-box"><div class="panel-heading info-header"></div><div class="panel-body info-data"></div></div>');
  // var displayInfo = function(data){
  //   var $infoHTMLClone = $infoHTML.clone();
  //   var $info = $infoHTMLClone.find('.info-data');
  //   var header = $infoHTMLClone.find('.info-header');
  //   if(data.posts){
  //     var posts = data.posts.data;
  //     var num = Math.min(posts.length, 2);
  //     for(var i = 0; i < num; i++){
  //       var post = posts[i];
  //       header.text(post.from.name);
  //       if(post.message){
  //         $info.append('<p>'+post.message+'</p>')
  //         $info.append('<p>'+post.created_time+'</p>')
  //       }
  //       if(post.picture){
  //         $info.append('<img class="info-img" src="'+post.picture+'"></img>');
  //         $info.append('<p>'+post.created_time+'</p>')
  //       }
  //       if(post.story){
  //         $info.append('<p>'+post.story+'</p>');
  //         if(post.link){
  //           $info.append('<p><a href="'+post.link+'">Take a Look</a><p>')
  //           }
  //         }
  //       }
  //     } else {
  //       var name = drawing.getCurrent().data.name;
  //       header.text(name);
  //       $info.append('<p>No new updates.</p>');
  //     }
  //   $('.panel-wrapper').prepend($infoHTMLClone);
  //   infoHTMLlog.push($infoHTMLClone);
  //   if(infoHTMLlog.length > 2){
  //     infoHTMLlog[0].fadeOut("slow");
  //     infoHTMLlog.shift();
  //   }
  // }
