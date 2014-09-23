var queryStringData = {
	friendsQuery: {
		queryString: [ "SELECT uid, name, current_location.latitude, current_location.longitude, pic_square ","FROM user ","WHERE uid in (","SELECT uid2 FROM friend ","WHERE uid1 = me())" ],
		url: '/api/save-friends',
		endpoint: '/fql'
	},
	timelineQuery: {
		queryString: [],
		url: '/api/save-timeline'
	},
  checkinsQuery: {
    queryString: ['checkins{place,id,from,created_time,message,tags}'],
    type: 'checkins',
    url: '/api/save-checkins',
    endpoint: '/me'
  }
}