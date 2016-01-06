var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var path = require('path');

var crypto = require('crypto');
var async = require('async');
var colors = require('colors');
var nunjucks = require('nunjucks');
var cheerio = require('cheerio');

var IMAGES_DIR = './public/images/';
var MSMAP_FILE = path.join(__dirname, "../fixture/msmapping.json");
var MSMAP = require(MSMAP_FILE);
var VIEWS_PATH = './views/';
var FIXTURE_PATH = './fixture/';
var EXPORT_PATH = path.join(__dirname, '../export/');
var EXPORT_PAGES = path.join(__dirname, '../export/pages');
var EXPORT_FRAGMENTS = path.join(__dirname, '../export/fragments');

var muse = {};
muse.db = MSMAP;

muse.notify = function(str) {
  console.log('[SiteMuse]:'.green, str);
};

muse.warn = function(str) {
    console.log('[SiteMuse]:'.red, str);
};


muse.Page = function(arguments) {
    this.name = arguments.name;
    this.group = arguments.group;
    this.origin = arguments.origin;
    this.status = arguments.status || 'new';
    this.fixture = arguments.fixture || false;
    this.msid = arguments.msid || '';
    this._id = crypto.randomBytes(20).toString('hex');
    this.ctime = Date.now();
};

muse.Img = function(arguments) {
    this.name = arguments.name;
    this.size = 0;
    this.path = null;
    this.msid = arguments.msid || '';
    this._id = crypto.randomBytes(20).toString('hex');
};

muse.createPage = function(page) {
    var itemGroup = page.group;
    var viewsPath = path.join(VIEWS_PATH, itemGroup, page.name + '.twig');
    var fixturePath = path.join(FIXTURE_PATH, itemGroup, page.name + '.json');
    var viewsOrigin = path.join(VIEWS_PATH, 'proto', page.origin + '.twig')

    if (!page.origin) {
        viewsOrigin = path.join(VIEWS_PATH, 'proto', '__' + page.group + '.twig');
    }

    if (_.findIndex(MSMAP[itemGroup], {
            name: page.name
        }) < 0) {

        fs.createReadStream(viewsOrigin).pipe(fs.createWriteStream(viewsPath));

        // Создаем фикстуру если надо и сохраняем
        if (page.fixture) {

            fs.writeFile(fixturePath, '{"name": ""}', function(err) {
                // Записываем в "Базу" (JSON)
                MSMAP[itemGroup].push(new muse.Page(page));
                fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
            });

        } else {

            // Записываем в "Базу" (JSON)
            MSMAP[itemGroup].push(new muse.Page(page));
            fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
        }

    } else {
        throw new Error('Name not uniq');
    }
};

muse.deletePage = function(item, callback) {

    var group = item.group;
    var name = item.name;

    var viewsPath = path.join(VIEWS_PATH, group, name + '.twig');
    var fixturePath = path.join(FIXTURE_PATH, group, name + '.json');

    var marker = _.findIndex(MSMAP[group], {
        'name': name
    });

    if (marker >= 0) {
        var _export_file = path.join(__dirname, '../export/', group, name + '.html');
        
        var kenny = _.remove(MSMAP[group], function(n) {
            return n.name === name
        });

        async.waterfall([
            function(next) {
                fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
                next();
            },
            function(next) {
                if (fs.existsSync(viewsPath)) {
                    fs.unlinkSync(viewsPath);
                }
                next();
            },
            function(next) {
                if (kenny[0].fixture) {
                    fs.unlinkSync(fixturePath);
                }
                next();
            },
            function(next) {
                if (fs.existsSync(_export_file)) {
                    fs.unlinkSync(_export_file)
                };
                next();
            }
        ], function() {
            muse.notify(group + ' ' + name + ' was deleted');
            callback()
        });
    } else {
        muse.warn(group + ' ' + name + ' not found');
        callback()
    }
};

muse.updateItem = function(arguments) {
    var mod = arguments.group;

    var indx = _.findIndex(MSMAP[mod], {
        '_id': arguments._id
    });

    MSMAP[mod][indx].msid = arguments.msid;
    MSMAP[mod][indx].status = 'sync';

    fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
};

muse.XMLizeImages = function(dir, callback) {
    var exportPages = fs.readdirSync(dir);
    async.each(exportPages, function(p, cb) {

        var content = fs.readFileSync(path.join(dir, p));
        var $ = cheerio.load(content, {
            decodeEntities: false
        });

        // decodeEntities если оставить true, 
        // то потом нужно результат енкодить

        $('img').each(function(index, el) {
            var src = $(el).attr('src');
            var classes = $(el).attr('class');
            var filename = path.basename(src);
            var alt = $(el).attr('alt') || '';
            var datasrc = $(el).data('src') ? true : false;

            var msid = _.result(_.find(MSMAP.images, function(item) {
                return item.name === filename;
            }), 'msid');


            var replacement = '<mscom:image' +
                ' spritegroup="default"' +
                ' sprite="false" noheightwidth="true"' +
                ' md:payloadguid=' + msid +
                ' alt=' + alt +
                ' usedatasource=' + datasrc +
                ' classoverride="' + classes + '"' +
                ' ></mscom:image>'
            $(el).replaceWith(replacement);
        });

        fs.writeFile(path.join(dir, p), $.html(), function(err) {
            cb()
        });

    }, function(err) {
        callback();
    });
};

muse.exportPage = function(flag, callback) {
    // Бежим по массиву страниц в базе 
    // и рендерим их
    async.each(MSMAP.pages, function(page, cb) {

        var _preRender = fs.readFileSync(path.join(__dirname, '../views', 'pages', page.name + '.twig'), 'utf8');
        var _tmp = path.join(__dirname, '../views/_tmp', page.name + '.twig');

        muse.injectFragments(_preRender, page.name, function() {
            // Передаем контекст из fixture, если он есть
            if (page.fixture) {
                var locals = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixture', 'pages', page.name + '.json')))
                var content = nunjucks.render(_tmp, {
                    Page: locals,
                    Export: flag
                });
            } else {
                var content = nunjucks.render(_tmp, {
                    Export: flag
                });
            }

            fs.writeFileSync(path.join(EXPORT_PAGES, page.name + '.html'), content, 'utf8');
            muse.notify(page.name + '.html successfully rendered');
            cb();
        });
    }, function(err) {
        if (err) {
            console.log(err);
        } else {
            muse.notify('Pages export done successfully');
        }
        callback()
    });
};

muse.exportFragment = function(callback) {
    async.each(MSMAP.fragments, function(page, cb) {
        var _template = path.join(__dirname, '../views', 'fragments', page.name + '.twig');
        var content = nunjucks.render(_template);

        fs.writeFileSync(path.join(EXPORT_FRAGMENTS, page.name + '.html'), content);
        console.log('[SiteMuse]:'.green, (page.name + '.html').gray, 'successfully rendered');
        cb();

    }, function(err) {
        if (err) {
            console.log(err);
        } else {
            muse.notify('Fragments export done successfully')
        }
        callback();
    });
};

muse.injectFragments = function(content, pagename, cb) {

    // ###################################
    // Реплейсим Твиговский include с фрагментом 
    // на mscom:contentinclude 
    // и записываем в буферный файл

    var ctx = content;

    async.each(MSMAP.fragments, function(n, next) {
        var re = new RegExp('\\{\\%+\\s+include\\s+\\"..\\/fragments\\/' + n.name + '.twig([^\\"]*)"[^\\}]*\\%\\}', 'g');
        var replacement = '<mscom:contentinclude ajaxrendered=\"false\" md:pageid=\"' + n._id + '\" instancename=\"' + n.name + '\"></mscom:contentinclude>';

        if (re.test(ctx)) {
            ctx = ctx.replace(re, replacement);
            next();
        } else {
            next();
        }
    }, function() {
        fs.writeFile(path.join(__dirname, '../views/_tmp/', pagename + '.twig'), ctx, function(err) {
            console.log(err);
            cb()
        });
    });
};

muse.exporter = function(callback, next) {
    var EXPORT = 'muse'

    // Создаем папки для статики, если оные отсутствуют
    if (!fs.existsSync(EXPORT_PAGES)) {
        fs.mkdirSync(EXPORT_PAGES);
    }
    if (!fs.existsSync(EXPORT_FRAGMENTS)) {
        fs.mkdirSync(EXPORT_FRAGMENTS);
    }

    async.waterfall([
        function(tick) {
            muse.exportPage(EXPORT, tick);
        },
        function(tick) {
            muse.exportFragment(tick)
        },
        function(tick) {
            muse.XMLizeImages(EXPORT_PAGES, tick);
        },
        function(tick) {
            muse.XMLizeImages(EXPORT_FRAGMENTS, tick);
        }
    ], function() {
        callback();
    });
};


muse.importData = function(data, cb) {

    // ####################################
    // Складываем данные с SiteMuse в файлики
    // бежим по файлам и синкаем статику

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
};


muse.syncWithMap = function(callback, next) {
    // ###################################
    // Удаляем страницы/фрагменты которых
    // нет в файле msmspping.json
    // Использовать крайне осторожно! =)

    async.waterfall([
      function(tick) {
         muse.checkSyncedFolder('pages', function() {
          tick()
         });
      },
      function(tick) {
         muse.checkSyncedFolder('fragments', function() {
          tick()
         });
      }
    ], function() {
        callback();
    });
};


muse.checkSyncedFolder = function(units, callback) {
    var path_to_units = path.join(VIEWS_PATH, units);
    var path_to_fixture = path.join(FIXTURE_PATH, units);
    var units_list = fs.readdirSync(path_to_units);
    var fixture_list = fs.readdirSync(path_to_fixture);

    async.waterfall([
      function(tick) {
          async.each(units_list, function(page, cb) {
           
            var item = _.find(MSMAP[units], function(t) {
                return t.name === path.parse(page).name
            });

             if (!item) {
               fs.unlinkSync(path.join(path_to_units, page));
               muse.notify(page + ' successfully deleted')
               cb();
             } else {
              cb();
             }
          }, function() {
            tick()
          });
      },
      function(tick) {
        if (units === 'pages') {
          async.each(fixture_list, function(page, cb) {
           
            var item = _.find(MSMAP[units], function(t) {
                return t.name === path.parse(page).name
            });

             if (!item) {
               fs.unlinkSync(path.join(path_to_fixture, page));
               muse.notify(page + ' successfully deleted')
               cb()
             } else {
              cb();
             }
          }, function() {
            tick()
          });
        } else {
          tick()
        }
      }
    ], function() {
        callback();
    });
};



module.exports = muse;
