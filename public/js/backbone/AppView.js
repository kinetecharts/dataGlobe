var AppView = Backbone.View.extend({

  initialize: function(){
    var appViewContext = this;
    this.loginView = new LoginView;
    this.globeView = new GlobeView;
    this.model.on('render', function (model){
      appViewContext.render('globeView');
    });
  },

  render: function(view){
    if(view === 'globeView'){
      $('body').empty();
      initialize3d();
    }
  }

});

