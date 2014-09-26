module.exports = function(grunt){

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      globe: {
        src: [
          'public/js/Graph.js',
          'public/utils/Label.js',
          'public/utils/ObjectSelection.js',
          'public/js/force-directed-layout.js',
          'public/js/sphere_graph.js',
          'public/js/client_rendering.js',
          'public/js/config.js',
          'public/js/facebook/queryObjects.js',
          'public/js/facebook/facebookQueries.js',
          'public/js/facebook/facebookGraphAPI.js',
          'public/js/facebook/ui.js',
        ],
        dest: 'public/dist/<%= pkg.name %>.js',
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
          'public/dist/<%= pkg.name %>.min.js': ['public/dist/<%= pkg.name %>.js'],
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
        'Gruntfile.js',
        'public/js/**/*.js',
        'server/*.js',
        './*.js',
      ],
      options: {
        force: 'true',
      },
    },

    watch: {
      scripts: {
        files: [
          'public/js/**/*.js',
          'public/utils/*.js',
        ],
        tasks: [
          'concat:globe',
          'concat:index',
          'uglify:globe',
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

  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('build', ['concat:index','concat:globe', 'uglify:globe','uglify:index']);
  grunt.registerTask('default', ['test','build']);
};