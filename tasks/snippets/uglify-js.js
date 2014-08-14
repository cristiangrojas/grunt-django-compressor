// This module wraps the UglifyJS function and returns a callback
// is used to execute a function after the uglify

var UglifyJS = require('uglify-js');


exports.UglifyTheJS = function(files, options, callback){
  var minifiedJsFile;

  try {
    minifiedJsFile = UglifyJS.minify(files, options);
  } catch(err) {
    throw new Error(err);
  }

  return callback(minifiedJsFile);
};