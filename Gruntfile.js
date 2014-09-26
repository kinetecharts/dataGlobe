module.exports = function(grunt){

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      dist: {
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
        ],
        dest: 'public/dist/<%= pkg.name %>.js',
      },
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'public/dist/<%= pkg.name %>.js',
        dest: 'public/dist/<%= pkg.name %>.min.js'
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
          'concat',
          'uglify'
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
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('default', ['test','build']);
};