/*
 * MD5 Codes generator
 * -----------------------------------------------------------------------------
 *
 * This function generates a unique Hexadecimal code based in a file content.
 *
 * */

var crypto = require('crypto');

exports.generateMD5fromString = function(s){
  return crypto.createHash('md5').update(s, 'utf8').digest('hex');
};