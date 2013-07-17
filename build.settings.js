({
	baseUrl: ".",
	name: "core",
	optimize: "uglify2",
	uglify2: {
		output: {
			beautify: true,
		},
		compress: {
			sequences: true,
			global_defs: {
				DEBUG: false
			}
		},
	},
	warnings: true,
	mangle: true,
	shim: {
		'glmatrix': {
			exports: 'glmatrix'
		}
	},
	out: "html/scripts/chester.min.js"
})
