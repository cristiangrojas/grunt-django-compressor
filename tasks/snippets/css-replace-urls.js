exports.cssReplaceUrls = function(cssCode){
  var regex = /url\([.\/a-zA-Z0-9_-]*\)/g,
    occurrences = [], result;

  while( (result=regex.exec(cssCode)) ){
    occurrences.push({
      from: result.index,
      len: result[0].length
    });
  }

  // Should do it from the last to the first
  occurrences.reverse();

  occurrences.forEach(function(occurrence, index, array){
    // extract the piece of css with the url(...)
    var pieceOfCSS = cssCode.substr(occurrence.from, occurrence.len);
    // Remove un needed chars
    var justThePath = pieceOfCSS.replace('url', '')
      .replace(/[\(\)]/g, '') // remove parentheses
      .replace(/["']/g, ''); // remove quotes

    // If the static file lives in another Django application (not the main)
    // the url will be something like:
    // ../../../django_app_name/static/django_app_name/css/whatever.css
    // and in the generated folder the structure changes so it should be
    // ../django_app_name/css/whatever.css
    if( justThePath.indexOf('static') > -1 ){
      justThePath = '..' + justThePath.split('static').pop();
    }

    // Replace the original piece of code with the new one
    cssCode = cssCode.replace(pieceOfCSS, 'url(' + justThePath + ')');
  });

  return cssCode;
};