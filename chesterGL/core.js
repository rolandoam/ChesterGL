/**
 * chesterGL - Simple 2D WebGL demo/library
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

goog.provide("chesterGL.core");
goog.require("goog.math.Vec2");

/**
 * @ignore
 * @type {goog.math.Vec2}
 */
HTMLCanvasElement._canvas_tmp_mouse = new goog.math.Vec2(0, 0);

/**
 * @ignore
 * @param {Event} evt
 * @return {goog.math.Vec2}
 */
HTMLCanvasElement.prototype.relativePosition = function (evt) {
	var pt = HTMLCanvasElement._canvas_tmp_mouse,
		height = (chesterGL.highDPI ? this.height / chesterGL.devicePixelRatio : this.height);
	pt.x = 0; pt.y = 0;
	if (typeof this['__offset'] === "undefined") {
		this['__offset'] = $(this).offset();
	}
	if (evt.changedTouches) {
		var t = evt.changedTouches[0];
		pt.x = (t.pageX - this['__offset'].left);
		pt.y = (height - (t.pageY - this['__offset'].top));
	} else {
		pt.x = (evt.pageX - this['__offset'].left);
		pt.y = (height - (evt.pageY - this['__offset'].top));
	}

	return pt;
};

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
/*
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
		console.log("using setTimeout");
        window.requestAnimationFrame = function(callback, element) {
            var currTime = Date.now();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
*/

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
 * @define {boolean}
 * @ignore
 */
var ENABLE_DEBUG = false;

/** @ignore */
function throwOnGLError(err, funcName, args) {
	console.log(WebGLDebugUtils.glEnumToString(err) + " was caused by call to " + funcName);
}

// this is here for the docs
// uncomment before running make doc
/** @namespace */
// var chesterGL = {};

/**
 * chesterGL version
 * @const
 * @type {string}
 */
chesterGL.version = '0.3';

/**
 * @type {boolean}
 */
chesterGL.onFakeWebGL = false;
(function () {
	if (typeof runScript !== 'undefined') {
		chesterGL.onFakeWebGL = true;
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
 * </ul>
 * @type {Object.<string,string|boolean>}
 * @example
 * // use google analytics and force canvas mode
 * chesterGL.settings['useGoogleAnalytics'] = true;
 * chesterGL.settings['webglMode'] = false;
 * chesterGL.setup('canvas-id');
 */
chesterGL.settings = {
	'useGoogleAnalytics': false,
	'projection': '3d',
	'webglMode': true,
	'usesOffscreenBuffer': false,
	'basePath': ''
};

/**
 * @type {string}
 * @ignore
 */
chesterGL.projection = "3d";

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.webglMode = true;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.usesOffscreenBuffer = false;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.useGoogleAnalytics = false;

/**
 * @type {string}
 * @ignore
 */
chesterGL.basePath = "";

/**
 * This is the WebGL context
 *
 * @type {?WebGLRenderingContext|CanvasRenderingContext2D}
 * @ignore
 */
chesterGL.gl = null;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL._paused = false;

/**
 * @type {Object.<string,WebGLProgram>}
 * @ignore
 */
chesterGL.programs = {};

/**
 * @type {?string}
 * @ignore
 */
chesterGL.currentProgram = null;

/**
 * @type {?goog.vec.Mat4.Type}
 * @ignore
 */
chesterGL.pMatrix = null;

/**
 * @type {?chesterGL.Block}
 */
chesterGL.runningScene = null;

/**
 * @type {?Element}
 * @ignore
 */
chesterGL.canvas = null;

/**
 * whether or not to debug sprites (show bounding box)
 * set this by adding a ?_cdbg=1 to the url of the document
 * @type {boolean}
 */
chesterGL.debugSprite = false;

/**
 * Whether or not we're running on a highDPI device
 * @type {boolean}
 */
chesterGL.highDPI = false;

/**
 * @type {Object.<string,Object>}
 * @ignore
 */
chesterGL.assets = {};

/**
 * the asset-loaded handlers
 * @type {Object.<string,Function>}
 * @ignore
 */
chesterGL.assetsHandlers = {};

/**
 * the asset loader: it specifies how a type of asset should be loaded.
 * The default for textures is creating a new Image() element, the default for any other
 * type is jquery's $.ajax asynchronously.
 * @type {Object.<string,Function>}
 * @ignore
 */
chesterGL.assetsLoaders = {};

/**
 * @type {Object.<string,Array>}
 * @ignore
 */
chesterGL.assetsLoadedListeners = {};

/**
 * the time last frame was rendered
 * @type {number}
 * @ignore
 */
chesterGL.lastTime = Date.now();

/**
 * delta in seconds from last frame
 * @type {number}
 * @ignore
 */
chesterGL.delta = 0;

/**
 * @enum {number}
 */
chesterGL.mouseEvents = {
	DOWN: 0,
	MOVE: 1,
	UP: 2,
	ENTER: 3,
	LEAVE: 4
};

/**
 * The stats object
 * @type {Object}
 */
chesterGL.stats = null;

/**
 * the global list of mouse down handlers
 * @type {Array.<function(goog.vec.Vec3.Vec3Like, chesterGL.mouseEvents)>}
 * @ignore
 */
chesterGL.mouseHandlers = [];

/**
 * sets the current program, also sets the uniforms for that shader
 *
 * @param {string} program
 * @return {WebGLProgram}
 * @ignore
 */
chesterGL.selectProgram = function (program) {
	var prog = chesterGL.programs[program];
	var gl = chesterGL.gl;
	if (program != chesterGL.currentProgram) {
		// console.log("selecting program " + program);
		chesterGL.currentProgram = program;
		gl.validateProgram(prog);
		gl.useProgram(prog);
		// enable attribs
		for (var attr in prog.attribs) {
			// console.log("  enabling attribute " + attr);
			gl.enableVertexAttribArray(prog.attribs[attr]);
		}
	}
	return prog;
};

/**
 * setups the webgl canvas
 * @param {string} canvasId
 */
chesterGL.setup = function (canvasId) {
	var canvas = chesterGL.onFakeWebGL ? new ChesterCanvas(innerWidth, innerHeight) : document.getElementById(canvasId); // get the DOM element
	var settings = chesterGL.settings;

	// copy values for future reference
	chesterGL.projection = /** @type {string} */(settings['projection']);
	chesterGL.webglMode = /** @type {boolean} */(settings['webglMode']);
	chesterGL.useGoogleAnalytics = /** @type {boolean} */(settings['useGoogleAnalytics']);
	chesterGL.usesOffscreenBuffer = /** @type {boolean} */(settings['usesOffscreenBuffer']);
	chesterGL.basePath = /** @type {string} */(settings['basePath']);

	chesterGL.initGraphics(canvas);
	if (chesterGL.webglMode) {
		chesterGL.initDefaultShaders();
	}
	// only test for debug query on browser
	if (!chesterGL.onFakeWebGL) {
		var queryStr = window.location.search.substring(1);
		var keyValues = queryStr.split('&');
		for (var i in keyValues) {
			var key = keyValues[i].split('=');
			if (key[0] == '_cdbg' && key[1] == '1') {
				chesterGL.debugSprite = true;
				console.log("debug mode on");
			}
		}
	}

	// register the default handler for textures
	chesterGL.registerAssetHandler('texture', chesterGL.defaultTextureHandler);
	chesterGL.registerAssetHandler('default', chesterGL.defaultAssetHandler);
	chesterGL.registerAssetLoader('texture', chesterGL.defaultTextureLoader);
	chesterGL.registerAssetLoader('default', chesterGL.defaultAssetLoader);

	// create the stats objects (if the Stats.js library is included)
	if (typeof Stats !== 'undefined') {
		console.log("chesterGL: adding stats");
		chesterGL.stats = new Stats();
		chesterGL.stats['setMode'](1);
		if (!chesterGL.onFakeWebGL) {
			chesterGL.stats['domElement']['style']['position'] = 'absolute';
			chesterGL.stats['domElement']['style']['left'] = '0px';
			chesterGL.stats['domElement']['style']['top'] = '0px';
			document.body.appendChild(chesterGL.stats['domElement']);
		}
		goog.exportSymbol('chesterGL.stats', chesterGL.stats);
	}
};

/**
 * tryies to init the graphics stuff:
 * 1st attempt: webgl
 * fallback: canvas
 *
 * @param {Element} canvas
 */
chesterGL.initGraphics = function (canvas) {
	var desiredWidth = 0,
		desiredHeight = 0;
	try {
		// test for high-dpi device
		if (window.devicePixelRatio && window.devicePixelRatio > 1) {
			var devicePixelRatio = window.devicePixelRatio;
			console.log("using HighDPI resolution (devicePixelRatio: " + devicePixelRatio + ")");
			desiredWidth = canvas.width;
			desiredHeight = canvas.height;
			canvas.style.width = canvas.width + "px";
			canvas.style.height = canvas.height + "px";
			canvas.width = canvas.clientWidth * devicePixelRatio;
			canvas.height = canvas.clientHeight * devicePixelRatio;
			chesterGL.highDPI = true;
			chesterGL.devicePixelRatio = window.devicePixelRatio;
		} else {
			desiredWidth = canvas.width;
			desiredHeight = canvas.height;
		}

		chesterGL.canvas = canvas;
		if (chesterGL.webglMode) {
			chesterGL.gl = canvas.getContext("experimental-webgl", {alpha: false, antialias: false, preserveDrawingBuffer: true});
			if (chesterGL.gl && typeof WebGLDebugUtils !== 'undefined') {
				console.log("installing debug context");
				chesterGL.gl = WebGLDebugUtils.makeDebugContext(chesterGL.gl, throwOnGLError);
			}
		}
	} catch (e) {
		console.log("ERROR: " + e);
	}
	if (!chesterGL.gl) {
		// fallback to canvas API (uses an offscreen buffer)
		chesterGL.gl = canvas.getContext("2d");
		if (!chesterGL.gl) {
			throw "Error initializing graphic context!";
		}
		chesterGL.webglMode = chesterGL.settings['webglMode'] = false;
	}

	// first resize of the canvas
	chesterGL.gl.viewportWidth = desiredWidth;
	chesterGL.gl.viewportHeight = desiredHeight;

	// install touch handler
	chesterGL.installMouseHandlers();
};

/**
 * called when the canvas is resized
 * @ignore
 */
chesterGL.canvasResized = function () {
	var canvas = chesterGL.canvas;
	// get real width and height
	chesterGL.gl.viewportWidth = canvas.width;
	chesterGL.gl.viewportHeight = canvas.height;
};

/**
 * returns the size of the current viewport
 * @return {goog.math.Size}
 */
chesterGL.viewportSize = function () {
	return new goog.math.Size(chesterGL.gl.viewportWidth, chesterGL.gl.viewportHeight);
};

/**
 * init the default shader
 * @ignore
 */
chesterGL.initDefaultShaders = function () {
	var gl = chesterGL.gl;

	chesterGL.initShader("default", function (program) {
		program.mvpMatrixUniform = gl.getUniformLocation(program, "uMVPMatrix");
		program.attribs = {
			'vertexPositionAttribute': gl.getAttribLocation(program, "aVertexPosition"),
			'vertexColorAttribute': gl.getAttribLocation(program, "aVertexColor")
		};
		goog.exportProperty(program, 'mvpMatrixUniform', program.mvpMatrixUniform);
		goog.exportProperty(program, 'attribs', program.attribs);
	});

	chesterGL.initShader("texture", function (program) {
		program.mvpMatrixUniform = gl.getUniformLocation(program, "uMVPMatrix");
		program.samplerUniform = gl.getUniformLocation(program, "uSampler");
		program.attribs = {
			'vertexColorAttribute': gl.getAttribLocation(program, "aVertexColor"),
			'textureCoordAttribute': gl.getAttribLocation(program, "aTextureCoord"),
			'vertexPositionAttribute': gl.getAttribLocation(program, "aVertexPosition")
		};
		goog.exportProperty(program, 'mvpMatrixUniform', program.mvpMatrixUniform);
		goog.exportProperty(program, 'samplerUniform', program.samplerUniform);
		goog.exportProperty(program, 'attribs', program.attribs);
	});
};

/**
 * init shaders (fetches data - in a sync way)
 * @param {string} prefix
 * @param {function(WebGLProgram)} callback
 * @ignore
 */
chesterGL.initShader = function (prefix, callback) {
	var gl = chesterGL.gl;
	var fsData = chesterGL.loadShader(prefix, "frag");
	var vsData = chesterGL.loadShader(prefix, "vert");

	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fsData);
	gl.compileShader(fs);

	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.log("problem compiling fragment shader " + prefix + "(" + gl.getShaderInfoLog(fs) + "):\n" + fsData);
		return;
	}

	var vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vsData);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.log("problem compiling vertex shader " + prefix + "(" + gl.getShaderInfoLog(vs) + "):\n" + vsData);
		return;
	}

	var program = chesterGL.createShader(prefix, fs, vs);
	if (callback) callback(program);
};

/**
 * loads the shader data
 * @return {string}
 * @ignore
 */
chesterGL.loadShader = function (prefix, type) {
	var shaderData = "";
	var req = new XMLHttpRequest();
	req.open("GET", chesterGL.basePath + "shaders/" + prefix + "." + type, false);
	req.onreadystatechange = function () {
		if (req.readyState == 4 && req.status == 200) {
			shaderData = req.responseText;
		} else if (req.readyState == 4) {
			console.log("error getting the shader data");
		}
	};
	req.send();
	return shaderData;
};

/**
 * actually creates the shader
 * @param {string} prefix
 * @param {WebGLShader|null} fragmentData
 * @param {WebGLShader|null} vertexData
 * @return {WebGLProgram}
 * @ignore
 */
chesterGL.createShader = function (prefix, fragmentData, vertexData) {
	var gl = chesterGL.gl;
	var program = gl.createProgram();
	gl.attachShader(program, fragmentData);
	gl.attachShader(program, vertexData);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log("problem linking shader");
	}
	// console.log("creating shader " + prefix);
	chesterGL.programs[prefix] = program;
	return program;
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
 * chesterGL.defaultTextureHandler = function (path, data, callback) {
 *		// create the image
 *		var imgtype = (/[.]/.exec(path)) ? /[^.]+$/.exec(path) : undefined;
 *		var img = new Image();
 *		var rawData = window.base64_encode(data);
 *		img.onload = function () {
 *			if (chesterGL.webglMode) {
 *				img.tex = chesterGL.gl.createTexture();
 *			}
 *			var texture = chesterGL.assets['texture'][path];
 *			texture.data = img;
 *			var result = true;
 *			if (chesterGL.webglMode) {
 *				result = chesterGL.prepareWebGLTexture(img);
 *			}
 *			callback && callback(result);
 *		}
 *		img.src = "data:image/" + imgtype + ";base64," + rawData;
 * }
 */
chesterGL.registerAssetHandler = function (type, handler) {
	chesterGL.assetsHandlers[type] = handler;
};

/**
 * Register a way to load an asset
 *
 * @param {string} type
 * @param {Function} loader
 */
chesterGL.registerAssetLoader = function (type, loader) {
	chesterGL.assetsLoaders[type] = loader;
};

/**
 * Loads and asset using the registered method to download it. You can register different loaders
 * (to be called to actually do the request) and asset handlers (to be called after the asset is loaded).
 *
 * @param {string} type the type of asset being loaded, it could be "texture" or "default"
 * @param {string|Object} url the url for the asset
 * @param {(string|null)=} name the name of the asset. If none is provided, then the name is the path
 * @param {function(Object)=} callback the callback that will be executed as soon as the asset is loaded
 */
chesterGL.loadAsset = function (type, url, name, callback) {
	var params;
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

	if (!chesterGL.assets[type]) {
		chesterGL.assets[type] = {};
	}

	// test for explicit @Nx request, if no such request, then add the @Nx prefix *only* if on
	// highDPI mode
	var md,
		re = new RegExp("@" + chesterGL.devicePixelRatio + "x\\..+$");
	if (chesterGL.highDPI && !params.forceNonRetina && (md = params.url.match(re)) === null) {
		md = params.url.match(/(\..+$)/);
		if (md && chesterGL.highDPI) {
			params.url = params.url.replace(/(\..+$)/, "@" + chesterGL.devicePixelRatio + "x$1");
		}
	}

	var assets = chesterGL.assets[type],
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
		chesterGL.loadAsset(type, params);
	} else if (assets[rname].status == 'loading') {
		// created but not yet loaded
		if (callback) assets[rname].listeners.push(callback);
	} else if (assets[rname].status == 'loaded') {
		// created and loaded, just call the callback
		if (callback) callback(assets[rname].data);
	} else if (assets[rname].status == 'try') {
		assets[rname].status = 'loading';
		if (chesterGL.assetsLoaders[type])
			chesterGL.assetsLoaders[type](type, params);
		else
			chesterGL.assetsLoaders['default'](type, params);
		if (callback) assets[rname].listeners.push(callback);
	}
};

/**
 * adds a listener/query for when all assets are loaded
 *
 * @param {string} type You can query for all types if you pass "all" as type
 * @param {function()=} callback The callback to be executed when all assets of that type are loaded
 */
chesterGL.assetsLoaded = function (type, callback) {
	var listeners = chesterGL.assetsLoadedListeners[type],
		assets,
		i;
	if (!listeners) {
		chesterGL.assetsLoadedListeners[type] = [];
		listeners = chesterGL.assetsLoadedListeners[type];
	}
	if (callback) {
		listeners.push(callback);
	}
	var allLoaded = true;
	if (type == 'all') {
		for (var t in chesterGL.assets) {
			assets = chesterGL.assets[t];
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
		assets = chesterGL.assets[type];
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
chesterGL.getAsset = function (type, path) {
	if (path) {
		return chesterGL.assets[type][path].data;
	}
	return null;
};

/**
 * returns whether or not the object associated with the requested asset
 * @param {string} type
 * @param {string|null} path
 * @return {boolean}
 */
chesterGL.hasAsset = function (type, path) {
	if (path) {
		return (path in chesterGL.assets[type]);
	}
	return false;
};

/**
 * handles a loaded texture - should only be called on a webGL mode
 * @param {HTMLImageElement} texture
 * @return {boolean}
 * @ignore
 */
chesterGL.prepareWebGLTexture = function (texture) {
	var gl = chesterGL.gl;
	var result = true;

	try {
		var error = 0;
		// gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture.tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
		error = gl.getError();
		if (error !== 0) {
			console.log("gl error " + error);
			result = false;
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	} catch (e) {
		console.log("got some error: " + e);
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
chesterGL.defaultAssetHandler = function (params, data, type) {
	var asset = chesterGL.assets[type][params.name];
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
chesterGL.defaultTextureHandler = function (params, img, type) {
	if (chesterGL.webglMode && !img.tex) {
		img.tex = chesterGL.gl.createTexture();
	}
	var texture = chesterGL.assets['texture'][params.name];
	texture.data = img;
	if (chesterGL.webglMode) {
		return chesterGL.prepareWebGLTexture(/** @type {HTMLImageElement} */(img));
	}
	return true;
};

/**
 * @param {string} type
 * @param {Object.<string,string>|null|string} params
 * @ignore
 */
chesterGL.defaultTextureLoader = function (type, params) {
	var img = new Image(),
		path = params.url,
		name = params.name,
		re = new RegExp("@" + chesterGL.devicePixelRatio + "x\\..+$");

	img.src = "";
	img.addEventListener("load", function () {
		var texture = chesterGL.assets['texture'][name];
		if (chesterGL.assetsHandlers[type](params, img)) {
			// call all listeners
			texture.status = "loaded";
			texture.highDPI = path.match(re) && chesterGL.highDPI;
			var l;
			while ((l = texture.listeners.shift())) { l(texture.data); }
			// test for assets loaded
			chesterGL.assetsLoaded(type);
			chesterGL.assetsLoaded("all");
		} else {
			// requeue
			texture.status = "try";
			chesterGL.loadAsset(type, params);
		}
	}, false);
	img.addEventListener("error", function (e) {
		// if we're a highDPI image, and we failed, load again without @Nx
		if (e.type === "error" && chesterGL.highDPI && path.match(re)) {
			var texture = chesterGL.assets["texture"][name];
			params.url = path.replace("@" + chesterGL.devicePixelRatio + "x", "");
			params.forceNonRetina = true;
			// requeue
			texture.status = "try";
			chesterGL.loadAsset("texture", params);
		}
	}, true);
	// append the basePath if it's not an absolute url or a data:image url
	if (path.match(/^http(s)?:/)) {
		img.crossOrigin = "anonymous";
		img.src = path;
	} else if (path.match(/^data:/)) {
		img.src = path;
	} else {
		img.src = chesterGL.basePath + path;
	}
};

/**
 * @param {string} type
 * @param {Object.<string,string>|null|string} params
 * @ignore
 */
chesterGL.defaultAssetLoader = function (type, params) {
	var path = params.url,
		realPath = path,
		name = params.name,
		re = new RegExp("@" + chesterGL.devicePixelRatio + "x\\..+$");

	if (!path.match(/^http(s)?:\/\//)) {
		realPath = chesterGL.basePath + path;
	}
	var req = new XMLHttpRequest();
	req.open("GET", realPath);
	req.withCredentials = true;
	req.onreadystatechange = function () {
		var asset = chesterGL.assets[type][name];
		if (req.readyState == 4 && req.status == 200) {
			var handler = chesterGL.assetsHandlers[type] || chesterGL.assetsHandlers['default'];
			if (handler(params, req.response, type)) {
				asset.status = 'loaded';
				// call all listeners
				var l;
				while ((l = asset.listeners.shift())) { l(asset.data); }
				// test for assets loaded
				chesterGL.assetsLoaded(type);
				chesterGL.assetsLoaded('all');
			} else {
				// requeue
				asset.status = 'try';
				chesterGL.loadAsset(type, params);
			}
		} else if (req.readyState == 4) {
			if (req.status == 404 && chesterGL.highDPI && path.match(re)) {
				params.url = path.replace("@" + chesterGL.devicePixelRatio + "x", "");
				params.forceNonRetina = true;
				// requeue
				asset.status = "try";
				chesterGL.loadAsset(type, params);
			} else {
				console.log("Error loading asset " + path);
			}
		}
	};
	req.send();
};

/**
 * setups the perspective (2d or 3d)
 */
chesterGL.setupPerspective = function () {
	var gl = chesterGL.gl;

	// quick bail if we're not on a webgl rendering mode
	if (!chesterGL.webglMode) {
		return;
	}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	// gl.clearDepth(1.0);

	// global blending options
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	// disable depth test
	gl.disable(gl.DEPTH_TEST);

	var width = gl.viewportWidth;
	var height = gl.viewportHeight;
	gl.viewport(0, 0, chesterGL.canvas.width, chesterGL.canvas.height);

	chesterGL.pMatrix = goog.vec.Mat4.createFloat32();

	if (chesterGL.projection == "2d") {
		// 2d projection
		console.log("setting up 2d projection (" + width + "," + height + ")");
		goog.vec.Mat4.makeOrtho(chesterGL.pMatrix, 0, width, 0, height, -1024, 1024);
	} else if (chesterGL.projection == "3d") {
		// 3d projection
		console.log("setting up 3d projection (" + width + "," + height + ")");
		// var f_aspect = (1.7320508075688776 / (width / height));
		var zeye   = height / 1.1566;
		var matA   = goog.vec.Mat4.makePerspective(goog.vec.Mat4.createFloat32(), 60 * Math.PI / 180.0, width / height, 0.5, 1500.0);
		var eye    = [width/2, height/2, zeye];
		var center = [width/2, height/2, 0];
		var up     = [0, 1, 0];
		var matB   = goog.vec.Mat4.makeLookAt(goog.vec.Mat4.createFloat32(), eye, center, up);
		goog.vec.Mat4.multMat(matA, matB, chesterGL.pMatrix);
	} else {
		throw "Invalid projection: " + chesterGL.projection;
	}
};

/**
 * Sets the current running scene
 * @param {chesterGL.Block} block
 */
chesterGL.setRunningScene = function (block) {
	if (chesterGL.runningScene && chesterGL.runningScene != block) {
		chesterGL.runningScene['onExitScene']();
	}
	if (block.type == chesterGL.Block.TYPE['SCENE']) {
		chesterGL.runningScene = block;
	}
};

/**
 * main draw function, will call the root block
 * @ignore
 */
chesterGL.drawScene = function () {
	var gl = chesterGL.gl;
	if (chesterGL.webglMode) {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	} else {
		gl.setTransform(1, 0, 0, 1, 0, 0);
		gl.fillRect(0, 0, gl.viewportWidth, gl.viewportHeight);
	}

	// start mayhem
	if (chesterGL.runningScene) {
		chesterGL.runningScene.visit();
		if (!chesterGL.runningScene.isRunning) {
			chesterGL.runningScene['onEnterScene']();
		}
	}

	// for actions and other stuff
	var current = Date.now(); // milliseconds
	chesterGL.delta = current - chesterGL.lastTime;
	chesterGL.lastTime = current;
};

/**
 * install all handlers on the canvas element
 * @ignore
 */
chesterGL.installMouseHandlers = function () {
	if (chesterGL.onFakeWebGL) {
		_touchBeganListeners.push(chesterGL.mouseDownHandler);
		_touchMovedListeners.push(chesterGL.mouseMoveHandler);
		_touchEndedListeners.push(chesterGL.mouseUpHandler);
	} else if ((typeof navigator !== 'undefined') && navigator.platform.match(/iPhone|iPad/)) {
		document.addEventListener('touchstart', chesterGL.mouseDownHandler, false);
		document.addEventListener('touchmove', function (event) {
			chesterGL.mouseMoveHandler(event);
			// prevent scrolling
			event.preventDefault();
		}, false);
		document.addEventListener('touchend', chesterGL.mouseUpHandler, false);
	} else {
		$(chesterGL.canvas).mousedown(chesterGL.mouseDownHandler);
		$(chesterGL.canvas).mousemove(chesterGL.mouseMoveHandler);
		$(chesterGL.canvas).mouseup(chesterGL.mouseUpHandler);
		$(chesterGL.canvas).mouseenter(chesterGL.mouseEnterHandler);
		$(chesterGL.canvas).mouseleave(chesterGL.mouseLeaveHandler);
	}
};

/**
 * @type {Float32Array}
 * @ignore
 */
chesterGL.__tmp_mouse_vec = new Float32Array(3);

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseDownHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	chesterGL.__tmp_mouse_vec.set([pt.x, pt.y, 0]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](chesterGL.__tmp_mouse_vec, chesterGL.mouseEvents.DOWN);
	}
};

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseMoveHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	chesterGL.__tmp_mouse_vec.set([pt.x, pt.y, 0]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](chesterGL.__tmp_mouse_vec, chesterGL.mouseEvents.MOVE);
	}
};

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseUpHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	chesterGL.__tmp_mouse_vec.set([pt.x, pt.y, 0]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](chesterGL.__tmp_mouse_vec, chesterGL.mouseEvents.UP);
	}
};

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseEnterHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	chesterGL.__tmp_mouse_vec.set([pt.x, pt.y, 0]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](chesterGL.__tmp_mouse_vec, chesterGL.mouseEvents.ENTER);
	}
};

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseLeaveHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	chesterGL.__tmp_mouse_vec.set([pt.x, pt.y, 0]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](chesterGL.__tmp_mouse_vec, chesterGL.mouseEvents.LEAVE);
	}
};

/**
 * Adds a mouse handler: the function will be called for every mouse event on the main canvas
 * @param {function((Array|Float32Array), chesterGL.mouseEvents)} callback
 * @example
 * var stPoint = null;
 * chesterGL.addMouseHandler(function (pt, type) {
 *	if (type == chesterGL.mouseEvents.DOWN) {
 *		stPoint = new Float32Array(pt);
 *	} else if (type == chesterGL.mouseEvents.MOVE && stPoint) {
 *		var tmp = [pt[0] - stPoint[0], pt[1] - stPoint[1], pt[2] - stPoint[2]];
 *		tmx.setPosition(tmx.position[0] + tmp[0], tmx.position[1] + tmp[1], tmx.position[2] + tmp[2]);
 *		stPoint.set(pt);
 *	} else {
 *		stPoint = null;
 *	}
 * });
 */
chesterGL.addMouseHandler = function (callback) {
	if (chesterGL.mouseHandlers.indexOf(callback) == -1) {
		chesterGL.mouseHandlers.push(callback);
	}
};

/**
 * Removes a specific mouse handler.
 * @param {function((Array|Float32Array), chesterGL.mouseEvents)} callback
 */
chesterGL.removeMouseHandler = function (callback) {
	var idx = chesterGL.mouseHandlers.indexOf(callback);
	if (idx >= 0) {
		chesterGL.mouseHandlers.splice(idx, 1);
	}
};

/**
 * run at browser's native animation speed
 */
chesterGL.run = function () {
	if (!chesterGL._paused) {
		requestAnimationFrame(chesterGL.run, chesterGL.canvas);
		if (chesterGL.stats) chesterGL.stats['begin']();
		chesterGL.drawScene();
		chesterGL.ActionManager.tick(chesterGL.delta);
		if (chesterGL.stats) chesterGL.stats['end']();
	}
};

/**
 * toggle pause - events will still execute
 */
chesterGL.togglePause = function () {
	if (!chesterGL._paused) {
		chesterGL._paused = true;
	} else {
		chesterGL._paused = false;
		chesterGL.lastTime = Date.now();
		chesterGL.run();
	}
};

/**
 * @return {boolean}
 */
chesterGL.isPaused = function () {
	return chesterGL._paused;
};

/**
 * @param {boolean} pause
 */
chesterGL.setPause = function (pause) {
	if (chesterGL._paused && !pause) {
		chesterGL._paused = pause;
		chesterGL.lastTime = Date.now();
		chesterGL.run();
	} else {
		chesterGL._paused = pause;
	}
};

// utility functions

/**
 * @param {goog.vec.Vec3.Vec3Like} original The original vector
 * @param {goog.vec.Vec3.Vec3Like} variance the variance for every coordinate in
 * the original vector
 * @return {goog.vec.Vec3.Vec3Like}
 */
chesterGL.randomVec3 = function (original, variance) {
	var vec = [];
	if (variance) {
		vec[0] = original[0] + variance[0] * chesterGL.randMin1Plus1();
		vec[1] = original[1] + variance[1] * chesterGL.randMin1Plus1();
		vec[2] = original[2] + variance[2] * chesterGL.randMin1Plus1();
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
chesterGL.randomVec4 = function (original, variance) {
	var vec = [];
	if (variance) {
		vec[0] = original[0] + variance[0] * chesterGL.randMin1Plus1();
		vec[1] = original[1] + variance[1] * chesterGL.randMin1Plus1();
		vec[2] = original[2] + variance[2] * chesterGL.randMin1Plus1();
		vec[3] = original[3] + variance[3] * chesterGL.randMin1Plus1();
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
chesterGL.randMin1Plus1 = function () {
	return Math.random() * 2 - 1;
};

/**
 * returns the current associated gl (or canvas 2d) context
 * @return {Object}
 */
chesterGL.getCurrentContext = function () {
	return chesterGL.gl;
};

// properties
goog.exportSymbol('chesterGL.version', chesterGL.version);
goog.exportSymbol('chesterGL.settings', chesterGL.settings);
goog.exportSymbol('chesterGL.mouseEvents', chesterGL.mouseEvents);
goog.exportSymbol('chesterGL.onFakeWebGL', chesterGL.onFakeWebGL);
goog.exportProperty(chesterGL.mouseEvents, 'UP', chesterGL.mouseEvents.UP);
goog.exportProperty(chesterGL.mouseEvents, 'DOWN', chesterGL.mouseEvents.DOWN);
goog.exportProperty(chesterGL.mouseEvents, 'MOVE', chesterGL.mouseEvents.MOVE);
goog.exportProperty(chesterGL.mouseEvents, 'ENTER', chesterGL.mouseEvents.ENTER);
goog.exportProperty(chesterGL.mouseEvents, 'LEAVE', chesterGL.mouseEvents.LEAVE);
// methods
goog.exportSymbol('chesterGL.viewportSize', chesterGL.viewportSize);
goog.exportSymbol('chesterGL.setup', chesterGL.setup);
goog.exportSymbol('chesterGL.canvasResized', chesterGL.canvasResized);
goog.exportSymbol('chesterGL.initShader', chesterGL.initShader);
goog.exportSymbol('chesterGL.registerAssetHandler', chesterGL.registerAssetHandler);
goog.exportSymbol('chesterGL.loadAsset', chesterGL.loadAsset);
goog.exportSymbol('chesterGL.assetsLoaded', chesterGL.assetsLoaded);
goog.exportSymbol('chesterGL.getAsset', chesterGL.getAsset);
goog.exportSymbol('chesterGL.hasAsset', chesterGL.hasAsset);
goog.exportSymbol('chesterGL.setupPerspective', chesterGL.setupPerspective);
goog.exportSymbol('chesterGL.setRunningScene', chesterGL.setRunningScene);
goog.exportSymbol('chesterGL.drawScene', chesterGL.drawScene);
goog.exportSymbol('chesterGL.run', chesterGL.run);
goog.exportSymbol('chesterGL.togglePause', chesterGL.togglePause);
goog.exportSymbol('chesterGL.isPaused', chesterGL.isPaused);
goog.exportSymbol('chesterGL.setPause', chesterGL.setPause);
goog.exportSymbol('chesterGL.getCurrentContext', chesterGL.getCurrentContext);
goog.exportSymbol('chesterGL.addMouseHandler', chesterGL.addMouseHandler);
goog.exportSymbol('chesterGL.removeMouseHandler', chesterGL.removeMouseHandler);
