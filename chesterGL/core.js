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
	var pt = HTMLCanvasElement._canvas_tmp_mouse;
	pt.x = 0; pt.y = 0;
	if (this.__offset == undefined) {
		this.__offset = $(this).offset();
		this.__height = $(this).height();
	}

	pt.x = (evt.pageX - this.__offset.left);
	pt.y = (this.__height - (evt.pageY - this.__offset.top));
	return pt;
};

/**
 * @ignore
 * @type {function(function(), Element)}
 */
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			};
})();
goog.exportSymbol('requestAnimationFrame', window.requestAnimationFrame);

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
	'debugSpanId': 'debug-info'
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
 * This is the WebGL context
 * 
 * @type {?WebGLRenderingContext}
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
 * the span that will hold the debug info
 * @type {?Element}
 * @ignore
 */
chesterGL.debugSpan = null;

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
	var canvas = document.getElementById(canvasId); // get the DOM element
	var settings = chesterGL.settings;

	// copy values for future reference
	chesterGL.projection = /** @type {string} */(settings['projection']);
	chesterGL.webglMode = /** @type {boolean} */(settings['webglMode']);
	chesterGL.useGoogleAnalytics = /** @type {boolean} */(settings['useGoogleAnalytics']);
	chesterGL.usesOffscreenBuffer = /** @type {boolean} */(settings['usesOffscreenBuffer']);

	chesterGL.initGraphics(canvas);
	if (chesterGL.webglMode) {
		chesterGL.initDefaultShaders();
	}
	var queryStr = window.location.search.substring(1);
	var keyValues = queryStr.split('&');
	for (var i in keyValues) {
		var key = keyValues[i].split('=');
		if (key[0] == '_cdbg' && key[1] == '1') {
			chesterGL.debugSprite = true;
			console.log("debug mode on");
		}
	}

	chesterGL.debugSpan = document.getElementById("debug-info");
	// register the default handler for textures
	chesterGL.registerAssetHandler('texture', chesterGL.defaultTextureHandler);
	chesterGL.registerAssetLoader('texture', chesterGL.defaultTextureLoader);
	chesterGL.registerAssetLoader('default', chesterGL.defaultAssetLoader);
};

/**
 * tryies to init the graphics stuff:
 * 1st attempt: webgl
 * fallback: canvas
 * 
 * @param {Element} canvas
 */
chesterGL.initGraphics = function (canvas) {
	try {
		chesterGL.canvas = canvas;
		if (chesterGL.webglMode) {
			chesterGL.gl = canvas.getContext("experimental-webgl", {alpha: false, antialias: false});
			if (chesterGL.gl && window['WebGLDebugUtils']) {
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
		if (chesterGL.usesOffscreenBuffer) {
			chesterGL.offCanvas = document.createElement('canvas');
			chesterGL.offCanvas.width = canvas.width;
			chesterGL.offCanvas.height = canvas.height;
			chesterGL.offContext = chesterGL.offCanvas.getContext("2d");
			chesterGL.offContext.viewportWidth = canvas.width;
			chesterGL.offContext.viewportHeight = canvas.height;
		} else {
			chesterGL.offContext = chesterGL.gl;
		}
		if (!chesterGL.gl || !chesterGL.offContext) {
			throw "Error initializing graphic context!";
		}
		chesterGL.webglMode = false;
	}
	// first resize of the canvas
	chesterGL.canvasResized();
	
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
		}
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
	$.ajax({
		url: "shaders/" + prefix + "." + type,
		async: false,
		type: 'GET',
		success: function (data, textStatus) {
			if (textStatus == "success") {
				shaderData = data;
			} else {
				console.log("error getting the shader data");
			}
		}
	});
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
 * @param {string|Object} assetPath the path for the asset
 * @param {function(Object)=} cb the callback that will be executed as soon as the asset is loaded
 */
chesterGL.loadAsset = function (type, assetPath, cb) {
	var dataType_ = undefined;
	if (typeof(assetPath) == 'object') {
		dataType_ = assetPath.dataType;
		assetPath = assetPath.path;
	}

	if (!chesterGL.assets[type]) {
		chesterGL.assets[type] = {};
	}

	var assets = chesterGL.assets[type];
	if (!assets[assetPath]) {
		// not in our records
		assets[assetPath] = {
			data: null,
			status: 'try',
			listeners: []
		}
		cb && assets[assetPath].listeners.push(cb);
		chesterGL.loadAsset(type, {path: assetPath, dataType: dataType_});
	} else if (assets[assetPath].status == 'loading') {
		// created but not yet loaded
		cb && assets[assetPath].listeners.push(cb);
	} else if (assets[assetPath].status == 'loaded') {
		// created and loaded, just call the callback
		cb && cb(assets[assetPath].data);
	} else if (assets[assetPath].status == 'try') {
		assets[assetPath].status = 'loading';
		if (chesterGL.assetsLoaders[type])
			chesterGL.assetsLoaders[type](type, {url: assetPath, dataType: dataType_});
		else
			chesterGL.assetsLoaders['default'](type, {url: assetPath, dataType: dataType_});
		cb && assets[assetPath].listeners.push(cb);
	}
};

/**
 * adds a listener/query for when all assets are loaded
 * 
 * @param {string} type You can query for all types if you pass "all" as type
 * @param {function()=} callback The callback to be executed when all assets of that type are loaded
 */
chesterGL.assetsLoaded = function (type, callback) {
	var listeners = chesterGL.assetsLoadedListeners[type];
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
			var assets = chesterGL.assets[t];
			for (var i in assets) {
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
		var assets = chesterGL.assets[type];
		for (var i in assets) {
			if (assets[i].status != 'loaded') {
				allLoaded = false;
				break;
			}
		}
	}
	if (allLoaded) {
		var l;
		while (l = listeners.shift()) { l(); }
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
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture.tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
		error = gl.getError();
		if (error != 0) {
			console.log("gl error " + error);
			result = false;
		}
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
 * The default texture handler
 * 
 * @param {string} path
 * @param {Object|HTMLImageElement} img
 * @return {boolean}
 * @ignore
 */
chesterGL.defaultTextureHandler = function (path, img) {
	if (chesterGL.webglMode) {
		img.tex = chesterGL.gl.createTexture();
	}
	var texture = chesterGL.assets['texture'][path];
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
	var img = new Image();
	var path = params.url;
	img.addEventListener("load", function () {
		var texture = chesterGL.assets['texture'][path];
		if (chesterGL.assetsHandlers[type](path, img)) {
			// call all listeners
			texture.status = 'loaded';
			var l;
			while (l = texture.listeners.shift()) { l(texture.data); }
			// test for assets loaded
			chesterGL.assetsLoaded(type);
			chesterGL.assetsLoaded('all');
		} else {
			// requeue
			texture.status = 'try';
			chesterGL.loadAsset(type, path);
		}
	}, false);
	img.src = path;
};

/**
 * @param {string} type
 * @param {Object.<string,string>|null|string} params
 * @ignore
 */
chesterGL.defaultAssetLoader = function (type, params) {
	var path = params.url;
	$.ajax({
		url: path,
		dataType: params.dataType,
		success: function (data, textStatus) {
			var asset = chesterGL.assets[type][path];
			if (textStatus == "success") {
				var handler = chesterGL.assetsHandlers[type];
				if (!handler) { throw "No handler for asset of type " + type; }
				if (handler(path, data)) {
					asset.status = 'loaded';
					// call all listeners
					var l;
					while (l = asset.listeners.shift()) { l(asset.data); }
					// test for assets loaded
					chesterGL.assetsLoaded(type);
					chesterGL.assetsLoaded('all');
				} else {
					// requeue
					asset.status = 'try';
					chesterGL.loadAsset(type, path);
				}
			} else {
				console.log("Error loading asset " + path);
			}
		}
	});
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
	gl.disable(gl.DEPTH_TEST)

	var width = gl.viewportWidth;
	var height = gl.viewportHeight;
	gl.viewport(0, 0, width, height);

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
	if (block.type == chesterGL.Block.TYPE['SCENE']) {
		chesterGL.runningScene = block;
	}
};

/**
 * main draw function, will call the root block
 * @ignore
 */
chesterGL.drawScene = function () {
	var gl = undefined;
	if (chesterGL.webglMode) {
		gl = chesterGL.gl;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	} else {
		gl = chesterGL.offContext;
		gl.setTransform(1, 0, 0, 1, 0, 0);
		gl.fillRect(0, 0, gl.viewportWidth, gl.viewportHeight);
	}
	
	// start mayhem
	if (chesterGL.runningScene) {
		chesterGL.runningScene.visit();
	}
	
	if (!chesterGL.webglMode) {
		// copy back the off context (if we use one)
		if (chesterGL.usesOffscreenBuffer) {
			gl.fillRect(0, 0, gl.viewportWidth, gl.viewportHeight);
			gl.drawImage(chesterGL.offCanvas, 0, 0);
		}
	}
	// for actions and other stuff
	var current = Date.now(); // milliseconds
	chesterGL.delta = current - chesterGL.lastTime;
	chesterGL.lastTime = current;	
};

/**
 * @type {number}
 * @ignore
 */
chesterGL.lastDebugSecond_ = Date.now();
/**
 * @type {number}
 * @ignore
 */
chesterGL.elapsed_ = 0;
/**
 * @type {number}
 * @ignore
 */
chesterGL.frames_ = 0;
/**
 * @type {number}
 * @ignore
 */
chesterGL.sampledAvg = 0;
/**
 * @type {number}
 * @ignore
 */
chesterGL.sumAvg = 0;

/**
 * the last milliseconds per frame calculated
 * (updated every second)
 * @type {number}
 */
chesterGL.lastSampledMpf = 0;

/**
 * @return {number}
 */
chesterGL.getSampledMpf = function () {
	return chesterGL.lastSampledMpf;
};

/** @ignore */
chesterGL.updateDebugTime = function () {
	var now = Date.now();
	chesterGL.elapsed_ += chesterGL.delta;
	chesterGL.frames_ ++;
	if (now - chesterGL.lastDebugSecond_ > 1000) {
		var avg = (chesterGL.elapsed_ / chesterGL.frames_);
		chesterGL.lastSampledMpf = 1.0 * avg;
		chesterGL.sumAvg += avg;
		chesterGL.sampledAvg ++;
		if (chesterGL.debugSpan) {
			chesterGL.debugSpan.textContent = avg.toFixed(2);
		}
		// track how well we're performing - every 5 seconds
		if (chesterGL.runningScene && chesterGL.useGoogleAnalytics && chesterGL.sampledAvg > 5) {
			_gaq.push([
				'_trackEvent',
				'chesterGL',
				// Let us know if this is WebGL or canvas mode, and what version of chester
				'renderTime-' + (chesterGL.webglMode) + '-' + chesterGL.version,
				chesterGL.runningScene.title,
				1.0 * (chesterGL.sumAvg/chesterGL.sampledAvg)
			]);
			chesterGL.sumAvg = chesterGL.sampledAvg = 0;
		}
		chesterGL.elapsed_ = chesterGL.frames_ = 0;
		chesterGL.lastDebugSecond_ = now;
	}
};

/**
 * install all handlers on the canvas element
 * @ignore
 */
chesterGL.installMouseHandlers = function () {
	$(chesterGL.canvas).mousedown(chesterGL.mouseDownHandler);
	$(chesterGL.canvas).mousemove(chesterGL.mouseMoveHandler);
	$(chesterGL.canvas).mouseup(chesterGL.mouseUpHandler);
	$(chesterGL.canvas).mouseenter(chesterGL.mouseEnterHandler);
	$(chesterGL.canvas).mouseleave(chesterGL.mouseLeaveHandler);
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
 * 	if (type == chesterGL.mouseEvents.DOWN) {
 * 		stPoint = new Float32Array(pt);
 * 	} else if (type == chesterGL.mouseEvents.MOVE && stPoint) {
 * 		var tmp = [pt[0] - stPoint[0], pt[1] - stPoint[1], pt[2] - stPoint[2]];
 * 		tmx.setPosition([tmx.position[0] + tmp[0], tmx.position[1] + tmp[1], tmx.position[2] + tmp[2]]);
 * 		stPoint.set(pt);
 * 	} else {
 * 		stPoint = null;
 * 	}
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
	if (idx > 0) {
		chesterGL.mouseHandlers.splice(idx, 1);
	}
};

/**
 * run at browser's native animation speed
 */
chesterGL.run = function () {
	if (!chesterGL._paused) {
		// console.time("mainLoop");
		window.requestAnimFrame(chesterGL.run, chesterGL.canvas);
		chesterGL.drawScene();
		chesterGL.ActionManager.tick(chesterGL.delta);
		// console.timeEnd("mainLoop");
		if (ENABLE_DEBUG) chesterGL.updateDebugTime();
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
 * @returns {boolean}
 */
chesterGL.isPaused = function () {
	return chesterGL._paused;
};

// properties
goog.exportSymbol('chesterGL.version', chesterGL.version);
goog.exportSymbol('chesterGL.settings', chesterGL.settings);
goog.exportSymbol('chesterGL.mouseEvents', chesterGL.mouseEvents);
goog.exportProperty(chesterGL.mouseEvents, 'UP', chesterGL.mouseEvents.UP);
goog.exportProperty(chesterGL.mouseEvents, 'DOWN', chesterGL.mouseEvents.DOWN);
goog.exportProperty(chesterGL.mouseEvents, 'MOVE', chesterGL.mouseEvents.MOVE);
goog.exportProperty(chesterGL.mouseEvents, 'ENTER', chesterGL.mouseEvents.ENTER);
goog.exportProperty(chesterGL.mouseEvents, 'LEAVE', chesterGL.mouseEvents.LEAVE);
// methods
goog.exportSymbol('chesterGL.getSampledMpf', chesterGL.getSampledMpf);
goog.exportSymbol('chesterGL.viewportSize', chesterGL.viewportSize);
goog.exportSymbol('chesterGL.setup', chesterGL.setup);
goog.exportSymbol('chesterGL.canvasResized', chesterGL.canvasResized);
goog.exportSymbol('chesterGL.initShader', chesterGL.initShader);
goog.exportSymbol('chesterGL.registerAssetHandler', chesterGL.registerAssetHandler);
goog.exportSymbol('chesterGL.loadAsset', chesterGL.loadAsset);
goog.exportSymbol('chesterGL.assetsLoaded', chesterGL.assetsLoaded);
goog.exportSymbol('chesterGL.getAsset', chesterGL.getAsset);
goog.exportSymbol('chesterGL.setupPerspective', chesterGL.setupPerspective);
goog.exportSymbol('chesterGL.setRunningScene', chesterGL.setRunningScene);
goog.exportSymbol('chesterGL.drawScene', chesterGL.drawScene);
goog.exportSymbol('chesterGL.run', chesterGL.run);
goog.exportSymbol('chesterGL.togglePause', chesterGL.togglePause);
goog.exportSymbol('chesterGL.isPaused', chesterGL.isPaused);
goog.exportSymbol('chesterGL.addMouseHandler', chesterGL.addMouseHandler);
goog.exportSymbol('chesterGL.removeMouseHandler', chesterGL.removeMouseHandler);
