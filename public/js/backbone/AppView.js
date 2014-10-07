var loginModel = new (Backbone.Model.extend({
  initialize: function(){
    this.set('loginStatus', 'unknown');
    this.set('rendered', false);
  }
}));


var appView = new (Backbone.View.extend({

  model: loginModel,

  initialize: function(){
    this.keepTabsOnLoginState();
  },

  // check Facebook login status every once and a while to check which view to display
  keepTabsOnLoginState: function (){
    var appViewContext = this;
    setInterval(function(){
      if(FB){
        FB.getLoginStatus(function (response){
          // var currentStatus = appViewContext.model.get('loginStatus');
          var newStatus = response.status;
          // if(newStatus !== currentStatus){
          //   appViewContext.model.set('loginStatus', newStatus);
          // }
          if(newStatus === 'connected'){
            appViewContext.render('globeView');
          }
          if(newStatus !== 'connected'){
            appViewContext.render('loginView');
          }
        });
      }
    }, 100);
  },

  render: function(view){
    console.log('in render');
    if(view === 'globeView'){
      if(this.model.get('rendered') === false){
        initialize3d();
        this.model.set('rendered', true);
      }
    } else if(view === 'loginView'){
      console.log('render', view);
      $('body').html('scoobydoo');
    }
  }

}));

