/**
 * chesterGL - Simple 2D WebGL Library
 *
 * Copyright (c) 2010-2012 Rolando Abarca
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

define(["require", "glmatrix", "chester/block", "chester/blockGroup", "chester/blockFrames", "chester/actions"], function (require, glmatrix) {
	// we will setup this modules later
	var coreModules = [
		"block",
		"blockGroup",
		"blockFrames",
		"actions"
	];
	var actions = null;

	// public interface
	var core = {};
	// private namespace
	var _core = {};

	/**
	 * @ignore
	 * @type {glmatrix.vec2}
	 */
	_core.canvas_tmp_mouse = new glmatrix.vec2.fromValues(0, 0);

	/**
	 * @ignore
	 * @param {Event} evt
	 * @return {goog.math.Vec2}
	 */
	HTMLCanvasElement.prototype.relativePosition = function (evt) {
		var rect = this.getBoundingClientRect(),
			height = (_core.highDPI ? this.height / core.devicePixelRatio : this.height),
			pt = _core.canvas_tmp_mouse;
		if (evt.changedTouches) {
			var t = evt.changedTouches[0];
			pt.x = t.clientX - rect.left;
			pt.y = height - (t.clientY - rect.top);
		} else {
			pt.x = evt.clientX - rect.left;
			pt.y = height - (evt.clientY - rect.top);
		}
		return pt;
	};

	(function (w) {
		if (typeof w.requestAnimationFrame === 'undefined') {
			if (typeof w.webkitRequestAnimationFrame !== 'undefined') {
				w.requestAnimationFrame = w.webkitRequestAnimationFrame;
			} else if (typeof mozRequestAnimationFrame !== 'undefined') {
				w.requestAnimationFrame = w.mozRequestAnimationFrame;
			} else if (typeof msRequestAnimationFrame !== 'undefined') {
				w.requestAnimationFrame = w.msRequestAnimationFrame;
			} else if (typeof oRequestAnimationFrame !== 'undefined') {
				w.requestAnimationFrame = w.oRequestAnimationFrame;
			} else {
				console.log("using setTimeout as requestAnimationFrame");
				w.requestAnimationFrame = function (callback) {
					window.setTimeout(callback, 1000 / 60);
				};
			}
		}
	})(window);

	/**
	 * chesterGL version
	 * @const
	 * @type {string}
	 */
	core.VERSION = '0.5';

	/**
	 * @type {boolean}
	 */
	core.onFakeWebGL = false;
	(function () {
		if (typeof runScript !== 'undefined') {
			core.onFakeWebGL = true;
			// change the mat mult function
			goog.vec.Mat4.multMat = _mat4mul;
			goog.vec.Mat4.multVec3 = _mat4mulvec3;
			goog.vec.Mat4.translate = _mat4translate;
			goog.vec.Mat4.rotate = _mat4rotate;
			goog.vec.Mat4.scale = _mat4scale;
		}
	})();

	/**
	 * Basic settings for chesterGL
	 * Settings:
	 * <ul>
	 * <li>useGoogleAnalytics: whether or not to track fps and send analytics. Will send every 5 seconds</li>
	 * <li>projection: "3d" or "2d" (ortho)</li>
	 * <li>webglMode: true to try for webGL, false to force canvas mode</li>
	 * <li>canvasOriginTopLeft: If true makes 0,0 the Top-Left corner. If false makes 0,0 the Bottom-Left</li>
	 * <li>backgroundColor: Canvas Background Color</li>
	 * <li>useHighDPI: set to true to check whether or not we should check for highDPI. Setting this to false
	 *     will use the true size of the images, whether or not they have the proper prefix.</li>
	 * <li>highDPIPrefix: the prefix to use for highDPI images. Defaults to "@__PR__x", where the string
	 *     "__PR__" will be replaced for the current pixel ratio.</li>
	 * </ul>
	 * @type {Object.<string,string|boolean,Float32Array>}
	 * @example
	 * // use google analytics and force canvas mode
	 * core.settings.useGoogleAnalytics = true;
	 * core.settings.webglMode = false;
	 * core.settings.backgroundColor = [0,0,0,0];
	 * core.setup('canvas-id');
	 */
	core.settings = {
		useGoogleAnalytics: false,
		projection: '3d',
		webglMode: true,
		usesOffscreenBuffer: false,
		basePath: '',
		canvasOriginTopLeft: false,
		backgroundColor: [0, 0, 0, 1],
		useHighDPI: true,
		highDPIPrefix: '@__PR__x'
	};

	/**
	 * This is the WebGL context
	 *
	 * @type {?WebGLRenderingContext|CanvasRenderingContext2D}
	 * @ignore
	 */
	core.gl = null;

	/**
	 * @type {boolean}
	 * @ignore
	 */
	_core.paused = false;

	/**
	 * @type {Object.<string,WebGLProgram>}
	 * @ignore
	 */
	_core.programs = {};

	/**
	 * @type {?string}
	 * @ignore
	 */
	_core.currentProgram = null;

	/**
	 * @type {?goog.vec.Mat4.Type}
	 * @ignore
	 */
	core.pMatrix = null;

	/**
	 * @type {?chesterGL.Block}
	 */
	_core.runningScene = null;

	/**
	 * @type {?HTMLElement|FakeCanvas}
	 * @ignore
	 */
	_core.canvas = null;

	/**
	 * whether or not to debug sprites (show bounding box)
	 * set this by adding a ?_cdbg=1 to the url of the document
	 * @type {boolean}
	 */
	_core.debugSprite = false;

	/**
	 * Whether or not we're running on a highDPI device
	 * @type {boolean}
	 */
	_core.highDPI = false;

	/**
	 * @type {Object.<string,Object>}
	 * @ignore
	 */
	_core.assets = {};

	/**
	 * the asset-loaded handlers
	 * @type {Object.<string,Function>}
	 * @ignore
	 */
	_core.assetsHandlers = {};

	/**
	 * the asset loader: it specifies how a type of asset should be loaded.
	 * The default for textures is creating a new Image() element, the default for any other
	 * type is jquery's $.ajax asynchronously.
	 * @type {Object.<string,Function>}
	 * @ignore
	 */
	_core.assetsLoaders = {};

	/**
	 * @type {Object.<string,Array>}
	 * @ignore
	 */
	_core.assetsLoadedListeners = {};

	/**
	 * the time last frame was rendered
	 * @type {number}
	 * @ignore
	 */
	_core.lastTime = Date.now();

	/**
	 * delta in seconds from last frame
	 * @type {number}
	 * @ignore
	 */
	core.delta = 0;

	/**
	 * @enum {number}
	 */
	core.MOUSE_EVENTS = {
		DOWN: 0,
		MOVE: 1,
		UP: 2,
		ENTER: 3,
		LEAVE: 4
	};

	/**
	 * @enum {number}
	 */
	core.KEYBOARD_EVENTS = {
		FOCUS: 0,
		KEY_DOWN: 1,
		KEY_PRESS: 2,
		KEY_UP: 3
	};

	/**
	 * The stats object
	 * @type {Object}
	 */
	_core.stats = null;

	/**
	 * the global list of mouse down handlers
	 * @type {Array.<function(goog.vec.Vec3.Vec3Like, chesterGL.mouseEvents)>}
	 * @ignore
	 */
	_core.mouseHandlers = [];

	/**
	 * sets the current program, also sets the uniforms for that shader
	 *
	 * @param {string} program
	 * @return {WebGLProgram}
	 * @ignore
	 */
	core.selectProgram = function (program) {
		var prog = _core.programs[program];
		var gl = core.gl;
		if (program != _core.currentProgram) {
			// console.log("selecting program " + program);
			_core.currentProgram = program;
			// gl.validateProgram(prog);
			gl.useProgram(prog.glProgram);
			// enable attribs
			for (var attr in prog.attribs) {
				// console.log("  enabling attribute " + attr);
				gl.enableVertexAttribArray(prog.attribs[attr]);
			}
		}
		return prog;
	};

	/**
	 * setups chester and loads the core modules. This must be the first call for chester
	 * @param {string} canvasId
	 */
	core.setup = function (canvasId) {
		var canvas = core.onFakeWebGL ? new FakeCanvas(innerWidth, innerHeight) : document.getElementById(canvasId);
		var settings = core.settings;

		core.initGraphics(canvas);
		if (settings.webglMode) {
			core.initDefaultShaders();
		}
		core.setBackgroundColor(settings.backgroundColor);

		// register the default handler for textures
		core.registerAssetHandler('texture', _core.defaultTextureHandler);
		core.registerAssetHandler('default', _core.defaultAssetHandler);
		core.registerAssetLoader('texture', _core.defaultTextureLoader);
		core.registerAssetLoader('default', _core.defaultAssetLoader);

		// create the stats objects (if the Stats.js library is included)
		if (typeof Stats !== 'undefined') {
			console.log("chesterGL: adding stats");
			_core.stats = new Stats();
			_core.stats['setMode'](1);
			if (!core.onFakeWebGL) {
				_core.stats['domElement']['style']['position'] = 'absolute';
				_core.stats['domElement']['style']['left'] = '0px';
				_core.stats['domElement']['style']['top'] = '0px';
				document.body.appendChild(_core.stats['domElement']);
			}
		}
		// setup the rest of the core
		coreModules.forEach(function (m) {
			require("chester/" + m).setup(core);
		});
		// cache some modules
		actions = require("chester/actions");
	};

	/**
	 * tryies to init the graphics stuff:
	 * 1st attempt: webgl
	 * fallback: canvas
	 *
	 * @param {FakeCanvas|HTMLElement} canvas
	 */
	core.initGraphics = function (canvas) {
		var desiredWidth = 0,
			desiredHeight = 0;
		var settings = core.settings;
		try {
			// test for high-dpi device
			if (settings.useHighDPI && window.devicePixelRatio && window.devicePixelRatio > 1) {
				var devicePixelRatio = window.devicePixelRatio;
				desiredWidth = canvas.width;
				desiredHeight = canvas.height;
				canvas.width = canvas.clientWidth * devicePixelRatio;
				canvas.height = canvas.clientHeight * devicePixelRatio;
				canvas.style.width = desiredWidth + "px";
				canvas.style.height = desiredHeight + "px";
				_core.highDPI = true;
				_core.devicePixelRatio = window.devicePixelRatio;
				console.log("using HighDPI resolution (devicePixelRatio: " + devicePixelRatio + ")");
			} else {
				desiredWidth = canvas.width;
				desiredHeight = canvas.height;
			}

			if (settings.webglMode) {
				if (typeof WebGLDebugUtils !== "undefined") {
					console.log("**** using debug context");
					canvas = WebGLDebugUtils['makeLostContextSimulatingCanvas'](canvas);
				}
				core.gl = canvas.getContext("experimental-webgl", {alpha: true, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false});
				// add context loosing event listeners
				canvas.addEventListener("webglcontextlost", function (event) {
					event.preventDefault();
					cancelAnimationFrame(_core.reqFrameId);
				}, false);
				canvas.addEventListener("webglcontextrestored", function (event) {
					event.preventDefault();
					_core.resetContext();
				}, false);
			}
			_core.canvas = canvas;
		} catch (e) {
			console.log("ERROR: " + e);
		}
		if (!core.gl) {
			// fallback to canvas API
			var offCanvas = document.createElement("canvas");
			offCanvas.width = desiredWidth;
			offCanvas.height = desiredHeight;
			core.gl = offCanvas.getContext("2d");
			// save the front context
			_core.frontGL = canvas.getContext("2d");
			// save the off canvas
			_core.offCanvas = offCanvas;
			if (!core.gl || !_core.frontGL) {
				throw "Error initializing graphic context!";
			}
			settings.webglMode = false;
		}

		// first resize of the canvas
		core.gl.viewportWidth = desiredWidth;
		core.gl.viewportHeight = desiredHeight;

		// install touch & mouse handlers
		core.installMouseHandlers();
	};

	/**
	 * called when we need to reset the GL context
	 * @ignore
	 */
	_core.resetContext = function () {
		var canvas = _core.canvas;
		if (core.settings.webglMode) {
			core.initDefaultShaders();
			for (var key in _core.assets['texture']) {
				var tex = _core.assets['texture'][key];
				tex.data.tex = core.gl.createTexture();
				core.prepareWebGLTexture(tex.data);
			}
			// helper function to recreate all the buffers of the blocks
			var createBuffers = function (b) {
				b.createBuffers(null, null, true);
				b.children.forEach(function (child) {
					createBuffers(child);
				});
			};
			createBuffers(_core.runningScene);
		}
		// setup the projection again
		core.setupPerspective();
		// start the loop again
		_core.currentProgram = null;
		core.run();
	};

	/**
	 * returns the size of the current viewport
	 * @return {Object.<string,number>}
	 */
	core.getViewportSize = function () {
		return {width: core.gl.viewportWidth, height: core.gl.viewportHeight};
	};

	/**
	 * init the default shader
	 * @ignore
	 */
	core.initDefaultShaders = function () {
		var gl = core.gl;

		core.initShader("default", function (program) {
			gl.bindAttribLocation(program.glProgram, 0, "aVertexPosition");
			gl.bindAttribLocation(program.glProgram, 1, "aVertexColor");
			program.attribs = {
				'vertexPositionAttribute': 0,
				'vertexColorAttribute': 1
			};
		}, function (program) {
			program.mvpMatrixUniform = gl.getUniformLocation(program.glProgram, "uMVPMatrix");
		});

		core.initShader("texture", function (program) {
			gl.bindAttribLocation(program.glProgram, 0, "aVertexPosition");
			gl.bindAttribLocation(program.glProgram, 1, "aVertexColor");
			gl.bindAttribLocation(program.glProgram, 2, "aTextureCoord");
			program.attribs = {
				'vertexPositionAttribute': 0,
				'vertexColorAttribute': 1,
				'textureCoordAttribute': 2
			};
		}, function (program) {
			program.mvpMatrixUniform = gl.getUniformLocation(program.glProgram, "uMVPMatrix");
			program.samplerUniform = gl.getUniformLocation(program.glProgram, "uSampler");
		});
	};

	/**
	 * init shaders (fetches data - in a sync way)
	 * @param {string} prefix
	 * @param {function(Object)} prelinkCallback
	 * @param {function(Object)} postlinkCallback
	 * @ignore
	 */
	core.initShader = function (prefix, prelinkCb, postlinkCb) {
		var gl = core.gl;
		var fsData = core.loadShader(prefix, "frag");
		var vsData = core.loadShader(prefix, "vert");

		var fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, fsData);
		gl.compileShader(fs);

		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS) && !gl.isContextLost()) {
			console.log("problem compiling fragment shader " + prefix + " (" + gl.getShaderInfoLog(fs) + "):\n" + fsData);
			return;
		}

		var vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, vsData);
		gl.compileShader(vs);
		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) && !gl.isContextLost()) {
			console.log("problem compiling vertex shader " + prefix + " (" + gl.getShaderInfoLog(vs) + "):\n" + vsData);
			return;
		}

		var program = gl.createProgram();
		var wrapper = {
			glProgram: program
		};
		gl.attachShader(program, fs);
		gl.attachShader(program, vs);
		// do any stuff before linking
		prelinkCb && prelinkCb(wrapper);
		// continue with the linking
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
			console.log("problem linking shader");
			return;
		}
		gl.useProgram(program);
		postlinkCb && postlinkCb(wrapper);
		_core.programs[prefix] = wrapper;
	};

	/**
	 * loads the shader data
	 * @return {string}
	 * @ignore
	 */
	core.loadShader = function (prefix, type) {
		var shaderData = "";
		if (prefix == "default" || prefix == "texture") {
			// these are going to be packed in the source code now
			if (type == "frag") {
				if (prefix == "default") {
					shaderData = "#ifdef GL_ES\n" +
								 "precision mediump float;\n" +
								 "#endif\n" +
								 "varying vec4 vColor;\n" +
								 "void main(void) {\n" +
								 "    gl_FragColor = vColor;\n" +
								 "}";
				} else {
					shaderData = "#ifdef GL_ES\n" +
								 "precision mediump float;\n" +
								 "#endif\n" +
								 "uniform sampler2D uSampler;\n" +
								 "varying vec4 vColor;\n" +
								 "varying vec2 vTextureCoord;\n" +
								 "void main(void) {\n" +
								 "    vec4 textureColor = texture2D(uSampler, vTextureCoord);\n" +
								 "    gl_FragColor = textureColor * vColor;\n" +
								 "}";
				}
			} else {
				if (prefix == "default") {
					shaderData = "#ifdef GL_ES\n" +
								 "precision mediump float;\n" +
								 "#endif\n" +
								 "attribute vec3 aVertexPosition;\n" +
								 "attribute vec4 aVertexColor;\n" +
								 "uniform mat4 uMVPMatrix;\n" +
								 "varying vec4 vColor;\n" +
								 "void main(void) {\n" +
								 "    gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);\n" +
								 "    gl_PointSize = 1.0;\n" +
								 "    vColor = aVertexColor;\n" +
								 "}";
				} else {
					shaderData = "#ifdef GL_ES\n" +
								 "precision mediump float;\n" +
								 "#endif\n" +
								 "attribute vec3 aVertexPosition;\n" +
								 "attribute vec4 aVertexColor;\n" +
								 "attribute vec2 aTextureCoord;\n" +
								 "uniform mat4 uMVPMatrix;\n" +
								 "varying vec2 vTextureCoord;\n" +
								 "varying vec4 vColor;\n" +
								 "void main(void) {\n" +
								 "    gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);\n" +
								 "    vTextureCoord = aTextureCoord;\n" +
								 "    vColor = aVertexColor;\n" +
								 "}";
				}
			}
		} else {
			var req = new XMLHttpRequest();
			req.open("GET", core.settings.basePath + "shaders/" + prefix + "." + type, false);
			req.onreadystatechange = function () {
				if (req.readyState == 4 && req.status == 200) {
					shaderData = req.responseText;
				} else if (req.readyState == 4) {
					console.log("error getting the shader data");
				}
			};
			req.send();
		}
		return shaderData;
	};

	/**
	 * registers an asset loader (which is basically a function).
	 * By convention, every handler must set the <code>data</code> property of the asset. It should not
	 * modify the status property.
	 *
	 * @param {string} type the type of the asset
	 * @param {Function} handler the handler that will be called every time an asset is loaded
	 *
	 * @example
	 * core.defaultTextureHandler = function (path, data, callback) {
	 *		// create the image
	 *		var imgtype = (/[.]/.exec(path)) ? /[^.]+$/.exec(path) : undefined;
	 *		var img = new Image();
	 *		var rawData = window.base64_encode(data);
	 *		img.onload = function () {
	 *			if (core.webglMode) {
	 *				img.tex = core.gl.createTexture();
	 *			}
	 *			var texture = core.assets['texture'][path];
	 *			texture.data = img;
	 *			var result = true;
	 *			if (core.webglMode) {
	 *				result = core.prepareWebGLTexture(img);
	 *			}
	 *			callback && callback(result);
	 *		}
	 *		img.src = "data:image/" + imgtype + ";base64," + rawData;
	 * }
	 */
	core.registerAssetHandler = function (type, handler) {
		_core.assetsHandlers[type] = handler;
	};

	/**
	 * Register a way to load an asset
	 *
	 * @param {string} type
	 * @param {Function} loader
	 */
	core.registerAssetLoader = function (type, loader) {
		_core.assetsLoaders[type] = loader;
	};

	/**
	 * Loads and asset using the registered method to download it. You can register different loaders
	 * (to be called to actually do the request) and asset handlers (to be called after the asset is loaded).
	 *
	 * @param {string} type the type of asset being loaded, it could be "texture" or "default"
	 * @param {string|Object} url the url for the asset
	 * @param {(function(Object, Object)|string|null)=} [name] the name of the asset. If none is provided, then the name is the path
	 * @param {function(Object, Object)=} [callback] execute when asset is loaded or an error occurs. Callback Arguments (err, asset)
	 * @example
	 * core.loadAsset("texture", "someImage.png");
	 * core.loadAsset("texture", "someImage.png", "spr-house");
	 * core.loadAsset("texture", "someImage.png", "spr-house", onAssetLoad);
	 * core.loadAsset("texture", "someImage.png", onAssetLoad);
	 */
	core.loadAsset = function (type, url, name, callback) {
		var params;
		if (typeof(name) == 'function') {
			callback = name;
			name = null;
		}
		if (typeof(url) == 'object') {
			params = {
				dataType: url.dataType,
				url: url.url,
				name: url.name || url.url,
				forceNonRetina: url.forceNonRetina || false
			};
		} else {
			params = {
				url: url,
				name: name || url
			};
		}

		if (!_core.assets[type]) {
			_core.assets[type] = {};
		}

		// test for explicit @Nx request, if no such request, then add the @Nx prefix *only* if on
		// highDPI mode
		var md,
			prefix = core.settings['highDPIPrefix'].replace("__PR__", ""+_core.devicePixelRatio),
			re = new RegExp(prefix + "\\..+$");
		if (_core.highDPI && !params.forceNonRetina && (md = params.url.match(re)) === null) {
			md = params.url.match(/(\..+$)/);
			if (md && _core.highDPI) {
				params.url = params.url.replace(/(\..+$)/, prefix + "$1");
			}
		}

		var assets = _core.assets[type],
			rname = params.name;
		if (!assets[rname]) {
			// not in our records
			assets[rname] = {
				data: null,
				name: rname,
				status: 'try',
				listeners: []
			};
			if (callback) assets[rname].listeners.push(callback);
			core.loadAsset(type, params);
		} else if (assets[rname].status == 'loading') {
			// created but not yet loaded
			if (callback) assets[rname].listeners.push(callback);
		} else if (assets[rname].status == 'loaded') {
			// created and loaded, just call the callback
			if (callback) callback(null, assets[rname].data);
		} else if (assets[rname].status == 'try') {
			assets[rname].status = 'loading';
			if (_core.assetsLoaders[type])
				_core.assetsLoaders[type](type, params);
			else
				_core.assetsLoaders['default'](type, params);
			if (callback) assets[rname].listeners.push(callback);
		}
	};

	/**
	 * adds a listener/query for when all assets are loaded
	 *
	 * @param {string} type You can query for all types if you pass "all" as type
	 * @param {function()=} callback The callback to be executed when all assets of that type are loaded
	 */
	core.assetsLoaded = function (type, callback) {
		var listeners = _core.assetsLoadedListeners[type],
			assets,
			i;
		if (!listeners) {
			_core.assetsLoadedListeners[type] = [];
			listeners = _core.assetsLoadedListeners[type];
		}
		if (callback) {
			listeners.push(callback);
		}
		var allLoaded = true;
		if (type == 'all') {
			for (var t in _core.assets) {
				assets = _core.assets[t];
				for (i in assets) {
					if (assets[i].status != 'loaded') {
						allLoaded = false;
						break;
					}
				}
				if (!allLoaded) {
					break;
				}
			}
		} else {
			assets = _core.assets[type];
			for (i in assets) {
				if (assets[i].status != 'loaded') {
					allLoaded = false;
					break;
				}
			}
		}
		if (allLoaded) {
			var l;
			while ((l = listeners.shift())) { l(); }
		}
	};

	/**
	 * returns the object associated with the requested asset
	 * @param {string} type
	 * @param {string|null} path
	 * @return {Object|null}
	 */
	core.getAsset = function (type, path) {
		if (path) {
			return _core.assets[type][path].data;
		}
		return null;
	};

	core.getRawAsset = function (type, path) {
		if (path) {
			return _core.assets[type][path];
		}
	};

	/**
	 * returns whether or not the object associated with the requested asset
	 * @param {string} type
	 * @param {string|null} path
	 * @return {boolean}
	 */
	core.hasAsset = function (type, path) {
		if (path) {
			return (path in _core.assets[type]);
		}
		return false;
	};

	/**
	 * handles a loaded texture - should only be called on a webGL mode
	 * @param {HTMLImageElement} texture
	 * @return {boolean}
	 * @ignore
	 */
	core.prepareWebGLTexture = function (texture) {
		var gl = core.gl;
		var result = true;

		try {
			var error = 0;
			// gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture.tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
			error = gl.getError();
			if (error !== gl.NO_ERROR && error != gl.CONTEXT_LOST_WEBGL) {
				console.log("gl error " + error);
				result = false;
			}
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);
		} catch (e) {
			console.log("got some error: ", e);
			result = false;
		}
		return result;
	};

	/**
	 * The default asset handler, just sets the 'data' property
	 * of the asset.
	 * @param {Object} params
	 * @param {Object} data
	 * @param {string} type
	 * @return {boolean}
	 * @ignore
	 */
	_core.defaultAssetHandler = function (params, data, type) {
		var asset = _core.assets[type][params.name];
		asset.data = data;
		return true;
	};

	/**
	 * The default texture handler
	 *
	 * @param {Object} params
	 * @param {Object|HTMLImageElement} img
	 * @param {string=} type
	 * @return {boolean}
	 * @ignore
	 */
	_core.defaultTextureHandler = function (params, img, type) {
		if (core.settings.webglMode && !img.tex) {
			img.tex = core.gl.createTexture();
		}
		var texture = _core.assets['texture'][params.name];
		texture.data = img;
		if (core.settings.webglMode) {
			return core.prepareWebGLTexture(img);
		}
		return true;
	};

	/**
	 * @param {string} type
	 * @param {Object.<string,string>|null|string} params
	 * @ignore
	 */
	_core.defaultTextureLoader = function (type, params) {
		var img = new Image(),
			path = params.url,
			name = params.name,
			prefix = core.settings.highDPIPrefix.replace("__PR__", ""+_core.devicePixelRatio),
			re = new RegExp(prefix + "\\..+$");

		img.src = "";
		img.addEventListener("load", function () {
			var texture = _core.assets['texture'][name];
			if (_core.assetsHandlers[type](params, img)) {
				// call all listeners
				texture.status = "loaded";
				texture.highDPI = !!(path.match(re) && _core.highDPI);
				var l;
				while ((l = texture.listeners.shift())) { l(null, texture.data); }
				// test for assets loaded
				core.assetsLoaded(type);
				core.assetsLoaded("all");
			} else {
				// requeue
				texture.status = "try";
				core.loadAsset(type, params);
			}
		}, false);
		img.addEventListener("error", function (e) {
			var texture = _core.assets["texture"][name];
			// if we're a highDPI image, and we failed, load again without @Nx
			if (e.type === "error" && _core.highDPI && path.match(re)) {
				// FIXME: use the new highDPIPrefix here as well
				params.url = path.replace("@" + _core.devicePixelRatio + "x", "");
				params.forceNonRetina = true;
				// requeue
				texture.status = "try";
				core.loadAsset("texture", params);
			} else {
				//Failed to load, let's call the callback
				texture.status = "error";
				var l;
				while ((l = texture.listeners.shift())) { l({url: name, type: e.type}, texture.data); }
			}
		}, true);
		// append the basePath if it's not an absolute url or a data:image url
		if (path.match(/^http(s)?:/)) {
			img.crossOrigin = "anonymous";
			img.src = path;
		} else if (path.match(/^data:/)) {
			img.src = path;
		} else {
			img.src = core.settings.basePath + path;
		}
	};

	/**
	 * @param {string} type
	 * @param {Object.<string,string>|null|string} params
	 * @ignore
	 */
	_core.defaultAssetLoader = function (type, params) {
		var path = params.url,
			realPath = path,
			name = params.name,
			// FIXME: use the new highDPIPrefix here as well
			re = new RegExp("@" + _core.devicePixelRatio + "x\\..+$");

		if (!path.match(/^http(s)?:\/\//)) {
			realPath = core.settings.basePath + path;
		}
		var req = new XMLHttpRequest();
		req.open("GET", realPath);
		req.withCredentials = true;
		req.onreadystatechange = function () {
			var asset = _core.assets[type][name];
			if (req.readyState == 4 && req.status == 200) {
				var handler = _core.assetsHandlers[type] || _core.assetsHandlers['default'];
				if (handler(params, req.response, type)) {
					asset.status = 'loaded';
					// call all listeners
					var l;
					while ((l = asset.listeners.shift())) { l(null, asset.data); }
					// test for assets loaded
					core.assetsLoaded(type);
					core.assetsLoaded('all');
				} else {
					// requeue
					asset.status = 'try';
					core.loadAsset(type, params);
				}
			} else if (req.readyState == 4) {
				if (req.status == 404 && _core.highDPI && path.match(re)) {
					// FIXME: use the new highDPIPrefix here as well
					params.url = path.replace("@" + _core.devicePixelRatio + "x", "");
					params.forceNonRetina = true;
					// requeue
					asset.status = "try";
					core.loadAsset(type, params);
				} else {
					console.log("Error loading asset " + path);
					var l;
					while ((l = asset.listeners.shift())) { l({url: path, type: req.status}, asset.data); }
				}
			}
		};
		req.send();
	};

	/**
	 * setups the perspective (2d or 3d)
	 */
	core.setupPerspective = function () {
		var gl = core.gl,
			settings = core.settings;

		// quick bail if we're not on a webgl rendering mode
		if (!settings.webglMode) {
			return;
		}

		gl.clearColor(settings.backgroundColor[0], settings.backgroundColor[1], settings.backgroundColor[2], settings.backgroundColor[3]);
		// gl.clearDepth(1.0);

		// global blending options
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
		// disable depth test
		gl.disable(gl.DEPTH_TEST);

		var width = gl.viewportWidth;
		var height = gl.viewportHeight;
		gl.viewport(0, 0, _core.canvas.width, _core.canvas.height);

		core.pMatrix = glmatrix.mat4.create();
		_core.projection = core.settings["projection"];

		if (settings.projection == "2d") {
			// 2d projection
			console.log("setting up 2d projection (" + width + "," + height + ")");
			glmatrix.mat4.ortho(core.pMatrix, 0, width, 0, height, -1024, 1024);
		} else if (settings.projection == "3d") {
			// 3d projection
			console.log("setting up 3d projection (" + width + "," + height + ")");
			var zeye   = height / 1.1566;
			var matA   = glmatrix.mat4.perspective(glmatrix.mat4.create(), 60 * Math.PI / 180.0, width / height, 0.5, 1500.0);
			var eye    = [width/2, height/2, zeye];
			var center = [width/2, height/2, 0];
			var up     = [0, 1, 0];
			var matB   = glmatrix.mat4.lookAt(glmatrix.mat4.create(), eye, center, up);
			glmatrix.mat4.multiply(core.pMatrix, matA, matB);
		} else {
			throw "Invalid projection: " + settings.projection;
		}
	};

	/**
	 * Sets the current running scene
	 * @param {core.Block} block
	 */
	core.setRunningScene = function (b) {
		var Block = require("chester/block");
		if (_core.runningScene && _core.runningScene != b) {
			_core.runningScene.onExitScene();
		}
		if (b.type == Block.TYPE.SCENE) {
			_core.runningScene = b;
		}
	};

	/**
	 * main draw function, will call the root block
	 * @ignore
	 */
	core.drawScene = function () {
		var gl = core.gl,
			settings = core.settings;
		if (settings.webglMode) {
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		} else {
			gl.setTransform(1, 0, 0, 1, 0, 0);
			gl.globalAlpha = 1.0;
			// FIXME: this should respect whatever we have in settings
			gl.fillStyle = "rgba(0, 0, 0, 1)";
			gl.fillRect(0, 0, _core.canvas.width, _core.canvas.height);
		}

		// start mayhem
		if (_core.runningScene) {
			_core.runningScene.visit();
			if (!_core.runningScene.isRunning) {
				_core.runningScene.onEnterScene();
			}
		}

		if (!settings.webglMode) {
			// draw the off canvas into the real one
			_core.frontGL.drawImage(_core.offCanvas, 0, 0, _core.canvas.width, _core.canvas.height);
		}

		// for actions and other stuff
		var current = Date.now(); // milliseconds
		core.delta = current - _core.lastTime;
		_core.lastTime = current;
	};

	/**
	 * install all handlers on the canvas element
	 * @ignore
	 */
	core.installMouseHandlers = function () {
		if (core.onFakeWebGL) {
			_touchBeganListeners.push(_core.mouseDownHandler);
			_touchMovedListeners.push(_core.mouseMoveHandler);
			_touchEndedListeners.push(_core.mouseUpHandler);
		} else if ((typeof navigator !== 'undefined') && navigator.platform.match(/iPhone|iPad/)) {
			document.addEventListener('touchstart', _core.mouseDownHandler, false);
			document.addEventListener('touchmove', function (event) {
				_core.mouseMoveHandler(event);
				// prevent scrolling
				event.preventDefault();
			}, false);
			document.addEventListener('touchend', _core.mouseUpHandler, false);
		} else {
			$(_core.canvas).mousedown(_core.mouseDownHandler);
			$(_core.canvas).mousemove(_core.mouseMoveHandler);
			$(_core.canvas).mouseup(_core.mouseUpHandler);
			$(_core.canvas).mouseenter(_core.mouseEnterHandler);
			$(_core.canvas).mouseleave(_core.mouseLeaveHandler);
		}
	};

	/**
	 * install all key handlers
	 * @ignore
	 */
	core.installKeyHandlers = function () {
		if (!core.onFakeWebGL) {
			$(_core.canvas).focus(_core.focusHandler);
			$(_core.canvas).keydown(_core.keyDownHandler);
			$(_core.canvas).keypress(_core.keyPressHandler);
			$(_core.canvas).keyup(_core.keyUpHandler);
		}
	};

	/**
	 * @type {Array}
	 * @ignore
	 */
	var __tmp_mouse_vec = [];

	/**
	 * @param {number} x
	 * @param {number} y
	 * @ignore
	 */
	var __tmp_mouse_setFromValues = function (x, y) {
		__tmp_mouse_vec[0] = x;
		__tmp_mouse_vec[1] = y;
		__tmp_mouse_vec[2] = 0;
	};

	/**
	 * @param {Event} event
	 * @ignore
	 */
	_core.mouseDownHandler = function (event) {
		var pt = _core.canvas.relativePosition(event);
		var i, len = _core.mouseHandlers.length;
		__tmp_mouse_setFromValues(pt.x, pt.y);
		for (i = len-1; i >= 0; i--) {
			if (true === _core.mouseHandlers[i].call(null, __tmp_mouse_vec, core.MOUSE_EVENTS.DOWN))
				break;
		}
	};

	/**
	 * @param {Event} event
	 * @ignore
	 */
	core.mouseMoveHandler = function (event) {
		var pt = _core.canvas.relativePosition(event);
		var i, len = _core.mouseHandlers.length;
		__tmp_mouse_setFromValues(pt.x, pt.y);
		for (i = len-1; i >= 0; i--) {
			if (true === _core.mouseHandlers[i].call(null, __tmp_mouse_vec, core.MOUSE_EVENTS.MOVE))
				break;
		}
	};

	/**
	 * @param {Event} event
	 * @ignore
	 */
	core.mouseUpHandler = function (event) {
		var pt = _core.canvas.relativePosition(event);
		var i, len = _core.mouseHandlers.length;
		__tmp_mouse_setFromValues(pt.x, pt.y);
		for (i = len-1; i >= 0; i--) {
			if (true === _core.mouseHandlers[i].call(null, __tmp_mouse_vec, core.MOUSE_EVENTS.UP))
				break;
		}
	};

	/**
	 * @param {Event} event
	 * @ignore
	 */
	core.mouseEnterHandler = function (event) {
		var pt = _core.canvas.relativePosition(event);
		var i, len = _core.mouseHandlers.length;
		__tmp_mouse_setFromValues(pt.x, pt.y);
		for (i = len-1; i >= 0; i--) {
			if (true === _core.mouseHandlers[i].call(null, __tmp_mouse_vec, core.MOUSE_EVENTS.ENTER))
				break;
		}
	};

	/**
	 * @param {Event} event
	 * @ignore
	 */
	core.mouseLeaveHandler = function (event) {
		var pt = _core.canvas.relativePosition(event);
		var i, len = _core.mouseHandlers.length;
		__tmp_mouse_setFromValues(pt.x, pt.y);
		for (i = len-1; i >= 0; i--) {
			if (true === _core.mouseHandlers[i].call(null, __tmp_mouse_vec, core.MOUSE_EVENTS.LEAVE))
				break;
		}
	};

	/**
	 * @param {Event} event
	 * @ignore
	 */
	core.focusHandler = function (event) {
		var i, len = _core.keyboardHandlers.length;
		for (i = len-1; i >= 0; i--) {
			if (true === _core.keyboardHandlers[i].call(null, 0, core.KEYBOARD_EVENTS.FOCUS))
				break;
		}
	};

	core.keyDownHandler = function (event) {
		var i, len = _core.keyboardHandlers.length;
		for (i = len-1; i >= 0; i--) {
			if (true === _core.keyboardHandlers[i].call(null, event.keyCode, core.KEYBOARD_EVENTS.KEY_DOWN))
				break;
		}
	};

	/**
	 * Adds a mouse handler: the function will be called for every mouse event on the main canvas. If
	 * the handler returns `true`, then the event chain will be aborted (the mouse/touch event will no
	 * longer be propagated).
	 * @param {function((Array|Float32Array), core.mouseEvents): boolean} callback
	 * @example
	 * var stPoint = null;
	 * core.addMouseHandler(function (pt, type) {
	 *	if (type == core.mouseEvents.DOWN) {
	 *		stPoint = new Float32Array(pt);
	 *	} else if (type == core.mouseEvents.MOVE && stPoint) {
	 *		var tmp = [pt[0] - stPoint[0], pt[1] - stPoint[1], pt[2] - stPoint[2]];
	 *		tmx.setPosition(tmx.position[0] + tmp[0], tmx.position[1] + tmp[1], tmx.position[2] + tmp[2]);
	 *		stPoint.set(pt);
	 *	} else {
	 *		stPoint = null;
	 *	}
	 * });
	 */
	core.addMouseHandler = function (callback) {
		if (_core.mouseHandlers.indexOf(callback) == -1) {
			_core.mouseHandlers.push(callback);
		}
	};

	/**
	 * Removes a specific mouse handler.
	 * @param {function((Array|Float32Array), core.mouseEvents)} callback
	 */
	core.removeMouseHandler = function (callback) {
		var idx = _core.mouseHandlers.indexOf(callback);
		if (idx >= 0) {
			_core.mouseHandlers.splice(idx, 1);
		}
	};

	/**
	 * the current request frame id
	 * @ignore
	 * @type {number}
	 */
	_core.reqFrameId = 0;

	/**
	 * start the animation
	 */
	core.run = function () {
		if (!_core.paused) {
			_core.reqFrameId = requestAnimationFrame(core.run, _core.canvas);
			if (_core.stats) _core.stats['begin']();
			core.drawScene();
			// tick the manager
			actions.Manager.tick(core.delta);
			if (_core.stats) _core.stats['end']();
		}
	};

	/**
	 * toggle pause - events will still execute
	 */
	core.togglePause = function () {
		if (!_core.paused) {
			_core.paused = true;
		} else {
			_core.paused = false;
			_core.lastTime = Date.now();
			core.run();
		}
	};

	/**
	 * @return {boolean}
	 */
	core.isPaused = function () {
		return _core.paused;
	};

	/**
	 * @param {boolean} pause
	 */
	core.setPause = function (pause) {
		if (_core.paused && !pause) {
			_core.paused = pause;
			_core.lastTime = Date.now();
			core.run();
		} else {
			_core.paused = pause;
		}
	};

	core.isHighDPI = function () {
		return _core.highDPI;
	};
	
	// utility functions

	/**
	 * @param {vec3} original The original vector
	 * @param {vec3} variance the variance for every coordinate in
	 * the original vector
	 * @return {vec3}
	 */
	core.randomVec3 = function (original, variance) {
		var vec = [];
		if (variance) {
			vec[0] = original[0] + variance[0] * core.randMin1Plus1();
			vec[1] = original[1] + variance[1] * core.randMin1Plus1();
			vec[2] = original[2] + variance[2] * core.randMin1Plus1();
		} else {
			vec[0] = original[0];
			vec[1] = original[1];
			vec[2] = original[2];
		}
		return vec;
	};

	/**
	 * @param {goog.vec.Vec4.Vec4Like} original The original vector
	 * @param {goog.vec.Vec4.Vec4Like} variance the variance for every coordinate in
	 * the original vector
	 * @return {goog.vec.Vec4.Vec4Like}
	 */
	core.randomVec4 = function (original, variance) {
		var vec = [];
		if (variance) {
			vec[0] = original[0] + variance[0] * core.randMin1Plus1();
			vec[1] = original[1] + variance[1] * core.randMin1Plus1();
			vec[2] = original[2] + variance[2] * core.randMin1Plus1();
			vec[3] = original[3] + variance[3] * core.randMin1Plus1();
		} else {
			vec[0] = original[0];
			vec[1] = original[1];
			vec[2] = original[2];
			vec[3] = original[3];
		}
		return vec;
	};

	/**
	 * @return {number} a random number between -1 and 1
	 */
	core.randMin1Plus1 = function () {
		return Math.random() * 2 - 1;
	};

	/**
	 * returns the current running scene (if any)
	 * @return {?core.Block}
	 */
	core.getRunningScene = function () {
		return _core.runningScene;
	};

	/**
	 * sets the clear (background) color
	 * the array should be created in the order RGBA
	 *
	 * @param {Array|Float32Array} color
	 * @suppress {checkTypes}
	 */
	core.setBackgroundColor = function (color) {
		var settings = core.settings;
		if (settings.webglMode) {
			glmatrix.vec4.copy(settings.backgroundColor, color);
			core.gl.clearColor(settings.backgroundColor[0],
							   settings.backgroundColor[1],
							   settings.backgroundColor[2],
							   settings.backgroundColor[3]);
		} else {
			settings.backgroundColor = 'rgba(' + 
				color[0] * 255 + ', ' + 
				color[1] * 255 + ', ' + 
				color[2] * 255 + ', ' + 
				color[3] + ')';
		}
	};

	return core;
});
