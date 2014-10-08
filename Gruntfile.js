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
      index: {
        src: [
           "js/facebook/facebookGraphAPI.js",
           "js/helvetiker_bold.typeface.js",
           "webgl-frameworks/three.js" ,
           "webgl-frameworks/OrbitControls.js",
           "webgl-frameworks/FlyControls.js",
           "webgl-frameworks/easeljs-0.7.1.min.js",
           "webgl-frameworks/tweenjs-0.5.1.min.js",
           "webgl-frameworks/ease.js",
           "utils/Label.js",
           "utils/ObjectSelection.js",
           "js/Graph.js",
           "js/graph_actions.js",
           "js/sphere_graph.js",
           "js/client_rendering.js",
           "js/facebook/queryObjects.js",
           "js/facebook/facebookQueries.js"
        ],
        dest: 'public/dist/index.js'
      },
      appBackbone: {
        src: [
          "js/backbone/LoginModel.js",
          "js/backbone/AppView.js"
        ],
        dest: 'public/dist/appBackbone.js'
      }
    },

    uglify: {
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