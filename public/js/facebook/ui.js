$(function(){

  $("button.query").on("click", function(event){
    event.preventDefault();
    var query = event.currentTarget.id;
    if(query === 'mutualFriends'){
      FBData.getMutual()
    } else {
      FBData.get(query);  
    }
  });
});
