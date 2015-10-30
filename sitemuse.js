var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var path = require('path');

var FIXTURES_FRAGMENTS_DIR = './fixture/fragments/';
var VIEWS_FRAGMENTS_DIR = './views/fragments/';
var MSMAP_FILE = './fixture/msmapping.json'
var MSMAP = require(MSMAP_FILE);

var FIXTURES_PAGES_DIR = './fixture/pages/';
var VIEWS_PAGES_DIR = './views/pages/';

var fixtures = fs.readdirSync(FIXTURES_FRAGMENTS_DIR);
var args = process.argv.slice(2);


var itemManager =  {

	add: function(mod, name, flag) {

		var _fixPath = FIXTURES_PAGES_DIR, _viewsPath = VIEWS_PAGES_DIR, _msMap = 'pages';

		if (mod === 'fragment') {
			_fixPath = FIXTURES_FRAGMENTS_DIR;
			_viewsPath = VIEWS_FRAGMENTS_DIR;
			_msMap = 'fragments';
		};

		var mapItem = {
			"name": name,
			"id": "1213232"
		};

		fs.writeFile(_viewsPath + name + '.twig', '', function(err) {
			if(err) {
			    return console.log(err);
			}

			
			console.log(mod + ' ' + name + '.twig  was succesfully created');

			if (_.findIndex(MSMAP[_msMap], { 'name': name }) < 0) {
				MSMAP[_msMap].push(mapItem);
				fs.writeFile(MSMAP_FILE, JSON.stringify(MSMAP, null, 4), function (err) {
				  if (err) return console.log(err);
				});
			} else {
				
				console.log('this item allready exist in MSMAPFILE');
			}

			
		});

		if (flag == '-f') {

			fs.writeFile(_fixPath + name + '.json', '{"name": ""}', function(err) {
		
				if(err) {
			        return console.log(err);
			    }

			    console.log(mod + ' ' + name + '.json  was succesfully created');
			});
		};

	},

	remove: function(mod, name) {
		var _fixPath = FIXTURES_PAGES_DIR, _viewsPath = VIEWS_PAGES_DIR, _msMap = 'pages';

		if (mod === 'fragment') {
			_fixPath = FIXTURES_FRAGMENTS_DIR;
			_viewsPath = VIEWS_FRAGMENTS_DIR;
			_msMap = 'fragments';
		}


		fs.unlink(_viewsPath + name + '.twig', function(err) {
		
			if(err) {
		        return console.log(err);
		    }

		    _.remove(MSMAP[_msMap], function(n) {
				return n.name = name
			});

		    fs.writeFile(MSMAP_FILE, JSON.stringify(MSMAP, null, 4), function (err) {
			  if (err) return console.log(err);
			});

		    console.log(mod + ' ' + name + '.twig  was succesfully removed');
		});

		fs.unlink(_fixPath + name + '.json', function(err) {
	
			if(err) {
		        return console.log('no-fixture');
		    }

		    console.log(mod + ' ' + name + '.json  was succesfully removed');
		});
	}
}	

if (args[0] === 'add') {

	itemManager.add(args[1], args[2], args[3]);

} else if(args[0] === 'remove') {

	itemManager.remove(args[1], args[2]);

} else {
	console.log("Use: add "+ args[1] +  " " + args[2] + " or remove " + args[1] +  " " + args[2] )
}
