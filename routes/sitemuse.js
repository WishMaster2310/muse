var express = require('express');
var router = express.Router();
//var swig = require('swig');
//var Twig = require('twig');
//var twig = Twig.twig;

var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var path = require('path');
var crypto = require('crypto');
var async = require('async');
var colors = require('colors');
var nunjucks = require('nunjucks');
var IMAGES_DIR = './public/images/';
var MSMAP_FILE = path.join(__dirname, "../fixture/msmapping.json");
var MSMAP = require(MSMAP_FILE);
var VIEWS_PATH = './views/';
var FIXTURE_PATH = './fixture/';
var EXPORT_PAGES = path.join(__dirname,  '../export/pages');
var EXPORT_FRAGMENTS = path.join(__dirname,  '../export/fragments');
var cheerio = require('cheerio');

var Page = function(arguments) {
  this.name = arguments.name;
  this.group = arguments.group;
  this.origin = arguments.origin; 
  this.status = arguments.status || 'new';
  this.fixture = arguments.fixture || false;  
  this.msid = arguments.msid || '';
  this._id = crypto.randomBytes(20).toString('hex');
  this.ctime = Date.now();
};

var MSImage = function(arguments) {
  this.name = arguments.name;
  this.size = 0;
  this.path = null;
  this.msid = arguments.msid || '';
  this._id = crypto.randomBytes(20).toString('hex');
};


function createPage (page) {
  var itemGroup = page.group;
  var viewsPath =  path.join(VIEWS_PATH, itemGroup, page.name + '.twig');
  var fixturePath = path.join(FIXTURE_PATH, itemGroup, page.name + '.json');
  var viewsOrigin = path.join(VIEWS_PATH, 'proto', page.origin + '.twig')

  if (!page.origin) {
    viewsOrigin = path.join(VIEWS_PATH, 'proto', '__' +  page.group + '.twig');
  }

  if (_.findIndex(MSMAP[itemGroup], {name: page.name}) < 0) {

    fs.createReadStream(viewsOrigin).pipe(fs.createWriteStream(viewsPath));

    // Создаем фикстуру если надо и сохраняем
    if (page.fixture) {
      fs.writeFile(fixturePath, '{"name": ""}', function(err) {
        // Записываем в "Базу" (JSON)
        MSMAP[itemGroup].push(new Page(page));
        fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
      });
    } else {
      // Записываем в "Базу" (JSON)
      MSMAP[itemGroup].push(new Page(page));
      fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
    }

  } else {
    throw new Error('Name not uniq');
  }
}

function deletePage (arguments) {

  var group = arguments.group;
  var name = arguments.name;

  var viewsPath =  path.join(VIEWS_PATH, group, name + '.twig');
  var fixturePath =  path.join(FIXTURE_PATH, group, name + '.json');

  var marker = _.findIndex(MSMAP[group], { 'name': name });

  if (marker >= 0) {

    fs.unlink(viewsPath, function(err) {

      if(err) throw new Error('Remove Page Failure');

        // Удаляем запись из JSON 
        var kenny = _.remove(MSMAP[group], function(n) {
        return n.name === name
      });

      // Сохраняем JSON
        fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
      
      // Если у страницы была фикстура, удаляем и ее тоже
        if (kenny.fixture) fs.unlinkSync(fixturePath);

      // удаляем экспортый файлик
        var _export_file = path.join(__dirname,  '../export/', group, name + '.html');
        if (fs.existsSync(_export_file)) {fs.unlinkSync(_export_file)};
    });

  } else {
    throw new Error('Page not found');  
  }
}

function updateItem (arguments)  {
  var mod = arguments.group;

  var indx = _.findIndex(MSMAP[mod], { '_id': arguments._id});

  MSMAP[mod][indx].msid = arguments.msid;
  MSMAP[mod][indx].status = 'sync';

  fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
}

function removeImage (p) {
  fs.unlinkSync(p);
}   


/* GET API page. */
router.get('/', function(req, res, next) {
  res.render('admin/manager.twig', { title: 'Sitemuse' });
});



router.get('/addPage', function(req, res, next) {
  try  {
    createPage(req.query);
    res.send({}); 
  } catch (err) {
    console.log(err)
    res.send({error: err});
  }
});

router.get('/deletePage', function(req, res, next) {
  try  {
    deletePage (req.query);
    res.send({})
  } catch (err) {
    res.send({error: err.message});
  }
});


router.post('/uploadFiles', function(req, res, next) {
  console.log(req);
});


router.get('/getmapping', function(req, res, next) {
    res.send(MSMAP);
});


router.get('/updateItem', function(req, res, next) {
  try  {
    updateItem (req.query);
    res.send()
  } catch (err) {
    res.send({error: err});
  }
});


router.get('/removeImage', function(req, res, next) {
  try  {
    fs.unlinkSync(req.query.path);
    res.send({});
  } catch (err) {
    res.send({error: err});
  }
});


router.get('/export', function(req, res, next) {
  renderMusePage(function() {
    res.send({})
  }, next);
});

router.get('/sync', function(req, res, next) {
  syncWithMap(function() {
    res.send({'done': true})
  }, next);
});

router.post('/syncwithsitemuse', function(req, res, next) {
  // data = req.body.data
 // console.log(req.body);

  importData (req.body, function() {
    console.log("req.body")
  });
  
});



// ###################################
// Рендер и экспорт страницы для
// окружения SiteMuse
// Вся статика соберется в папке \export
// Именно от туда копипастим контент
// на страницы в SiteMuse
// !!! ОЧЕНЬ ВАЖНО: Сохранять нейминг. Полностью

function renderMusePage (callback, next) {
  //var path_pages = path.join(VIEWS_PATH, 'pages');
  //var path_fragments = path.join(VIEWS_PATH, 'fragments');

  var pages = MSMAP.pages;
  var fragments = MSMAP.fragments;
  var EXPORT = 'muse'

  // Создаем папки для статики, если оны отсутствуют
  if (!fs.existsSync(EXPORT_PAGES)) {fs.mkdirSync(EXPORT_PAGES);}
  if (!fs.existsSync(EXPORT_FRAGMENTS)) {fs.mkdirSync(EXPORT_FRAGMENTS);}


  async.waterfall([
      function (tick) {
        // Бежим по массиву страниц в базе 
        // и рендерим их
        async.each(pages, function(page, cb) {

          var _preRender = fs.readFileSync(path.join(__dirname,  '../views', 'pages', page.name + '.twig'), 'utf-8');
          var _tmp = path.join(__dirname,  '../views/_tmp', page.name + '.twig');

          injectFragments(_preRender, page.name, function() {
            // Передаем контекст из fixture, если он есть

            //var img = $(_tmp).find('img');
            //console.log(img, '- cherio result image');
            if (page.fixture) {
              var locals = JSON.parse(fs.readFileSync(path.join(__dirname,  '../fixture', 'pages', page.name + '.json'), 'utf8') )
              var content = nunjucks.render(_tmp, {Page: locals, Export: EXPORT});
            } else {
              var content = nunjucks.render(_tmp, {Export: EXPORT});
            }

            fs.writeFileSync(path.join(EXPORT_PAGES, page.name + '.html'), content);
            console.log('[SiteMuse]:'.green, (page.name + '.html').gray, 'successfully rendered'); 
            cb();

          });
        }, function(err){
            if ( err ) {
              console.log(err);
            } else{
              console.log(colors.green('[SiteMuse]: Pages export done successfully'));
            }
            tick()
        });
      },
      function (tick) {
        // Бежим по массиву фрагментов  в базе 
        // и рендерим их
        async.each(fragments, function(page, cb) {
          var _template = path.join(__dirname,  '../views', 'fragments', page.name + '.twig');
          var content = nunjucks.render(_template);

          fs.writeFileSync(path.join(EXPORT_FRAGMENTS, page.name + '.html'), content);
          console.log('[SiteMuse]:'.green, (page.name + '.html').gray, 'successfully rendered'); 
          cb();

          }, function(err){
            if ( err ) {
              console.log(err);
            } else{
              console.log('[SiteMuse]: Fragments export done successfully'.green);
            }
            tick();
        });
      },
      function (tick) {
        var exportPages = fs.readdirSync(EXPORT_PAGES);
          async.each(exportPages, function(p, cb) {

              var content = fs.readFileSync(path.join(EXPORT_PAGES, p), 'utf-8');
              var $ = cheerio.load(content); 

              $('img').each( function(index, el) {
                var src = $(el).attr('src') ;
                var filename = path.basename(src);
                var alt = $(el).attr('alt') || '';
                var datasrc = $(el).data('src')? true : false;
                console.log()

                var msid = _.result(_.find(MSMAP.images, function(item) {
                  return item.name === filename;
                }), 'msid');


                var replacement = '<mscom:image spritegroup="default" sprite="false" noheightwidth="true" md:payloadguid=' + msid + ' alt=' + alt + ' ></mscom:image>'
                $(el).replaceWith(replacement);
                //< usedatasource="false" >
           
              });

              fs.writeFile(path.join(EXPORT_PAGES, p), $.html(), function(err) {
                cb()
              });
              
          }, function(err){
              tick();
          });
      }
  ], function() {
    console.log('ddd')
    callback();

  });
};

// ###################################
// Удаляем страницы/фрагменты которых
// нет в файле msmspping.json
// Использовать крайне осторожно! =)

function syncWithMap (callback, next) {
  checkSyncedFolder('pages');
  checkSyncedFolder('fragments');
  callback();
};

function checkSyncedFolder (units) {
  var path_to_units = path.join(VIEWS_PATH, units);
  var units_list = fs.readdirSync(path_to_units);

  async.each(units_list, function(page, func) {
    var indx = _.findIndex(MSMAP[units], { 'name': path.parse(page).name});
    if ( indx === -1) {
      try{
        fs.unlinkSync(path.join(path_to_units, page));
        console.log('[SiteMuse]:'.green, (page).gray, 'successfully deleted'); 
      } catch(err){
        console.log('[SiteMuse ERROR]:'.red, err); 
      }
    }
  });
};

// ###################################
// Реплейсим Твиговский include с фрагментом 
// на mscom:contentinclude 
// и записываем в буферный файл

function injectFragments (content, pagename, cb) {
  //console.log(MSMAP.fragments, 'fr');

  var ctx = content;

  async.each(MSMAP.fragments, function(n, next) {
    var re = new RegExp('\\{\\%+\\s+include\\s+\\"..\\/fragments\\/'+ n.name +'.twig([^\\"]*)"[^\\}]*\\%\\}', 'g');
    var replacement = '<mscom:contentinclude ajaxrendered=\"false\" md:pageid=\"'+ n._id + '\" instancename=\"' + n.name + '\"></mscom:contentinclude>';
    
    if(re.test(ctx)) {
      ctx = ctx.replace(re, replacement);
      next();
    } else {
      next();
    }
  }, function() {
    fs.writeFile(path.join(__dirname, '../views/_tmp/', pagename + '.twig'), ctx, function (err) {
      console.log(err);
      cb()
    });
  });
};

// ####################################
// Складываем данные с SiteMuse в файлики
// бежим по файлам и синкаем статику
function  importData (data, cb) {
  var _file = path.join(__dirname, '../extd/' + data.contentType + '.js');
  var importData = JSON.parse(data.data);
  var ctx = data.contentType;

  // Создаем файлик для данных
  fs.writeFileSync(_file, data.data);

  async.each(importData, function(item, next) {

      var a = _.find(MSMAP[ctx], function(n) {
          return n.name === item.name
      });

      if (a) {
        a.msid = item.id;
        a.status = 'sync';

        fs.writeFile(MSMAP_FILE, JSON.stringify(MSMAP, null, 4), function(err) {
          if (err) {
            throw err
          } else {
            next();
          }
        });
      } else {

        next();
      }
  }, function() {
    cb();
  });
}   
module.exports = router;