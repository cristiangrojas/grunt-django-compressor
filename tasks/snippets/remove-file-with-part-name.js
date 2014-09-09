/*
 * Remove a file inside a directory with part of his name.
 * */

var fs = require('fs');
var path = require('path');
var grunt = require('grunt');

exports.removeFileWithPartName = function(folder, partName){
  var files = fs.readdirSync(folder);

  for(var index in files){
    if(!files.hasOwnProperty(index)) continue;

    var filename = files[index];

    if( filename.indexOf(partName) > -1 ){
      var filepath = path.join(folder, filename);
      fs.unlink(filepath);
      grunt.log.writeln('Old file ' + filepath + ' was removed!');
      // Don't stop the loop because there could be more
      // than 1 file starting with the provided part name.
      // It happens for example with source maps for javascript files.
    }
  }
};