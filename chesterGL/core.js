/**
 * chesterGL - Simple 2D WebGL demo/library
 *
 * Copyright (c) 2010-2011 Rolando Abarca
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

	var off = $(this).offset(), height = $(this).height();
	pt.x = (evt.pageX - off.left);
	pt.y = (height - (evt.pageY - off.top));
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

/** @define {boolean} */
var ENABLE_DEBUG = false;

/** @ignore */
function throwOnGLError(err, funcName, args) {
	console.log(WebGLDebugUtils.glEnumToString(err) + " was caused by call to " + funcName);
}

/**
 * This is the WebGL context
 * 
 * @type {?WebGLRenderingContext}
 */
chesterGL.gl = null;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL._paused = false;

/**
 * For debug/performance metrics. You can set this to false to ignore analytics (no data will be sent).
 * This will use whatever profile you have for analytics on the game page
 * 
 * @type {boolean}
 */
chesterGL.useGoogleAnalytics = false;

/**
 * @type {Object.<string,WebGLProgram>}
 */
chesterGL.programs = {};

/**
 * @type {?string}
 */
chesterGL.currentProgram = null;

/**
 * @type {?goog.vec.Mat4.Type}
 */
chesterGL.pMatrix = null;

/**
 * @type {?chesterGL.Block}
 */
chesterGL.runningScene = null;

/**
 * @type {?Element}
 */
chesterGL.canvas = null;

/**
 * default projection: 3d
 * 
 * @type {string}
 */
chesterGL.projection = "3d";

/**
 * are we on webgl?
 * @type {boolean}
 */
chesterGL.webglMode = true;

/**
 * whether or not to debug sprites (show bounding box)
 * set this by adding a ?_cdbg=1 to the url of the document
 * @type {boolean}
 */
chesterGL.debugSprite = false;

/**
 * whether or not to use an offscreen buffer when in not webgl mode
 * 
 * @type {boolean}
 */
chesterGL.usesOffscreenBuffer = false;

/**
 * @type {Object.<string,Object>}
 */ 
chesterGL.assets = {};

/**
 * the asset-loaded handlers
 * @type {Object.<string,Function>}
 */
chesterGL.assetsHandlers = {};

/**
 * the asset loader: it specifies how a type of asset should be loaded.
 * The default for textures is creating a new Image() element, the default for any other
 * type is jquery's $.ajax asynchronously.
 * @type {Object.<string,Function>}
 */
chesterGL.assetsLoaders = {};

/**
 * @type {Object.<string,Array>}
 */
chesterGL.assetsLoadedListeners = {};

/**
 * the time last frame was rendered
 * @type {number}
 */
chesterGL.lastTime = Date.now();

/**
 * delta in seconds from last frame
 * @type {number}
 */
chesterGL.delta = 0;

/**
 * the current number of frames per second
 * @type {number}
 */
chesterGL.fps = 0;

/**
 * the span that will hold the debug info
 * @type {?Element}
 */
chesterGL.debugSpan = null;

/**
 * the id of the span that will hold the debug info. Defaults to "debug-info"
 * @type {string}
 */
chesterGL.debugSpanId = "debug-info";

/**
 * the global update function, to be called every
 * frame - with the delta from last frame
 *
 * @type {?function(number)}
 */
chesterGL.update = null;

/**
 * @enum {number}
 */
chesterGL.mouseEvents = {
	DOWN: 0,
	MOVE: 1,
	UP: 2
}

/**
 * the global list of mouse down handlers
 * @type {Array.<function(goog.vec.Vec3.Vec3Like, chesterGL.mouseEvents)>}
 */
chesterGL.mouseHandlers = [];

/**
 * sets the current program, also sets the uniforms for that shader
 * 
 * @param {string} program
 * @return {WebGLProgram}
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
 * adds a listener for when all assets are loaded
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
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
 * @param {chesterGL.Block} block
 */
chesterGL.setRunningScene = function (block) {
	if (block.type == chesterGL.Block.TYPE['SCENE']) {
		chesterGL.runningScene = block;
	}
};

/**
 * main draw function, will call the root block
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

/** @ignore */
chesterGL.updateDebugTime = function () {
	var now = Date.now();
	chesterGL.elapsed_ += chesterGL.delta;
	chesterGL.frames_ ++;
	if (now - chesterGL.lastDebugSecond_ > 1000) {
		var avg = (chesterGL.elapsed_ / chesterGL.frames_);
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
				// Let us know if this is WebGL or canvas mode
				'renderTime-' + (chesterGL.webglMode),
				chesterGL.runningScene.title,
				Math.floor(chesterGL.sumAvg/chesterGL.sampledAvg)
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
};

/**
 * @type {goog.vec.Vec3.Type}
 * @ignore
 */
var __tmp_mouse_vec = new Float32Array(3);

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseDownHandler = function (event) {
	/** @type {goog.math.Vec2} */
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	__tmp_mouse_vec.set([pt.x, pt.y]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](__tmp_mouse_vec, chesterGL.mouseEvents.DOWN);
	}
};

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseMoveHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	__tmp_mouse_vec.set([pt.x, pt.y]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](__tmp_mouse_vec, chesterGL.mouseEvents.MOVE);
	}
};

/**
 * @param {Event} event
 * @ignore
 */
chesterGL.mouseUpHandler = function (event) {
	var pt = chesterGL.canvas.relativePosition(event);
	var i = 0, len = chesterGL.mouseHandlers.length;
	__tmp_mouse_vec.set([pt.x, pt.y]);
	for (; i < len; i++) {
		chesterGL.mouseHandlers[i](__tmp_mouse_vec, chesterGL.mouseEvents.UP);
	}
};

/**
 * @param {function(goog.math.Vec2, number)} callback
 * @ignore
 */
chesterGL.addMouseHandler = function (callback) {
	if (chesterGL.mouseHandlers.indexOf(callback) == -1) {
		chesterGL.mouseHandlers.push(callback);
	}
};

/**
 * @param {function(goog.vec.Vec3.Vec3Like, number)} callback
 * @ignore
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
		chesterGL.run();
	}
};

// properties
goog.exportSymbol('chesterGL.useGoogleAnalytics', chesterGL.useGoogleAnalytics);
goog.exportSymbol('chesterGL.projection', chesterGL.projection);
goog.exportSymbol('chesterGL.webglMode', chesterGL.webglMode);
goog.exportSymbol('chesterGL.usesOffscreenBuffer', chesterGL.usesOffscreenBuffer);
goog.exportSymbol('chesterGL.debugSpanId', chesterGL.debugSpanId);
goog.exportSymbol('chesterGL.update', chesterGL.update);
goog.exportSymbol('chesterGL.mouseEvents', chesterGL.mouseEvents);
goog.exportSymbol('chesterGL.mouseEvents.DOWN', chesterGL.mouseEvents.DOWN);
goog.exportSymbol('chesterGL.mouseEvents.MOVE', chesterGL.mouseEvents.MOVE);
goog.exportSymbol('chesterGL.mouseEvents.UP', chesterGL.mouseEvents.UP);
// methods
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
goog.exportSymbol('chesterGL.addMouseHandler', chesterGL.addMouseHandler);
goog.exportSymbol('chesterGL.removeMouseHandler', chesterGL.removeMouseHandler);
