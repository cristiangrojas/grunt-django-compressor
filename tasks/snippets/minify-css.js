// This function is basically a copy of the one in the grunt-contrib-cssmin package
// https://github.com/gruntjs/grunt-contrib-cssmin/blob/master/tasks/cssmin.js

var grunt = require('grunt');
var CleanCSS = require('clean-css');

exports.minifyCSS = function(source, options){
  try {
    return new CleanCSS(options).minify(source);
  } catch(err) {
    grunt.log.warn(err);
    grunt.fail.warn('CSS minification failed.');
  }
};