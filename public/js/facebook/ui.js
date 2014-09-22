$(function(){

  $("button.query").on("click", function(event){
    event.preventDefault();

    var query = event.currentTarget.id;

    FBData.get(query);
  });
});
