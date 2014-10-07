var appView = new (Backbone.View.extend({

  model: loginModel,

  initialize: function(){
    var appViewContext = this;
    this.loginView = new LoginView;
    this.globeView = new GlobeView;
    // this.keepTabsOnLoginState();
    this.model.on('change:loginStatus', function (model){
      var newStatus = model.get('loginStatus');
      if(newStatus === 'connected'){
        appViewContext.render('globeView');
        return;
      }
      if(newStatus !== 'connected'){
        appViewContext.render('loginView');
        return;
      }
      appViewContext.render('loginView');
    });
  },

  // check Facebook login status every once and a while to check which view to display
  // keepTabsOnLoginState: function (){
  //   var appViewContext = this;
  //   setInterval(function(){
  //     if(FB){
  //       FB.getLoginStatus(function (response){
  //         // var currentStatus = appViewContext.model.get('loginStatus');
  //         var newStatus = response.status;
  //         // if(newStatus !== currentStatus){
  //         //   appViewContext.model.set('loginStatus', newStatus);
  //         // }
  //         if(newStatus === 'connected'){
  //           appViewContext.render('globeView');
  //         }
  //         if(newStatus !== 'connected'){
  //           appViewContext.render('loginView');
  //         }
  //       });
  //     }
  //   }, 100);
  // },

  render: function(view){
    if(view === 'globeView'){
      $('body').html('globe');
    } else if(view === 'loginView'){
      $('body').html('Log');
    }
  }

}));

