module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({

		express: {
			options: {},
			dev: {
				options: {
					script: "bin/www"
				}
			}
		},

		sass: {                              
			dist: {                            
				options: {                       
					style: 'expanded'
				},
				files: [{
					expand: true,                   
					cwd: 'public/admin/scss/',
					src: ['*.scss'],
					dest: 'public/admin/css/',
					ext: '.css'
				}]
	    	}
	 	},

		watch: {
			express: {
				files:  [ '**/*.js', '**/*.twig', '**/*/*.twig'  ],
				tasks:  [ 'express:dev'],
				options: {
					spawn: false 
				}
			},
			sass: {
				files:  [ '**/*.scss'],
				tasks:  [ 'sass'],
				options: {
					spawn: false 
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-express-server');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-sass');

	// Default task(s).
	grunt.registerTask('default', ['express:dev', 'sass', 'watch']);

};

