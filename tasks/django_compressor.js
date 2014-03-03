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
  var UglifyJS = require('uglify-js');
  var chalk = require('chalk');
  var CleanCSS = require('clean-css');

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
      // Folder where the generated static files should be
      destinationFolder: '',
      // A list of excluded dirs that shouldn't be scanned
      excludedDirs: [],
    });

    // Don't continue if the staticFilesOption isn't set
    if( options.staticFilesPath === '' ) throw new Error(chalk.underline.red('Please specify the "staticFilesPath" option.'));
    if( options.destinationFolder === '' ) throw new Error(chalk.underline.red('Please specify the "destinationFolder" option.'));

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

          // Exclude if name in excluded folders option
          var thisFolderShouldBeExcluded = false;
          options.excludedDirs.forEach(function(excludedFileName){
            if( name.indexOf(excludedFileName) > -1 ){
              thisFolderShouldBeExcluded = true;
            }
          });

          if( !thisFolderShouldBeExcluded ){
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
        grunt.log.writeln(chalk.yellow(options.startTag) + ' tag was found in "' + chalk.underline.cyan(htmlFilePath) + '"');

        // send the indexOfStartTag number to start looking at this point
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


          // Determine the indentation level by getting it from the first script
          // tag in the HTML
          // TODO the following code can be considered as a hack :P
          var scriptsArr = scripts.split('</script>'),
            firstScriptInArr = scriptsArr[0].replace(/\n/, ''), // replace new-line chars
            padding = '';

          for(var i=0; i <= firstScriptInArr.length; i++){
            var char = firstScriptInArr.charAt(i);
            if( char == ' ' ){
              padding += ' ';
            } else {
              break; // exit from the loop
            }
          }


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
          // destination file path
            destFile = options.destinationFolder + destFileName;

          // Warn if any source file doesn't exists
          // --------------------------------------------------
          scripts.forEach(function(filepath) {
            if ( !grunt.file.exists(filepath) ){
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false;
            }
          });

          // Compress the scripts and save in a file
          // ---------------------------------------------------
          var minifiedJsFile;
          try {
            minifiedJsFile = UglifyJS.minify(scripts, {
              mangle: true,
              compress: true,
            });
          } catch(err) {
            throw new Error(err);
          }
          grunt.file.write(destFile, minifiedJsFile.code);
          grunt.log.writeln('File "' + chalk.underline.cyan(destFile) + '" created.');

          // Write the template with the new js file
          // ---------------------------------------------------
          var djangoStartTag = '{# SCRIPTS #}';
          var djangoEndTag = '{# SCRIPTS END #}';

          var htmlFileAlreadyParsed = false;
          if( htmlFile.indexOf(djangoStartTag) > -1 ) htmlFileAlreadyParsed = true;

          var jsFileVersion = new Date().getTime();
          var scriptTag = '<script type="text/javascript" src="'
            + destFile.replace(options.staticFilesPath, options.staticFilesDjangoPrefix)
            + '?version=' + jsFileVersion + '"></script>';

          var newHtmlFile;

          if( htmlFileAlreadyParsed ){
            var indexOfDjangoStartTag = htmlFile.indexOf(djangoStartTag);
            var indexOfDjangoEndTag = htmlFile.indexOf(djangoEndTag);
            newHtmlFile = htmlFile.slice(0, indexOfDjangoStartTag)
              + djangoStartTag
              + grunt.util.linefeed + padding
              + '{% if DEBUG %}'
              + grunt.util.linefeed + padding
              + htmlFile.substring(indexOfStartTag, indexOfEndTag + options.endTag.length)
              + grunt.util.linefeed + padding
              + '{% else %}'
              + grunt.util.linefeed + padding
              + scriptTag
              + grunt.util.linefeed + padding
              + '{% endif %}'
              + grunt.util.linefeed + padding
              + djangoEndTag
              + htmlFile.slice(indexOfDjangoEndTag + djangoEndTag.length, htmlFile.length);
          } else {
            newHtmlFile = htmlFile.substring(0, indexOfStartTag)
              + djangoStartTag
              + grunt.util.linefeed + padding
              + '{% if DEBUG %}'
              + grunt.util.linefeed + padding
              + htmlFile.substring(indexOfStartTag, indexOfEndTag + options.endTag.length)
              + grunt.util.linefeed + padding
              + '{% else %}'
              + grunt.util.linefeed + padding
              + scriptTag
              + grunt.util.linefeed + padding
              + '{% endif %}'
              + grunt.util.linefeed + padding
              + djangoEndTag
              + htmlFile.substr(indexOfEndTag + options.endTag.length, htmlFile.length);
          }

          grunt.file.write(htmlFilePath, newHtmlFile);
        }
      }
    });
  });
};