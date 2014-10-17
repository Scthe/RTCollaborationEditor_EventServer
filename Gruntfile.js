module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.initConfig({
    mochaTest: {
      specs: {
        options: {
          ui: 'bdd',
          reporter: 'list',
          require: ['./test/helpers', './test/promise-sync'],
          clearRequireCache: true
        },
        src: ['test/specs/**/*.js']
      }
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },
    watch: {
      js: {
        options: {
          spawn: false
        },
        files: [
          'test/specs/**/*.js',
          'server/**/*.js'
        ],
        tasks: ['mochaTest']
      }
    }
  });

  grunt.registerTask('default', 'watch');
  grunt.registerTask('test', ['mochaTest', 'karma']);
  grunt.registerTask('mocha', ['mochaTest']);

  // On watch events, if the changed file is a test file then configure mochaTest to only
  // run the tests from that file. Otherwise run all the tests
  var defaultTestSrc = grunt.config('mochaTest.test.src');
  grunt.event.on('watch', function(action, filepath) {
    grunt.config('mochaTest.test.src', defaultTestSrc);
    if (filepath.match('test/')) {
      grunt.config('mochaTest.test.src', filepath);
    }
  });

};