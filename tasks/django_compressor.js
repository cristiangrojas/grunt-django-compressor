/*
 * grunt-django-compressor
 * https://github.com/cristianrojas/grunt-django-compressor
 *
 * Copyright (c) 2014 Cristian Rojas
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var fs = require('fs');
  var comment = require('./libs/comment');
  var UglifyJS = require('uglify-js');

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('django_compressor', 'A Grunt plugin to iterate over every html file and compress javascripts and stylesheets.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      // Same as the sails linker
      startTag: '<!--SCRIPTS-->',
      endTag: '<!--SCRIPTS END-->',
      staticFilesDjangoPrefix: '{{ STATIC_URL }}',
      // The path to the static files
      // typically something like: /<django_app_name>/static/
      staticFilesPath: '',
    });

    // Don't continue if the staticFilesOption isn't set
    if( options.staticFilesPath === '' ) throw new Error('Please specify the staticFilesPath option.');

    /*
     * Get html files function
     * -----------------------
     * */
    function getHtmlFiles(dir){
      var htmlFiles = [];

      function getFiles(dir){
        var files = fs.readdirSync(dir);
        for(var i in files){
          if(!files.hasOwnProperty(i)) continue;
          var name = dir+'/'+files[i];
          if(fs.statSync(name).isDirectory()){
            // It's a directory
            getFiles(name);
          } else {
            // It's a file, but verify if is an html file
            if(name.split('.').pop() === 'html'){
              htmlFiles.push(name);
            }
          }
        }
      }
      getFiles(dir);
      return htmlFiles;
    }

    // Get html files from this folder (where gruntfile lives)
    var htmlFiles = getHtmlFiles('.');

    // Variable to store the scripts
    var scripts;

    htmlFiles.forEach(function(htmlFilePath){
      var htmlFile = grunt.file.read(htmlFilePath);

      // Verify if the file has the startTag
      var indexOfStartTag = htmlFile.indexOf(options.startTag);
      if( indexOfStartTag > -1 ){
        // send the start indexOf number to start looking at this point
        var indexOfEndTag = htmlFile.indexOf(options.endTag, indexOfStartTag);
        if( indexOfStartTag === -1 || indexOfEndTag === -1 || indexOfStartTag >= indexOfEndTag ){
          // There are not scripts
          scripts = false;
          return false;
        } else {
          // The file contains start and end tag
          // Determine where stars and finish the scripts section
          var substrStart = indexOfStartTag + options.startTag.length,
            substrEnd = (indexOfEndTag - 1) - substrStart;
          // Store the scripts section in the scripts var
          scripts = htmlFile.substr(substrStart, substrEnd);
          // Look for all src="*" parts in the scripts string
          var regexp = /src=".*?"/g;
          // match them and return as an array
          scripts = scripts.match(regexp);

          // Create a new array and remove unneeded chars in the script path
          var _scripts = [];
          scripts.forEach(function(script){
            // TODO: should throw an error if staticFilesDjangoPrefix not set?
            script = script.replace(/"/g, '')
              .replace('src=', '')
              .replace(options.staticFilesDjangoPrefix, '');

            // Construct the absolute path
            script = options.staticFilesPath + script;
            _scripts.push(script);
          });
          scripts = _scripts;
        }

        if( scripts ){
          // extract the filename of the template to create a js file with
          // the same name
          var destFileName = htmlFilePath.split('/').pop().replace('.html', '.js'),
          // destination file path (the same folder as the scripts)
            destFile = scripts[0].substring(0, scripts[0].lastIndexOf('/') + 1) + destFileName,
          // variable to store the file content
            _fileContent = '';

          scripts.forEach(function(filepath) {
            // Warn on and remove invalid source files
            if ( !grunt.file.exists(filepath) ){
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false;
            }

            // Read file source and write in the variable
            var src = grunt.file.read(filepath);
            if( src ){
              _fileContent += src;
            }
          });

          // Write the stored content in the dest file
          grunt.file.write(destFile, _fileContent);
          // Print a success message.
          grunt.log.writeln('File "' + destFile + '" created.');

//          var minVersionPath = destFile.replace('.js', '.min.js');
//          var minVersion = UglifyJS.minify(destFile);
//          grunt.file.write(minVersionPath, minVersion.code);
//          grunt.log.writeln('File "' + minVersionPath + '" created.');

          var djangoStartTag = '{# SCRIPTS #}';
          var djangoEndTag = '{# SCRIPTS END #}';

          var htmlFileAlreadyParsed = false;
          if( htmlFile.indexOf(djangoStartTag) > -1 ) htmlFileAlreadyParsed = true;

          var scriptTag = '<script type="text/javascript" src="'
            + destFile.replace(options.staticFilesPath, options.staticFilesDjangoPrefix)
            + '"></script>';

//          console.log(scriptTag);

          var newHtmlFile;

          if( htmlFileAlreadyParsed ){
            var htmlFileCopy = htmlFile;
            var indexOfDjangoStartTag = htmlFileCopy.indexOf(djangoStartTag);
            var indexOfDjangoEndTag = htmlFileCopy.indexOf(djangoEndTag);
            htmlFileCopy = htmlFileCopy.slice(0, indexOfDjangoStartTag)
              + '{# SCRIPTS #}'
              + '{% if DEBUG %}'
              + htmlFileCopy.substring(indexOfStartTag - 1, indexOfEndTag + options.endTag.length)
              + '{% else %}'
              + scriptTag
              + '{% endif %}'
              + '{# SCRIPTS END #}'
              + htmlFileCopy.slice(indexOfDjangoEndTag + djangoEndTag.length, htmlFileCopy.length);

            newHtmlFile = htmlFileCopy;
          } else {
            console.log('html file not parsed');
            newHtmlFile = htmlFile.substr(0, indexOfStartTag - 1)
              + '{# SCRIPTS #}'
              + '{% if DEBUG %}'
              + htmlFile.substr(indexOfStartTag - 1, indexOfEndTag + options.endTag.length)
              + '{% else %}'
              + scriptTag
              + '{% endif %}'
              + '{# SCRIPTS END #}'
              + htmlFile.substr(indexOfEndTag + options.endTag.length, htmlFile.length);
          }

          grunt.file.write(htmlFilePath, newHtmlFile);
        }
      }
    });
  });
};