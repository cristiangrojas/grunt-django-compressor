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
  var getHtmlFiles = require('./snippets/get-html-files').getHtmlFiles;
  var generateMD5fromFile = require('./snippets/md5').generateMD5fromFile;

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

    // Get html files from this folder (where gruntfile lives)
    var htmlFiles = getHtmlFiles('.', options.excludedDirs);

    // Variable to store the found files
    var foundFiles;

    // Store the MD5 versions of the found files inside a json file
    var versionsJsonFilePath = options.destinationFolder + 'grunt_django_compressor_versions.json',
      versionsJsonFileContent = null,
      versionsJsonFileExists = grunt.file.exists(versionsJsonFilePath);

    if( versionsJsonFileExists ){
      versionsJsonFileContent = grunt.file.readJSON(versionsJsonFilePath);
    } else {
      // Initialize to have things organized inside the JSON
      versionsJsonFileContent = {
        'created': null,
        'modified': null
      }
    }

    htmlFiles.forEach(function(htmlFilePath){
      var htmlFile = grunt.file.read(htmlFilePath);

      // Verify if the file has the startTag
      var indexOfStartTag = htmlFile.indexOf(options.startTag);
      if( indexOfStartTag > -1 ){
        grunt.log.writeln(chalk.yellow(options.startTag) + ' tag was found in "' + chalk.underline.cyan(htmlFilePath) + '"');

        // send the indexOfStartTag number to start looking at this point
        var indexOfEndTag = htmlFile.indexOf(options.endTag, indexOfStartTag);
        if( indexOfStartTag === -1 || indexOfEndTag === -1 || indexOfStartTag >= indexOfEndTag ){
          // There are not js or css files
          foundFiles = false;
        } else {
          // The file contains start and end tag
          // Determine where stars and finish the scripts section
          var substrStart = indexOfStartTag + options.startTag.length,
            substrEnd = (indexOfEndTag - 1) - substrStart;
          // Store the scripts section in the scripts var
          foundFiles = htmlFile.substr(substrStart, substrEnd);


          // Determine the indentation level by getting it from the first script
          // tag in the HTML
          // TODO the following code can be considered as a hack :P
          var foundFilesArr = foundFiles.split('</script>'),
            firstFileInArr = foundFilesArr[0].replace(/\n/, ''), // replace new-line chars
            padding = '';

          for(var i=0; i <= firstFileInArr.length; i++){
            var char = firstFileInArr.charAt(i);
            if( char == ' ' ){
              padding += ' ';
            } else {
              break; // exit from the loop
            }
          }


          // Look for all src="*" parts in the scripts string
          var regexp = /src=".*?"/g;
          // match them and return as an array
          foundFiles = foundFiles.match(regexp);
          // Create a new array and remove unneeded chars in the script path
          var tempArr = [];
          foundFiles.forEach(function(file){
            // TODO: should throw an error if staticFilesDjangoPrefix not set?
            file = file.replace(/"/g, '')
              .replace('src=', '')
              .replace(options.staticFilesDjangoPrefix, '');

            // Construct the absolute path
            file = options.staticFilesPath + file;
            tempArr.push(file);
          });
          foundFiles = tempArr;
        }

        if( foundFiles ){
          // Extract the filename of the template to create a js file with
          // the same name
          var htmlFileName = htmlFilePath.split('/').pop(),
            destFileName = htmlFileName.replace('.html', '.js'),
            // destination file path
            destFile = options.destinationFolder + destFileName;

          // Warn if any source file doesn't exists
          // --------------------------------------------------
          foundFiles.every(function(filepath, index, array){
            if ( !grunt.file.exists(filepath) ){
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false; // exit from the loop
            }
            return true; // continue with the loop
          });

          // Generate a json file with html file name and scripts with MD5 hex
          // hash to detect if files changed in the next iteration
          var atLeastOneFileHasChanged = false;
          foundFiles.every(function(filepath, index, array){
            var MD5forThisFile = generateMD5fromFile(filepath);

            if( !versionsJsonFileExists ){
              // stamp the created time
              versionsJsonFileContent['created'] = new Date().getTime();
              if( !versionsJsonFileContent[htmlFilePath] ){
                versionsJsonFileContent[htmlFilePath] = {};
              }
              versionsJsonFileContent[htmlFilePath][filepath] = MD5forThisFile;

              // If the versions file doesn't exists yet it means that it should
              // be created and I need to make the atLeastOneFileHasChanged true
              // to trigger the creation of the compressed static file
              if( !atLeastOneFileHasChanged ){ // do it only one time
                atLeastOneFileHasChanged = true;
              }
            } else {
              var previousMD5 = versionsJsonFileContent[htmlFilePath][filepath];
              if( previousMD5 !== MD5forThisFile ){
                // set this flag to true to compress the statics
                atLeastOneFileHasChanged = true;
                // write the new MD5 for this file
                versionsJsonFileContent[htmlFilePath][filepath] = MD5forThisFile;
                grunt.log.writeln(chalk.underline.cyan(filepath) + ' in ' + chalk.underline.cyan(htmlFilePath) + ' has changed.');
                return false; // exit from the loop
              }
            }
            return true; // to continue with the loop
          });

          if( atLeastOneFileHasChanged ){
            // Compress the scripts and save in a file
            // ---------------------------------------------------
            var minifiedJsFile;
            try {
              minifiedJsFile = UglifyJS.minify(foundFiles, {
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
          } else {
            grunt.log.writeln('No files has changed for ' + chalk.underline.cyan(htmlFileName));
          } // end if atLeastOneFileHasChanged
        } // end if scripts
      }
    }); // end html files forEach

    versionsJsonFileContent['modified'] = new Date().getTime();
    grunt.file.write(versionsJsonFilePath, JSON.stringify(versionsJsonFileContent, null, 4));
    grunt.log.writeln(chalk.underline.cyan(versionsJsonFilePath) + ' successfully created.');
  });
};