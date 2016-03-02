var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Twig = require('twig');
var twig = Twig.twig;
var swig = require('swig');
var routes = require('./routes/index');
var users = require('./routes/users');
var nunjucks = require('nunjucks');
var sitemuse = require('./routes/sitemuse');
var app = express();
var fs = require('fs');
var _ = require('lodash')
app.set('views', path.join(__dirname, 'views'));
// view engine setup

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

//app.set('view engine', 'twig');
app.set('view engine', 'html');
//app.engine('html', swig.renderFile);


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', routes);
//app.use('/users', users);
app.use('/sitemuse', sitemuse);

app.all('*', function(req, res, next) {
  var viewsDir = fs.readdirSync('./views/pages');
  var dataDir = fs.readdirSync('./fixture/pages');
  var reqPath = _.compact(req.url.split('/'));
  var d = {};

  // find page
  var targetPage = _.find(viewsDir, function(n) {
    return n == reqPath + '.html'
  });

  // find page Data
  var targetData = _.find(dataDir, function(n) {
    return n == reqPath + '.json'
  });
  
  if (!!targetData) {
    d = require('./fixture/pages/' + targetData);
  };  

  if (!!targetPage) {
    res.render('pages/' + targetPage, {Page: d, Export: false})
  } else {
    throw new Error('404 Page '+ reqPath + ' Not Found')
  }
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404;
  next(err);
});


// watch for file changes in images folder
var watcher = require('./modules/watcher')();



// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('admin/error.html', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('admin/error.html', {
    message: err.message,
    error: {}
  });
});
// watcher


module.exports = app;
