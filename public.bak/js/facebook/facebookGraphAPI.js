(function(window){
// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
  // The response object is returned with a status field that lets the
  // app know the current login status of the person.
  // Full docs on the response object can be found in the documentation
  // for FB.getLoginStatus().

  // backbone model
  //loginModel.set('loginStatus', response.status);

  if (response.status === 'connected') {
    // Logged into your app and Facebook.
    testAPI();
  } else if (response.status === 'not_authorized') {
    // The person is logged into Facebook, but not your app.
    document.getElementById('status').innerHTML = 'Please log ' +
      'into this app.';
  } else {
    // The person is not logged into Facebook, so we're not sure if
    // they are logged into this app or not.
    document.getElementById('status').innerHTML = 'Please log ' +
      'into Facebook.';
  }
}

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
// It is attached to window so <fb-login> element can access it onload
window.checkLoginState = function() {
  FB.getLoginStatus(function(response) {
    statusChangeCallback(response);
  });
}

window.fbAsyncInit = function() {
  $.get('/fbconfig').then(function(id){

    FB.init({
      appId      : id || appConfig.fbId,
      status     : true,
      cookie     : true,  // enable cookies to allow the server to access
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v1.0' // use version 2.1
    });
    setTimeout(function(){
      checkLoginState();
    });
  })

    // Now that we've initialized the JavaScript SDK, we call
    // FB.getLoginStatus() from within checkLoginState().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

};

// Load the SDK asynchronously
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
// successful response adds property FB.dataGlobeUserLocation with latitude, longitude for initial user graph node
function testAPI() {
  FB.api('/me',
    function(response) {
      document.getElementById('status').innerHTML = 'Thanks for logging in, ' + response.name + '!';
      FB.api('/fql',
        {
          q: "SELECT current_location.latitude, current_location.longitude, first_name, last_name, uid, pic_square FROM user WHERE uid = me()"
        },
        function(response){
          $.post('/api/save-user', {user: response.data}, function(){
            login.trigger('render');
          });
          // globeView.render
            // clear out dom
            // load client_rendering
            // else login view
        }
      );
  });
}

})(window);
