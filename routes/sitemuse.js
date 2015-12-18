var express = require('express');
var router = express.Router();
var swig = require('swig');
var twig = require('twig');

var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var path = require('path');
var crypto = require('crypto'); 
var async = require('async');
var colors = require('colors');

var IMAGES_DIR = './public/images/';
var MSMAP_FILE = path.join(__dirname, "../fixture/msmapping.json");
var MSMAP = require(MSMAP_FILE);
var VIEWS_PATH = './views/';
var FIXTURE_PATH = './fixture/';
var EXPORT_PAGES = path.join(__dirname,  '../export/pages');
var EXPORT_FRAGMENTS = path.join(__dirname,  '../export/fragments');

var Page = function(arguments) {
	this.name = arguments.name;
	this.group = arguments.group;
	this.origin = arguments.origin;	
	this.status = arguments.status || 'new';
	this.fixture = arguments.fixture || false;	
	this.msid = arguments.msid || '';
	this._id = crypto.randomBytes(20).toString('hex');
	this.ctime = Date.now();
}

function createPage (page) {
	var itemGroup = page.group;
	var viewsPath =  path.join(VIEWS_PATH, itemGroup, page.name + '.twig');
	var fixturePath = path.join(FIXTURE_PATH, itemGroup, page.name + '.json');
	var viewsOrigin = path.join(VIEWS_PATH, 'proto', page.origin + '.twig')

	if (!page.origin) {
		viewsOrigin = path.join(VIEWS_PATH, 'proto', '__' +  page.group + '.twig');
	}

	console.log('viewsOrigin',viewsOrigin)


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
	var mod = arguments._mod;
	var _msMap = 'pages';

	if (mod === 'fragment') {
		_msMap = 'fragments';
	};

	var indx = _.findIndex(MSMAP[_msMap], { '_id': arguments._id});

	MSMAP[_msMap][indx].msid = arguments.msid;
	MSMAP[_msMap][indx].status = 'sync';


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
  	res.redirect('/sitemuse')
  }, next);
});

router.get('/sync', function(req, res, next) {
  syncWithMap(function() {
  	res.send({'done': true})
  }, next);
});


function renderMusePage (callback, next) {
	var path_pages = path.join(VIEWS_PATH, 'pages');
	var path_fragments = path.join(VIEWS_PATH, 'fragments');
	var pages = fs.readdirSync(path_pages);
	var fragments = fs.readdirSync(path_fragments);

	if (!fs.existsSync(EXPORT_PAGES)) {fs.mkdirSync(EXPORT_PAGES);}
	if (!fs.existsSync(EXPORT_FRAGMENTS)) {fs.mkdirSync(EXPORT_FRAGMENTS);}
		
	async.each(pages, function(page, callback) {

		var _template = path.join(__dirname,  '../views', 'pages', page);
		var content = swig.renderFile(_template);

		try {
			 fs.writeFileSync(path.join(EXPORT_PAGES, path.parse(page).name + '.html'), content);
			 console.log('[SiteMuse]:'.green, (path.parse(page).name + '.html').gray, 'successfully rendered'); 
			 callback()
			} catch (err) {
				callback(err)
			}
		}, function(err){
			if ( err ) {
				console.log(err);
			} else{
				console.log('[SiteMuse]: Pages export done successfully'.green);
			}
	});

	async.each(fragments, function(page, callback) {

		var _template = path.join(__dirname,  '../views', 'fragments', page);
		var content = swig.renderFile(_template);
		
		try {
			 fs.writeFileSync(path.join(EXPORT_FRAGMENTS, path.parse(page).name + '.html'), content);
			 console.log('[SiteMuse]:'.green, (path.parse(page).name + '.html').gray, 'successfully rendered'); 
			 callback()
			} catch (err) {
				callback(err)
			}
		}, function(err){
			if ( err ) {
				console.log(err);
			} else{
				console.log('[SiteMuse]: Fragments export done successfully'.green);
			}
	});

	callback();
}

function syncWithMap (callback, next) {
	checkSyncedFolder('pages');
	checkSyncedFolder('fragments');
	callback();
}


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
}
//      \{\{+\s+include\s+\"fragments\/([^\"]*)"[^\}]*\}\} - regexp 
module.exports = router;
