$(document).ready(function(){

  var loginModel = new (Backbone.Model.extend({

    intialize: function(){
      this.set('loginStatus', 'unknown');
    }
  }));

  var appView = new (Backbone.View.extend({

    model: loginModel,

    initialize: function(){
      var appViewContext = this;
      // check Facebook login status every once and a while to check which view to display
      setInterval(function(){
        if(FB){
          FB.getLoginStatus(function (response){
            var currentStatus = appViewContext.model.get('loginStatus', status);
            var newStatus = response.status;
            (newStatus !== currentStatus) ? appViewContext.model.set('loginStatus', status) : console.log('unchanged status');
            console.log(newStatus, currentStatus);
          });
        }
      }, 100);
    }

  }));

});