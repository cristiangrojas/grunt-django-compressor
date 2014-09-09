/*
 * Remove the previous compressed files inside the dist folder
 * */

var fs = require('fs');
var path = require('path');
var grunt = require('grunt');

exports.removeOldCompressedFiles = function(folder, destFileName){
  var exists = fs.existsSync(folder);

  if( !exists ) {
    fs.mkdirSync(folder);
    grunt.log.writeln('"dist" folder was created, fullpath: ' + folder);
  }

  var _arr = destFileName.split('.');
  // Get the timestamp version part and replace with a \d+ regexp matcher
  _arr[_arr.length - 2] = '\\d+';
  // \\ = single backslash (escaped)
  var _regexpLiteral = _arr.join('\\.');
  // Create a new regular expression with that information
  var _regexp =  new RegExp(_regexpLiteral);

  // Scan all the files inside the folder and iterate over them to check
  // which to remove
  var files = fs.readdirSync(folder);
  for(var index in files){
    if(!files.hasOwnProperty(index)) continue;

    var filename = files[index];

    if( _regexp.test(filename) ){
      var filepath = path.join(folder, filename);
      fs.unlink(filepath);
      grunt.log.writeln('Old file ' + filepath + ' was removed!');
      // Don't stop the loop because there could be more
      // than 1 file starting with the provided part name.
      // It happens for example with source maps for javascript files.
    }
  }
};