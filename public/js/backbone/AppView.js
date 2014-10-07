// var loginModel = new (Backbone.Model.extend({

//   initialize: function(){
//     this.set('loginStatus', 'unknown');
//   }
// }));
// check Facebook login status every once and a while to check which view to display
function keepTabsOnLoginState(){
  setInterval(function(){
    if(FB){
      FB.getLoginStatus(function (response){
        console.log('status check callback:', response.status);
        // var currentStatus = appViewContext.model.get('loginStatus');
        var newStatus = response.status;
        // if(newStatus !== currentStatus){
        //   appViewContext.model.set('loginStatus', newStatus);
        // }
        if(newStatus === 'connected'){
          console.log('the view is globeView');
          appViewContext.render('globeView');
        }
        if(newStatus !== 'connected'){
          console.log('the view is loginView');
          appViewContext.render('loginView');
        }
      });
    }
  }, 100);
}


// var sphere_script = document.createElement('script');
// sphere_script.src = 'js/sphere_graph.js';
// document.body.appendChild(sphere_script);

var appView = new (Backbone.View.extend({
  // model: loginModel,

  initialize: function(){
    var appViewContext = this;

    keepTabsOnLoginState();
  },

  render: function(view){
    console.log('in render');
    if(view === 'globeView'){
      console.log('render', view);
      var sphere_script = document.createElement('script');
      var rendering_script = document.createElement('script');
      sphere_script.src = 'js/sphere_graph.js';
      rendering_script.src = 'js/client_rendering.js';
      document.body.appendChild(sphere_script);
      document.body.appendChild(rendering_script);
    } else if(view === 'loginView'){
      console.log('render':, view);
      $('body').html('scoobydoo');
    }
  }

}));

