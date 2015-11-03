var express = require('express');
var router = express.Router();

var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var path = require('path');
var crypto = require('crypto'); 

var FIXTURES_FRAGMENTS_DIR = './fixture/fragments/';
var VIEWS_FRAGMENTS_DIR = './views/fragments/';
var IMAGES_DIR = './public/images/';
var MSMAP_FILE = path.join(__dirname, "../fixture/msmapping.json");
var MSMAP = require(MSMAP_FILE);

var FIXTURES_PAGES_DIR = './fixture/pages/';
var VIEWS_PAGES_DIR = './views/pages/';


function CreateTemplates (mod, name, flag) {
	var _fixPath = FIXTURES_PAGES_DIR, _viewsPath = VIEWS_PAGES_DIR, _msMap = 'pages', mapItem = {};

	var fileData = '{% extends "../layout.twig" %}\n {% block content %}{% endblock %}'

	if (mod === 'fragment') {
		_fixPath = FIXTURES_FRAGMENTS_DIR;
		_viewsPath = VIEWS_FRAGMENTS_DIR;
		_msMap = 'fragments';
		var fileData = '';
	};

	mapItem.name = name;
	mapItem.fixture = false;
	mapItem._id = crypto.randomBytes(20).toString('hex');
	

	if (_.findIndex(MSMAP[_msMap], { 'name': name }) < 0) {

		mapItem.msid = "";
		mapItem.status = 'new';

		fs.writeFile(_viewsPath + name + '.twig', fileData , function(err) {
			
			if (err) {
			    return console.log(err);
			}

			mapItem.ctime = Date.now();

			if (flag) {

				fs.writeFileSync(_fixPath + name + '.json', '{"name": ""}');
				mapItem.fixture = true;
			    MSMAP[_msMap].push(mapItem);
				fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));

			} else{

				MSMAP[_msMap].push(mapItem);
				fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
			}

			
		});
	} else {
		throw {
			message: 'file already exist'
		}
	}
};

function RemoveTemplate (mod, name) {
	var _fixPath = FIXTURES_PAGES_DIR, _viewsPath = VIEWS_PAGES_DIR, _msMap = 'pages';

	if (mod === 'fragment') {
		_fixPath = FIXTURES_FRAGMENTS_DIR;
		_viewsPath = VIEWS_FRAGMENTS_DIR;
		_msMap = 'fragments';
	}


	var a = _.findIndex(MSMAP[_msMap], { 'name': name });

	if (a != -1) {

		fs.unlink(_viewsPath + name + '.twig', function(err) {
	
			if(err) {
		        return console.log(err);
		    }
		    _.remove(MSMAP[_msMap], function(n) {
				return n.name === name
			});

		    fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
		});

	} else {
		throw {
			message: 'File not exist'
		}
	}

	
	fs.unlink(_fixPath + name + '.json', function(err) {

		if(err) {
	        return console.log('no-fixture');
	    }
	});
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

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('admin/manager.twig', { title: 'Sitemuse' });
});


router.get('/addContentUnit', function(req, res, next) {
	try  {
		CreateTemplates(req.query.model, req.query.name, req.query.fixture);
		res.send({});	
	} catch (err) {
		res.send({error: err});
	}
});

router.get('/removeContentUnit', function(req, res, next) {
	console.log(req.query);
	RemoveTemplate(req.query.model, req.query.name);
  	res.send(req.query);
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




module.exports = router;
