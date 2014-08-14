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
  var chalk = require('chalk');
  var _ = require('underscore');
  var path = require('path');
  var minifyCSS = require('./snippets/minify-css').minifyCSS;
  var getHtmlFiles = require('./snippets/get-html-files').getHtmlFiles;
  var generateMD5fromString = require('./snippets/md5').generateMD5fromString;
  var UglifyTheJS = require('./snippets/uglify-js.js').UglifyTheJS;

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('django_compressor', 'A Grunt plugin to iterate over every HTML file and compress javascripts and stylesheets.', function() {

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
      // Should the django_compressor generates javascript source maps?
      generateJsSourceMaps: false,
      // If static files in production lives inside a amazon S3 bucket
      // the bucket name should be provided in order to generate a source map
      // with the right path
      amazonS3BucketName: ''
    });

    // Don't continue if the staticFilesOption isn't set
    if( options.staticFilesPath === '' ) 
      throw new Error(chalk.underline.red('Please specify the "staticFilesPath" option.'));

    if( options.destinationFolder === '' ) 
      throw new Error(chalk.underline.red('Please specify the "destinationFolder" option.'));

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


    // 1st STEP
    //
    // Get all HTML files
    // -------------------------------------------------------------------------
    var htmlFiles = getHtmlFiles('.', options.excludedDirs);


    // 2nd STEP
    //
    // Iterate over every HTML file
    // -------------------------------------------------------------------------
    htmlFiles.forEach(function(htmlFilePath){
      // Variable to store the found JS or CSS files inside the HTML file
      var foundFiles;

      // HTML file content
      var htmlFile = grunt.file.read(htmlFilePath);


      // 3rd STEP
      //
      // Look for the start and end tags inside the HTML file to determine if
      // there are JS or CSS files.
      //
      // If static files found generate an array with the file paths.
      // -----------------------------------------------------------------------
      var indexOfStartTag = htmlFile.indexOf(options.startTag);
      if( indexOfStartTag > -1 ){
        grunt.log.writeln(chalk.yellow(options.startTag) + ' tag was found in "' + chalk.underline.cyan(htmlFilePath) + '"');

        // send the indexOfStartTag number to start looking at this point
        var indexOfEndTag = htmlFile.indexOf(options.endTag, indexOfStartTag);
        if( indexOfStartTag === -1 || indexOfEndTag === -1 || indexOfStartTag >= indexOfEndTag ){
          // There are not JS or CSS files
          foundFiles = false;
        } else {
          // The file contains start and end tag
          // Determine where stars and finish the scripts section
          var substrStart = indexOfStartTag + options.startTag.length,
            substrEnd = (indexOfEndTag - 1) - substrStart;
          // Store the scripts section in the scripts var
          foundFiles = htmlFile.substr(substrStart, substrEnd);

          // Determine the indentation level by getting it from the first script
          // tag in the HTML.
          // TODO the following code can be considered as a hack :P
          var foundFilesArr = foundFiles.split('</script>'),
            firstFileInArr = foundFilesArr[0].replace(/\n/, ''), // replace new-line chars
            padding = '';

          for(var i=0; i <= firstFileInArr.length; i++){
            var ch = firstFileInArr.charAt(i);
            if( ch == ' ' ){
              padding += ' ';
            } else {
              break; // exit from the loop
            }
          }


          // Look for all src="*" or href="*" parts in the script or CSS string
          var regexp;
          if( foundFiles.indexOf('css') > -1 ){
            regexp = /href=".*?"/g;
          } else if( foundFiles.indexOf('js') > -1 ){
            regexp = /src=".*?"/g;
          }
          // match them and return as an array
          foundFiles = foundFiles.match(regexp);
          // Create a new array and remove unneeded chars in the script path
          var tempArr = [];
          foundFiles.forEach(function(file){
            // TODO: should throw an error if staticFilesDjangoPrefix not set?
            file = file.replace(/"/g, '')
              .replace('src=', '').replace('href=', '')
              .replace(options.staticFilesDjangoPrefix, '');

            // Construct the absolute path
            file = options.staticFilesPath + file;
            tempArr.push(file);
          });
          foundFiles = tempArr;
        }


        // 4th STEP
        //
        // Verify if the files exists, warn if not.
        //
        // Iterate over files and compress them in one minified file with the
        // same name as the HTML file.
        //
        // Update the versions JSON file with MD5 codes for each found static
        // file to determine changes and avoid compressing all files every time
        // this task is executed.
        // ---------------------------------------------------------------------
        if( foundFiles ){
          // Warn if any source file doesn't exists
          // --------------------------------------------------
          foundFiles.every(function(filepath, index, array){
            if ( !grunt.file.exists(filepath) ){
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false; // exit from the loop
            }
            return true; // continue with the loop
          });

          // Generate a unique file for this file
          // The theory:
          // The template name is "contract_form.html" inside a django application in your project
          // called "my_django_application" so the path for this file will be:
          // ./my_django_application/templates/my_django_application/contract_form.html
          // The filename should be: 'my_django_application.contract_form.js' in order to follow this
          // structure: {appname}.[subfolders-excluding-redundant-application-name].{template-name}.{extension}
          var htmlFileName = htmlFilePath.split('/').pop(),
            // TODO verify if all files has the same extension
            foundFilesExtension = foundFiles[0].split('.').pop();

          var destFileName = htmlFilePath
            .substr(1)// remove the first character from the file path (a dot ".")
            .replace(/templates/g, '') // this removes the "templates" string and generates double slashes "//"
            .replace(/\/\//g, '/') // this replaces the double slashes by only one
            .replace(/\//g, '.') // and replace all slashes with "."
            .replace('.html', '.' + foundFilesExtension); // finally put the right extension to the file (.js or .css)

          if( destFileName.charAt(0) == '.' ) destFileName = destFileName.substr(1); // remove the first dot if exist

          // Remove repeated application name
          // at this point we have something like:
          // my_django_application.my_django_application.contract_form.html
          // Noticed the duplicated application name?

          // first get the app name
          var djangoAppName = destFileName.split('.')[0];

          // Check if the app name is duplicated, if so remove the first occurrence and the new first dot "."
          if( destFileName.replace(djangoAppName, '').indexOf(djangoAppName) > -1 )
            destFileName = destFileName.replace(djangoAppName, '').substr(1);

          var destFile = options.destinationFolder + destFileName; // destination file full path


          // Generate a json file with HTML file name and scripts with MD5 hex
          // hash to detect if files changed in the next iteration

          // Flag to check if at least one file has changed
          var atLeastOneFileHasChanged = false;
          // Generate an MD5 for an string with the paths of found files,
          // this will determine if an static file was added or removed. In any
          // of that cases it means the compressed file should be created.
          var MD5forAllFiles = generateMD5fromString(foundFiles.join(';'));

          foundFiles.forEach(function(filepath, index, array){
            var fileContent = grunt.file.read(filepath);
            var MD5forThisFile = generateMD5fromString(fileContent);

            if( !versionsJsonFileExists ){
              // stamp the created time
              versionsJsonFileContent['created'] = new Date().getTime();
              if( !versionsJsonFileContent[htmlFilePath] ){
                versionsJsonFileContent[htmlFilePath] = {};
                versionsJsonFileContent[htmlFilePath][foundFilesExtension] = {};
                // Append the MD5 version for the found files to look for changes
                // the next time
                versionsJsonFileContent[htmlFilePath][foundFilesExtension]['version'] = MD5forAllFiles;
              }
              versionsJsonFileContent[htmlFilePath][foundFilesExtension][filepath] = MD5forThisFile;

              // If the versions file doesn't exists yet it means that it should
              // be created and I need to make the atLeastOneFileHasChanged true
              // to trigger the creation of the compressed static file
              if( !atLeastOneFileHasChanged ) atLeastOneFileHasChanged = true;
            } else {
              var previousMD5;

              try {
                previousMD5 = versionsJsonFileContent[htmlFilePath][foundFilesExtension][filepath];
              } catch (err){
                // TODO the following lines looks dirty
                if( !versionsJsonFileContent[htmlFilePath] ){
                  versionsJsonFileContent[htmlFilePath] = {};
                }
                if( !versionsJsonFileContent[htmlFilePath][foundFilesExtension] ){
                  versionsJsonFileContent[htmlFilePath][foundFilesExtension] = {};
                }
                previousMD5 = null;
              }

              if( previousMD5 !== MD5forThisFile ){
                // set this flag to true to compress the statics
                if( !atLeastOneFileHasChanged ) atLeastOneFileHasChanged = true;
                // write the new MD5 for this file
                versionsJsonFileContent[htmlFilePath][foundFilesExtension][filepath] = MD5forThisFile;
                grunt.log.writeln(chalk.underline.cyan(filepath) + ' in ' + chalk.underline.cyan(htmlFilePath) + ' has changed.');
              }
            }
          });

          // Check if the "all files" MD5 has changed, when true trigger the
          // compression of the statics. It means something added or removed
          var previousMD5forAllFiles = versionsJsonFileContent[htmlFilePath][foundFilesExtension]['version'];
          if( MD5forAllFiles !== previousMD5forAllFiles ){
            versionsJsonFileContent[htmlFilePath][foundFilesExtension]['version'] = MD5forAllFiles;
            if( !atLeastOneFileHasChanged ) atLeastOneFileHasChanged = true;
            grunt.log.writeln('Looks like you added new ' + chalk.cyan(foundFilesExtension) + ' files to the ' + chalk.underline.cyan(htmlFilePath) + ' file.');
          }

          if( atLeastOneFileHasChanged ){

            var fileVersion = ''; // this will be filled with an MD5 depending of the compressed file contents

            // Compress the files and save them in a compressed file
            // -----------------------------------------------------------------
            if( foundFilesExtension == 'css' ){

              var data = foundFiles.map(function(filepath){
                return '@import url(' + filepath.replace(options.staticFilesPath, '../') + ');';
              }).join('');

              var minifiedCSSFile = minifyCSS(data, {
                root: path.join(process.cwd(), options.destinationFolder)
              });

              fileVersion = generateMD5fromString(minifiedCSSFile);

              grunt.file.write(destFile, minifiedCSSFile);

            } else if( foundFilesExtension == 'js' ){
              var minifiedJsFile;

              // Options to pass to the UglifyJS.minify
              var UglifyJSOptions = {
                mangle: true,
                compress: true
              };

              if( options.generateJsSourceMaps ){
                var sourceMapFilePath = destFile + '.map';

                // Calculate the source root
                // Source root should be the relative path from where the dist file lives
                // (the destinationFolder option) to the folder where the Gruntfile.js lives.
                var sourceRoot = path.relative(options.destinationFolder, '');

                _.extend(UglifyJSOptions, {
                  outSourceMap: sourceMapFilePath.split('/').pop(), // just the filename
                  sourceRoot: sourceRoot
                });

                UglifyTheJS(foundFiles, UglifyJSOptions, function(minifiedJsFile){
                  fileVersion = generateMD5fromString(minifiedJsFile.code);
                  grunt.file.write(destFile, minifiedJsFile.code);

                  if( options.amazonS3BucketName == ''){
                    grunt.file.write(sourceMapFilePath, minifiedJsFile.map);
                  } else {
                    var mapCopy = minifiedJsFile.map;

                    mapCopy = JSON.parse(mapCopy); // because minifiedJsFile.map is a string

                    mapCopy.sources.forEach(function(element, index, array){
                      var parts = element.split('/');
                      parts[0] = options.amazonS3BucketName;
                      mapCopy.sources[index] = parts.join('/');
                    });

                    mapCopy = JSON.stringify(mapCopy); // to string again

                    grunt.file.write(sourceMapFilePath, mapCopy);
                  }
                });
              } else {
                UglifyTheJS(foundFiles, UglifyJSOptions, function(minifiedJsFile){
                  fileVersion = generateMD5fromString(minifiedJsFile.code);
                  grunt.file.write(destFile, minifiedJsFile.code);
                });
              }
            }

            grunt.log.writeln('File "' + chalk.underline.cyan(destFile) + '" created.');

            // Write the template with the new JS file
            // -----------------------------------------------------------------
            var djangoStartTag = '{# GRUNT_DJANGO_COMPRESSOR ' + foundFilesExtension.toUpperCase() + ' #}';
            var djangoEndTag = '{# GRUNT_DJANGO_COMPRESSOR ' + foundFilesExtension.toUpperCase() + ' END #}';

            var htmlFileAlreadyParsed = false;
            if( htmlFile.indexOf(djangoStartTag) > -1 ) htmlFileAlreadyParsed = true;

            var newHtmlTag = '';

            if( foundFilesExtension == 'css' ){
              newHtmlTag = '<link rel="stylesheet" type="text/css" href="'
                + destFile.replace(options.staticFilesPath, options.staticFilesDjangoPrefix)
                + '?version=' + fileVersion + '">';
            } else if( foundFilesExtension == 'js' ){
              newHtmlTag = '<script type="text/javascript" src="'
              + destFile.replace(options.staticFilesPath, options.staticFilesDjangoPrefix)
              + '?version=' + fileVersion + '"></script>';
            }

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
                + newHtmlTag
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
                + newHtmlTag
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
    }); // end HTML files forEach

    versionsJsonFileContent['modified'] = new Date().getTime();
    grunt.file.write(versionsJsonFilePath, JSON.stringify(versionsJsonFileContent, null, 4));
    grunt.log.writeln(chalk.underline.cyan(versionsJsonFilePath) + ' successfully updated.');
  });
};