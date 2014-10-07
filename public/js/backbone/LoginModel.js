var loginModel = new (Backbone.Model.extend({
  initialize: function(){
    this.set('loginStatus', 'unknown');
    this.set('rendered', false);
  }
}));
