var LoginModel = Backbone.Model.extend({
  initialize: function(){
    this.set('loginStatus', 'unknown');
    this.set('rendered', false);
  }
});
