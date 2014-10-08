module.exports = function(grunt){

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    processhtml: {
      dist: {
        files: {
          'views/index.html': ['views/template.html']
        }
      },
      // dev target necessary to overwrite processed index.html to new a dev version
      dev: {
        files: {
          'views/index.html': ['views/template.html']
        }
      },
    },
    concat: {
      options: {
        separator: ';',
      },
      globe: {
        src: [
          'public/js/Graph.js',
          'public/utils/Label.js',
          'public/utils/ObjectSelection.js',
          'public/js/sphere_graph.js',
          'public/js/client_rendering.js',
          'public/js/facebook/queryObjects.js',
          'public/js/facebook/facebookQueries.js',
          'public/js/facebook/facebookGraphAPI.js',
          'public/js/facebook/ui.js',
        ],
        dest: 'public/dist/globe.js',
      },
      index: {
        src: [
          'public/js/facebook/queryObjects.js',
          'public/js/facebook/facebookQueries.js',
          'public/js/facebook/facebookGraphAPI.js',
          'public/js/facebook/ui.js',
        ],
        dest: 'public/dist/index.js',
      },
    },

    uglify: {
      globe: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',

          mangle: {
            except: ['jQuery', 'THREE', 'FB', 'createjs', 'Tween', 'Ease']
          }
        },
        files: {
          'public/dist/globe.min.js': ['public/dist/globe.js'],
        },

      },
      index: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',

          mangle: {
            except: ['jQuery', 'THREE', 'FB', 'createjs', 'Tween', 'Ease']
          }
        },
        files: {
          'public/dist/index.min.js':['public/dist/index.js'],
        },
      },
    },

    jshint: {
      files: [
        'public/js/**/sphere_graph.js'
      ],
      options: {
        force: 'true',
      },
    },

    watch: {
      scripts: {
        files: [
          'public/js/**/*.js',
          'public/utils/*.js'
        ],
        tasks: [
          'jshint',
          'processhtml:dev',
          'concat:index',
          'uglify:index'
        ]
      },
    },

    nodemon: {
      dev: {
        script: 'server.js'
      }
    },

  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-processhtml');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-nodemon');

  // Default task(s).
  grunt.registerTask('server-dev', function (target) {
    // Running nodejs in a different process and displaying output on the main console
    var nodemon = grunt.util.spawn({
         cmd: 'grunt',
         grunt: true,
         args: 'nodemon'
    });
    nodemon.stdout.pipe(process.stdout);
    nodemon.stderr.pipe(process.stderr);

    grunt.task.run([ 'watch' ]);
  });

  grunt.registerTask('concatAll', ['concat:index']);
  grunt.registerTask('uglifyAll', ['uglify:index']);
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('build', ['concatAll', 'uglifyAll']);

  // <grunt> to run app in localhost with dependencies stored locally and sans concat, uglified files.
  grunt.registerTask('default', ['test','processhtml:dev', 'server-dev']);
  // <gunt serve-dev> to run app with dependencies served from CDN's and with concatted, minified public files.
  grunt.registerTask('serve-dist', ['test','processhtml:dist', 'server-dev']);
};