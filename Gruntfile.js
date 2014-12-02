module.exports = function (grunt) {
  'use strict';

  /*
   Windows grunt-mocha-casperjs fix:
   1. open node_modules\grunt-mocha-casperjs\node_modules\.bin\mocha-casperjs.cmd
   2. replace line 4 with:
   "%~dp0\..\mocha-casperjs\bin\mocha-casperjs" %*
   3. open node_modules\grunt-mocha-casperjs\node_modules\mocha-casperjs\bin\mocha-casperjs.bat
   4. replace last line with:
   %MOCHA_CASPER_PATH%.\..\..\casperjs\bin\casperjs.exe %MOCHA_CASPER_PATH%\cli.js --mocha-casperjs-path=%MOCHA_CASPER_PATH%.. %*

   For some reason it was checking if sh was available and if NOT then execute mocha-casperjs through sh. Relative path to casperjs was also wrong.

   TODO write script to do this.

   */

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-casperjs');

  grunt.initConfig({
    mochaTest     : {
      specs: {
        options: {
          ui               : 'bdd',
          reporter         : 'list',
          require          : ['./test/helpers', './test/promise-sync'],
          clearRequireCache: true
        },
        src    : ['test/specs/**/*.js']
      }
    },
    watch         : {
      js: {
        options: {
          spawn: false
        },
        files  : [
          'test/specs/**/*.js',
          'server/**/*.js'
        ],
        tasks  : ['mochaTest:specs']
      }
    },
    mocha_casperjs: {
      options: {
        ui               : 'bdd',
        reporter         : 'list',
        require          : ['./test/helpers'],
        clearRequireCache: true,

        'mocha-path'      : 'node_modules/mocha',
        'chai-path'       : 'node_modules/chai',
        'casper-chai-path': 'node_modules/casper-chai',
        timeout           : 15000,
        casperTimeout     : 14000,

        slow  : 2000,
        width : 1680,
        height: 1050
      },
      files  : {
        src: [ 'test/e2e/*.js']
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        'app.js',
        'app-test/{,*/}*.js',
        'bin/{,*/}*.js',
        'server/{,*/}*.js',
        'test/{,*/}*.js',
        'utils/{,*/}*.js',
        '!app-test/javascripts/codemirror.js'
//        'test/spec/{,*/}*.js'
      ]
    }

  });

  grunt.registerTask('default', 'watch');
  grunt.registerTask('mocha', ['mochaTest:specs']);
  grunt.registerTask('e2e', [/* 'connect', */'mocha_casperjs']);

// On watch events, if the changed file is a test file then configure mochaTest to only
// run the tests from that file. Otherwise run all the tests
  var defaultTestSrc = grunt.config('mochaTest.test.src');
  grunt.event.on('watch', function (action, filepath) {
    /* jshint unused:false */ // action is not used
    grunt.config('mochaTest.test.src', defaultTestSrc);
    if (filepath.match('test/')) {
      grunt.config('mochaTest.test.src', filepath);
    }
  });

}
;