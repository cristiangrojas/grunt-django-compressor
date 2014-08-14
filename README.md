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
        js: {
            my_app_javascript: {
                startTag: '<!--SCRIPTS-->',
                endTag: '<!--SCRIPTS END-->',
                staticFilesPath: 'my_django_applications/static/',
                destinationFolder: 'my_django_applications/static/dist/',
                excludedDirs: [
                    'node_modules/',
                ],
            },
        },
    },
});
```

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

The path where your django static files lives.

This plugin currently works for the traditional django application structure: a folder called "static" inside your main application folder (where the settings.py file lives), i.e.: if your project name is "my_project" your django main application will have the same name, so the static files path will be `my_project/my_project/static/`

#### destinationFolder
Type: `String`
Default value: `[]`

The path where the compressed statics will be

#### excludedDirs
Type: `Array`
Default value: `''`

An array containing folder names that should be excluded when searching HTML files inside your django project, good examples of folders you should exclude are `node_modules`, `bower_components` and folders like them.

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
            startTag: '<!--SCRIPTS-->',
            endTag: '<!--SCRIPTS END-->',
            staticFilesPath: 'superheroes_store/static/',
            destinationFolder: 'superheroes_store/static/dist/',
            excludedDirs: [
                'node_modules/',
            ],
        }
    },
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

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