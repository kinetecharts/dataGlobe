var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var path = require('path');
var router = require('./router.js');

app.use(bodyParser.urlencoded({
	extended: true,
	limit: '50mb'
}));
app.use(express.static(path.join(__dirname, '/../public')));
app.set('views', __dirname + '/../views');
app.engine('html', require('ejs').renderFile);

app.get('/', function(req, res){
	res.render('index.html');
})

app.use('/api/', router);



module.exports = app;