/*
 * Get HTML files function
 * -----------------------------------------------------------------------------
 *
 * An useful utility to iterate over every folder in any path and return an
 * array containing all HTML files inside.
 *
 * You can exclude folders by name by passing it as an excluded dirs array
 *
 * */

var fs = require('fs');

exports.getHtmlFilesAndStaticFolders = function(directory, excludedDirs){
  excludedDirs = excludedDirs || [];

  // Variable to store the encountered HTML files
  var htmlFiles = [];
  var staticFolders = [];

  // Function to get files of a directory
  function getFiles(directory){
    var files = fs.readdirSync(directory);
    for(var i in files){
      if(!files.hasOwnProperty(i)) continue;
      var name = directory+'/'+files[i];

      // Identify if this folder is a static folder of the Django project
      if( name.split('/').pop() == 'static' ){
        staticFolders.push(name);
      }

      // Exclude if name in excluded folders option
      var thisFolderShouldBeExcluded = false;
      excludedDirs.forEach(function(excludedFileName){
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

  getFiles(directory);

  return {
    htmlFiles: htmlFiles,
    staticFolders: staticFolders
  };
};