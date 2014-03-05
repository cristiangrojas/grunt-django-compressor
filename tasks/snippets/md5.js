/*
 * MD5 Codes generator
 * -----------------------------------------------------------------------------
 *
 * This function generates a unique Hexadecimal code based in a file content.
 *
 * */

var crypto = require('crypto');
var grunt = require('grunt');

exports.generateMD5fromFile = function(filepath){
  var fileContent = grunt.file.read(filepath);
  return crypto.createHash('md5').update(fileContent, 'utf8').digest('hex');
};