# grunt-django-compressor

> A Grunt plugin to iterate over every html file and compress JavaScripts and StyleSheets.

## Getting Started

This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-django-compressor --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-django-compressor');
```

## The "django_compressor" task

### Overview
In your project's Gruntfile, add a section named `django_compressor` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
    django_compressor: {
        my_app_javascript: {
            options: {
                startTag: '<!--SCRIPTS-->',
                endTag: '<!--SCRIPTS END-->',
                excludedDirs: [
                    'node_modules/'
                ]
            },
        },
    },
});
```

### Important notes

#### Sample django project

There is a Django project I've created for you to see the `grunt-django-compressor` working and I named it [superheroes_store](https://github.com/cristiangrojas/superheroes_store), it's basically a super simple application which has a tipically Django structure.

You can clone it in your local machine and do some experiments with the plugin, there is a README which will show you the instructions to install and run it.

[Click here to see superheroes_store on github](https://github.com/cristiangrojas/superheroes_store)

#### {{ DEBUG }} variable

`{{ DEBUG }}` variable is used by this grunt plugin to determine when to use uncompressed files (development) and when to use compressed files (production).

You will need to have this variable available in your template, to do that you should have a `context_processor` like this:

https://github.com/cristiangrojas/superheroes_store/blob/master/utils/context_processors.py

Keep in mind that you will need to have it in your `TEMPLATE_CONTEXT_PROCESSORS` in the `settings.py`

#### Testing in local

To test `grunt-django-compressor` in your development enviroment you should set `DEBUG` to `True` in the `settings.py` file, then you should run the `python manage.py collectstatic` command.

A folder usually called "generated" (depends of your `STATIC_ROOT` setting) will be created in your django project folder and there will be all the statics from every application where you have an "static" folder.

You'll also need to serve static files by mapping the static url:

```py
(
    r'^static/(?P<path>.*)$',
    'django.views.static.serve',
    {'document_root': settings.STATIC_ROOT}
),
```

You can see the full implementation in this file:

https://github.com/cristiangrojas/superheroes_store/blob/master/superheroes_store/urls.py

### Options

#### startTag
Type: `String`
Default value: `<!--SCRIPTS-->`

The start tag is an HTML comment to determine where starts your javascript or css importation inside an HTML template of your django project.

#### endTag
Type: `String`
Default value: `<!--SCRIPTS END-->`

The start tag is an HTML comment to determine where starts your javascript or css importation inside an HTML template of your django project.

The `startTag` and `endTag` tags inside your template should looks something like:

```html
...

<!--SCRIPTS-->
<script src="{{ STATIC_URL }}javascript/libs/jquery/jquery-1.8.3.min.js"></script>
<script src="{{ STATIC_URL }}javascript/libs/jquery-ui/jquery-ui.min.js"></script>
...
<!--SCRIPTS END-->

...
```

#### staticFilesPath
Type: `String`
Default value: `''`

DEPRECATED (Aug 22, 2014)

#### destinationFolder
Type: `String`
Default value: `[]`

DEPRECATED (Aug 22, 2014)

#### excludedDirs
Type: `Array`
Default value: `''`

An array containing folder names that should be excluded when searching HTML files inside your django project, good examples of folders you should exclude are `node_modules`, `bower_components` and folders like them.

#### generateJsSourceMaps
Type: `Boolean`
Default value: `true`

Set to true if you want to generate source maps for your compiled js files. Source map files will have exact the same name as the javascript file with the .map extension. Will be also in the same folder (options.destinationFolder).

#### amazonS3BucketURL
Type: `String`
Default value: `''`

DEPRECATED (Aug 22, 2014)

### Usage Examples

#### Custom Options
For this example let's suppose we have a Django project called **"superheroes_store"** and the structure should looks like the following:

```
superheroes_store/
├── manage.py
├── Gruntfile.js
├── package.json
├── node_modules
│   └── ...
└── superheroes_store
    ├── __init__.py
    ├── settings.py
    ├── static
    │   ├── fonts
    │   ├── img
    │   ├── js
    │   └── stylesheets
    ├── templates
    │   └── base.html
    ├── urls.py
    └── wsgi.py
```

Based on this structure our gruntfile should be:

```js
grunt.initConfig({
    django_compressor: {
        superheroes_store_javascript: {
            options: {
                startTag: '<!--SCRIPTS-->',
                endTag: '<!--SCRIPTS END-->',
                excludedDirs: [
                    'node_modules/',
                ]
            }
        }
    },
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

#### v0.2.72
date: Sept 9, 2014
##### Changes:
* Removing old files with regexp to match also the file extension

#### v0.2.7
date: Sept 9, 2014
##### Changes:
* Replaced MD5 in the filename with a timestamp.
* Re-implemented ?version=[MD5-code]
* Fixes in documentation

#### v0.2.6
date: Sept 8, 2014
##### Changes:
* Now the MD5 hash for all found files is being added in the compressed file name to prevent errors that occurs with files with the same name that doesn't changes in the server.

#### v0.2.52
date: Sept 5, 2014
##### Changes:
* Fixed error when looking for some file in every django application static folder

#### v0.2.5
date: Aug 22, 2014
##### Changes:
* Looking for static files inside every Django app inside the project.
* Removed unneeded options: `staticFilesPath`, `destinationFolder` and `amazonS3BucketUrl` because with the new implementation.
* Ability to use `{% static %}` template tag or `{{ STATIC_URL }}` variable.
* Generating well formatted source maps for javascript compiled files, now amazon bucket url option is not needed because I'm always working with keeping in mind the /generated/ folder structure.

#### v0.2.21
date: Aug 14, 2014
##### Changes:
* Fixed an error with the sourceMap in json format.

#### v0.2.18
date: Aug 14, 2014
##### Changes:
* Added two new options: generateJsSourceMaps & amazonS3BucketURL. Ability to decide if the plugin should or not generate js source maps. Ability to provide Amazon S3 bucket name if the app uses this service in a production environment.

#### v0.2.17
date: Aug 14, 2014
##### Changes:
* Replaced cache version from a datetime to a MD5 (unique for each file) to prevent commits with large amount of changes when updating this plugin

#### v0.2.16
date: Aug 14, 2014
##### Changes:
* Implemented source maps for javascript minified files to be able to debug in modern browsers

#### v0.2.14
date: Aug 13, 2014
##### Changes:
* Fixed error with double django-application name in file names

#### v0.2.13
date: Aug 13, 2014
##### Changes:
* Generating unique file names based in the path of the file. Ex: `./my_django_app/templates/base.html` will result in a file called `my_django_app.base.js`