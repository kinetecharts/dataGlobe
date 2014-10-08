var AppView = Backbone.View.extend({

  initialize: function(){
    var appViewContext = this;
    this.model.on('render', function (model){
      appViewContext.render('globeView');
    });
  },

  render: function(view){
    if(view === 'globeView'){
      setTimeout(function(){
        $('.loginView').empty();
        $('.loginView').append('<div class="panel-wrapper"></div>');
        initialize3d();
      }, 2000)
    }
  }
});
