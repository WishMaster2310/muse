var express = require('express');
var router = express.Router();
var fs = require('fs');
var muse = require('./api');

/* GET API page. */
router.get('/', function(req, res, next) {
	res.render('admin/manager.twig', {
		title: 'Sitemuse'
	});
});


router.get('/addPage', function(req, res, next) {
	try {
		muse.createPage(req.query);
		res.send({});
	} catch (err) {
		console.log(err)
		res.send({
			error: err
		});
	}
});


router.get('/deletePage', function(req, res, next) {
	muse.deletePage(req.query, function(err) {
		res.send({err: err})
	});
});

router.post('/uploadFiles', function(req, res, next) {
	console.log(req);
});


router.get('/getmapping', function(req, res, next) {
	res.send(muse.db);
});


router.get('/updateItem', function(req, res, next) {
	try {
		muse.updateItem(req.query);
		res.send()
	} catch (err) {
		res.send({
			error: err
		});
	}
});


router.get('/removeImage', function(req, res, next) {
	try {
		fs.unlinkSync(req.query.path);
		res.send({});
	} catch (err) {
		res.send({
			error: err
		});
	}
});

router.get('/export', function(req, res, next) {
	muse.exporter(function() {
		res.send({})
	}, next);
});

router.get('/sync', function(req, res, next) {
	muse.syncWithMap(function(err) {
		res.send({
			error: err
		})
	}, next);
});

router.post('/syncwithsitemuse', function(req, res, next) {
	muse.importData(req.body, function() {
		console.log("req.body")
	});
});

muse.notify('Muse Init');

module.exports = router;
