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

  var nextFunc;
  flyToNext(function(next){
    nextFunc = next;
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

  $(document).on('keydown', function( event ){
    if(event.which === 32){
      nextFunc();
    }
    else if(event.which === 13){
      getAllPhotos();
    }
    else if(event.which === 87){
      var current = window.currentId
      FBData.get('newsFeed', current, function(data){
        var myPosts = JSON.parse(data);
        if(myPosts.posts){
          myPosts = myPosts.posts.data;
          investigatePosts(current, myPosts);
        }
      })
    }
  })


  // $('.fly').on('click', function(){
  //   $.get('/api/get-user').then(function(response){
  //     var friends = JSON.parse(response).friends;
  //     var current;
  //     var currentNode;
  //     var i = Math.floor(Math.random()*friends.length);
  //     setInterval(function(){
  //       if(i === friends.length){ i = 0; }

  //       current = friends[i];
  //       currentNode = drawing.getNode(current);

  //       while(!currentNode){
  //         i += 1;
  //         if(i === friends.length){
  //           i = 0;
  //         }
  //         current = friends[i];
  //         currentNode = drawing.getNode(current);
  //       }
  //       drawing.goToNode(current);
  //       getMutual(current);
  //       FBData.get('userPhotos',current, function(data){
  //         data = JSON.parse(data);
  //         console.log('data: ', data)
  //         if(data.photos){
  //           getPhotos(data.photos.data);
  //         }
  //         // display posts
  //       })
  //       i += 1;
  //     }, 5000)
  //   })
  // });

  $('.newsFeed').on('click', function(){
    FBData.get('newsFeed', 'me', function(data){
      data = JSON.parse(data);
      console.log(data);
    })
  })
///// for info display //////////////////////////////////////////////////
  var infoHTMLlog = [];
  var $infoHTML = $('<div><div class="info-data img-box"></div></div>');

  function displayInfo(data, isUrl){
    var key;
    if(isUrl){
      key = data.url;
    } else {
      key = data.source;
    }
    var $infoHTMLClone = $infoHTML.clone();
    var $info = $infoHTMLClone.find('.info-data');

    //var header = $infoHTMLClone.find('.info-header');
    if($('.panel-wrapper').children().length){
      $($('.panel-wrapper').children()[0]).addClass('zoomOut');
    }
    $('.panel-wrapper').empty();
    $info.append('<img class="info-img animated zoomIn" src="'+key+'"></img>');
    $('.panel-wrapper').append($infoHTMLClone);
    infoHTMLlog.push($infoHTMLClone);
    if(infoHTMLlog.length > 2){
      infoHTMLlog[0].fadeOut("slow");
      infoHTMLlog.shift();
    }
  }
//////////////////////////////////////////////////////////////////////////
function flyToNext(cb){
  $.get('/api/get-user').then(function(response){
      var friends = JSON.parse(response).friends;
      var last;
      cb(function(){
        var i = Math.floor(Math.random()*friends.length);
        current = friends[i];
        currentNode = drawing.getNode(current);
        while(!currentNode || current === last){
          i += 1;
          if(i === friends.length){
            i = 0;
          }
          current = friends[i];
          currentNode = drawing.getNode(current);
        }
        //go to next user on globe and draw mutual friends
        window.currentId = current
        drawing.goToNode(current);
        last = current;
        getMutual(current);
        getPic(current);
      })
  })
}

var getAllPhotos = function(id){
  id = id || window.currentId;
  FBData.get('userPhotos',current, function(data){
    //get photos of current friend
    data = JSON.parse(data);
    console.log('data: ', data)
    if(data.photos){
      //if there are photos, display them
      getPhotos(data.photos.data);
    }
  })
}

var getPhotos = function(array){
  //every second, get a photo from FB and display
  setInterval(function(){
    if(array.length){
      var current = array.pop();
      FBData.get('getPhoto', current.id, function(photoData){
        photoData = JSON.parse(photoData);
        displayInfo(photoData);
      })
    }
  }, 1000)
};

window.getProfilePic = function(id){
  console.log('getprofilepic:', id);
  if(id === id){
    getPic(id);  
  }
};

var getPic = function(id){
  FBData.get('getProfilePic', id, function(photo){
    photo = JSON.parse(photo);
    photo = photo.picture.data;
    displayInfo(photo, true);
  })
}

function getMutual (idArray, connectUser){
  if(connectUser && drawing !== undefined){
    var node = drawing.getNode(idArray);
    drawing.connectToUser(node);
  }
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
  drawing.addEdge(currentFriend, currentMutual, 'red', true);
  if(list.length){
    return loadMutual(list, currentFriend);
  } else {
    return;
  }
}    

var investigatePosts = function(id, posts){
  drawing.moveOut()
  setInterval(function(){
    if(posts.length){
      var current = posts.pop();
      current = drawing.addPost(id, current, drawing);
      FBData.getPostLikes(current.id, function(data){
        data = data.data;
        for(var l = 0; l < data.length; l++){
          var liker = data[l];
          liker = drawing.getNode(liker.id);
          if(drawing.getNode(liker.id) !== undefined){
          drawing.addEdge(current.id, liker.id, 'green', true);
          } 
        }
        if(posts.length){
          return investigatePosts(posts);
        } else {
          return;
        }
      })
    }
  }, 300)
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
