var path = require('path');
var MSMAP_FILE = path.join(__dirname, "../fixture/msmapping.json");
var MSMAP = require(MSMAP_FILE);
var watchDir = 'images';
var crypto = require('crypto'); 
var fs = require('fs');
var _ = require('lodash');

var chokidar = require('chokidar');
var watcher = chokidar.watch(path.join(__dirname, '../public', watchDir), {});

function initWatcher () {
  watcher
    .on('add', function(p, stats) {
      
      
      if (_.findIndex(MSMAP.images, { 'name': path.basename(p)}) === -1) {
        
        MSMAP.images.push({
          path: p,
          name: path.basename(p),
          size: stats.size,
          msid: "",
          _id: crypto.randomBytes(20).toString('hex')
        });

        fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
        console.log('File', p, 'has been added');
      };

      
    })
    .on('change', function(p) {console.log('File', p, 'has been changed');})
    .on('unlink', function(p) {

      _.remove(MSMAP.images, function(n) {
        return n.name === path.basename(p);
      });

      fs.writeFileSync(MSMAP_FILE, JSON.stringify(MSMAP, null, 4));
    })
    .on('error', function(error) {console.error('Error happened', error);});
};


module.exports = function() {initWatcher(); }