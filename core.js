/**
 * ChesterGL - Simple 2D WebGL demo/library
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

/**
 * @typedef {Object.<number,number>}
 */
var vec2 = {};

/**
 * @constructor
 * @param {(vec2|Array)=} vec
 * @return {vec2}
 */
vec2.create = function (vec) {
	var dest = new Float32Array(2);
	
	if (vec) {
		dest[0] = vec[0];
		dest[1] = vec[1];
	}
	
	return dest;
};

(function (window) {	
	/**
	 * @name ChesterGL
	 * @namespace
	 * @typedef {Object}
	 */
	var ChesterGL = {};
	
	/**
	 * right now we're going to stick with just setTimeout - it apparently
	 * gives us better performance
	 * @ignore
	 */
	window.requestAnimFrame = (function(){
		return function(callback, element) {
			window.setTimeout(callback, 1000/60);
		};
	})();
	
	/**
	 * This is the WebGL context
	 * 
	 * @type {?WebGLRenderingContext}
	 */
	ChesterGL.gl = null;
	
	/**
	 * @type {Object.<string,WebGLProgram>}
	 */
	ChesterGL.programs = {};
	
	/**
	 * @type {?string}
	 */
	ChesterGL.currentProgram = null;
	
	/**
	 * @type {?mat4}
	 */
	ChesterGL.pMatrix = null;
	
	/**
	 * @type {?ChesterGL.Block}
	 */
	ChesterGL.rootBlock = null;
	ChesterGL['rootBlock'] = ChesterGL.rootBlock;
	
	/**
	 * @type {?Element}
	 */
	ChesterGL.canvas = null;
	
	/**
	 * default projection: 3d
	 * 
	 * @type {string}
	 */
	ChesterGL.projection = "3d";
	ChesterGL['projection'] = ChesterGL.projection;
		
	/**
	 * are we on webgl?
	 * @type {boolean}
	 */
	ChesterGL.webglMode = true;
	ChesterGL['webglMode'] = ChesterGL.webglMode;
	
	/**
	 * whether or not to use an offscreen buffer when in not webgl mode
	 * 
	 * @type {boolean}
	 */
	ChesterGL.usesOffscreenBuffer = false;
	ChesterGL['usesOffscreenBuffer'] = ChesterGL.usesOffscreenBuffer;
	
	/**
	 * @type {Object.<string,Object>}
	 */ 
	ChesterGL.assets = {};
	
	/**
	 * the asset-loaded handlers
	 */
	ChesterGL.assetsHandlers = {};
	
	/**
	 * @type {Object.<string,function ()>}
	 */
	ChesterGL.assetsLoadedListeners = {};
	
	/**
	 * the time last frame was rendered
	 * @type {number}
	 */
	ChesterGL.lastTime = Date.now();
	
	/**
	 * delta in seconds from last frame
	 * @type {number}
	 */
	ChesterGL.delta = 0;
	
	/**
	 * the current number of frames per second
	 * @type {number}
	 */
	ChesterGL.fps = 0;
	
	/**
	 * the span that will hold the fps counter
	 * @type {?Element}
	 */
	ChesterGL.debugFPS = null;
	
	/**
	 * the global update function, to be called every
	 * frame - with the delta from last frame
	 *
	 * @type {?function(number)}
	 */
	ChesterGL.update = null;
	
	/**
	 * sets the current program, also sets the uniforms for that shader
	 * 
	 * @function
	 * @param {String} program
	 */
	ChesterGL.selectProgram = function (program) {
		var prog = this.programs[program];
		var gl = this.gl;
		if (program != this.currentProgram) {
			// console.log("selecting program " + program);
			this.currentProgram = program;
			gl.validateProgram(prog);
			gl.useProgram(prog);
			// enable attribs
			for (var attr in prog.attribs) {
				// console.log("  enabling attribute " + attr);
				gl.enableVertexAttribArray(prog.attribs[attr]);
			}
			// set the projection matrix
			gl.uniformMatrix4fv(prog.pMatrixUniform, false, this.pMatrix);
		}
		return prog;
	}
	
	/**
	 * setups the webgl canvas
	 */
	ChesterGL.setup = function (canvas_id) {
		var canvas = document.getElementById(canvas_id); // get the DOM element
		this.initGraphics(canvas);
		if (this.webglMode) {
			this.initDefaultShaders();
		}
		
		this.debugFPS = document.getElementById("debug-fps");
		// register the default handler for textures
		this.registerAssetHandler('texture', this.defaultTextureHandler);
	}
	
	/**
	 * tryies to init the graphics stuff:
	 * 1st attempt: webgl
	 * fallback: canvas
	 */
	ChesterGL.initGraphics = function (canvas) {
		try {
			this.canvas = canvas;
			if (this.webglMode) {
				this.gl = canvas.getContext("experimental-webgl");
			}
		} catch (e) {
			console.log("ERROR: " + e);
		}
		if (!this.gl) {
			// fallback to canvas API (uses an offscreen buffer)
			this.gl = canvas.getContext("2d");
			if (this.usesOffscreenBuffer) {
				this.offCanvas = document.createElement('canvas');
				this.offCanvas.width = canvas.width;
				this.offCanvas.height = canvas.height;
				this.offContext = this.offCanvas.getContext("2d");
				this.offContext.viewportWidth = canvas.width;
				this.offContext.viewportHeight = canvas.height;
				this['offContext'] = this.offContext;
				this.offContext['viewportWidth'] = this.offContext.viewportWidth;
				this.offContext['viewportHeight'] = this.offContext.viewportHeight;
			} else {
				this.offContext = this.gl;
			}
			if (!this.gl || !this.offContext) {
				throw "Error initializing graphic context!";
			}
			this.webglMode = false;
		}
		this['gl'] = this.gl;
		
		// get real width and height
		this.gl.viewportWidth = canvas.width;
		this.gl.viewportHeight = canvas.height;
		this.gl['viewportWidth'] = this.gl.viewportWidth;
		this.gl['viewportHeight'] = this.gl.viewportHeight;
	}
	
	/**
	 * init the default shader
	 */
	ChesterGL.initDefaultShaders = function () {
		var gl = this.gl;
					
		this.initShader("default", function (program) {
			program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
			program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
			program.opacityUniform = gl.getUniformLocation(program, "opacity");
			
			program.attribs = {
				'vertexPositionAttribute': gl.getAttribLocation(program, "aVertexPosition"),
				'vertexColorAttribute': gl.getAttribLocation(program, "aVertexColor")
			}
		});
		
		this.initShader("texture", function (program) {
			program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
			program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
			program.samplerUniform = gl.getUniformLocation(program, "uSampler");
			program.opacityUniform = gl.getUniformLocation(program, "opacity");
			program.attribs = {
				'vertexColorAttribute': gl.getAttribLocation(program, "aVertexColor"),
				'textureCoordAttribute': gl.getAttribLocation(program, "aTextureCoord"),
				'vertexPositionAttribute': gl.getAttribLocation(program, "aVertexPosition")
			};
		});
	}
	
	/**
	 * init shaders (fetches data - in a sync way)
	 */
	ChesterGL.initShader = function (prefix, callback) {
		var gl = this.gl;
		var fsData = this.loadShader(prefix, "frag");
		var vsData = this.loadShader(prefix, "vert");
		
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
		
		
		var program = this.createShader(prefix, fs, vs);
		if (callback) callback(program);
		this.initShader1 = true;
	}
	
	/**
	 * loads the shader data
	 */
	ChesterGL.loadShader = function (prefix, type) {
		var shaderData = null;
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
	}
	
	/**
	 * actually creates the shader
	 */
	ChesterGL.createShader = function (prefix, fragmentData, vertexData) {
		var gl = this.gl;
		var program = gl.createProgram();
		gl.attachShader(program, fragmentData);
		gl.attachShader(program, vertexData);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.log("problem linking shader");
		}
		console.log("creating shader " + prefix);
		this.programs[prefix] = program;
		return program;
	}
	
	/**
	 * registers an asset loader (which is basically a function).
	 * By convention, every handler must set the <code>data</code> property of the asset. It should not
	 * modify the status property.
	 * 
	 * @param {string} type the type of the asset
	 * @param {function(string,string,function(boolean)=)} handler the handler that will be called every time an asset is loaded
	 * 
	 * @example
	 * ChesterGL.defaultTextureHandler = function (path, data, callback) {
	 *		// create the image
	 *		var imgtype = (/[.]/.exec(path)) ? /[^.]+$/.exec(path) : undefined;
	 *		var img = new Image();
	 *		var rawData = base64.encode(data);
	 *		img.onload = function () {
	 *			if (ChesterGL.webglMode) {
	 *				img.tex = ChesterGL.gl.createTexture();
	 *			}
	 *			var texture = ChesterGL.assets['texture'][path];
	 *			texture.data = img;
	 *			var result = true;
	 *			if (ChesterGL.webglMode) {
	 *				result = ChesterGL.prepareWebGLTexture(img);
	 *			}
	 *			callback && callback(result);
	 *		}
	 *		img.src = "data:image/" + imgtype + ";base64," + rawData;
	 * }
	 */
	ChesterGL.registerAssetHandler = function (type, handler) {
		this.assetsHandlers[type] = handler;
	}
	
	/**
	 * loads and asset asynchronically
	 * 
	 * @param {string} type the type of asset being loaded, it could be "texture", "frameset", "audio"
	 * @param {string|Object} path the path for the asset
	 * @param {function(Object)=} callback the callback that will be executed as soon as the asset is loaded
	 */
	ChesterGL.loadAsset = function (type, path, callback) {
		var dataType = undefined;
		if (typeof(path) == 'object') {
			dataType = path.dataType;
			path = path.path;
		}
		
		if (!this.assets[type]) {
			this.assets[type] = {};
		}
		var assets = this.assets[type];
		if (!assets[path]) {
			// not in our records
			console.log("loading asset [" + type + "] " + path);
			assets[path] = {
				data: null,
				status: 'try',
				listeners: []
			}
			callback && assets[path].listeners.push(callback);
			this.loadAsset(type, {path: path, dataType: dataType});
		} else if (assets[path].status == 'loading') {
			// created but not yet loaded
			callback && assets[path].listeners.push(callback);
		} else if (assets[path].status == 'loaded') {
			// created and loaded, just call the callback
			callback && callback(assets[path].data);
		} else if (assets[path].status == 'try') {
			assets[path].status = 'loading';
			$.ajax({
				url: path,
				dataType: dataType,
				beforeSend: function (xhr) {
					// only binary data, please
					xhr.overrideMimeType('text/plain; charset=x-user-defined');
				},
				success: function (data, textStatus) {
					if (textStatus == "success") {
						ChesterGL.assetsHandlers[type](path, data, function (handled) {
							if (!handled) {
								assets[path].status = 'try';
								console.log("fetching " + path + " - again");
								ChesterGL.loadAsset(type, {path: path, dataType: dataType});
							} else {
								assets[path].status = 'loaded';
								// call all listeners
								var l;
								while (l = assets[path].listeners.shift()) { l(assets[path].data); }
								ChesterGL.assetsLoaded(type);
								ChesterGL.assetsLoaded('all');
							}
						});
					} else {
						console.log("Error loading asset " + path);
					}
				}
			});
		}
	}
	
	/**
	 * adds a listener for when all assets are loaded
	 * 
	 * @param {string} type You can query for all types if you pass "all" as type
	 * @param {function()=} callback The callback to be executed when all assets of that type are loaded
	 */
	ChesterGL.assetsLoaded = function (type, callback) {
		var listeners = this.assetsLoadedListeners[type];
		if (!listeners) {
			this.assetsLoadedListeners[type] = [];
			listeners = this.assetsLoadedListeners[type];
		}
		if (callback) {
			listeners.push(callback);
		}
		var allLoaded = true;
		if (type == 'all') {
			for (var t in this.assets) {
				var assets = this.assets[t];
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
			var assets = this.assets[type];
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
	}
	
	/**
	 * returns the object associated with the requested asset
	 */
	ChesterGL.getAsset = function (type, path) {
		return this.assets[type][path].data;
	}
	
	/**
	 * handles a loaded texture - should only be called on a webGL mode
	 * @return {boolean}
	 */
	ChesterGL.prepareWebGLTexture = function (texture) {
		var gl = this.gl;
		var result = true;
		
		try {
			var error = 0;
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
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
	}
	
	/**
	 * The default texture handler
	 * 
	 * @param {string} path
	 * @param {string} data
	 * @param {function(boolean)=} callback
	 */
	ChesterGL.defaultTextureHandler = function (path, data, callback) {
		var imgtype = (/[.]/.exec(path)) ? /[^.]+$/.exec(path) : undefined;
		var img = new Image();
		var rawData = base64.encode(data);
		img.onload = function () {
			if (ChesterGL.webglMode) {
				img.tex = ChesterGL.gl.createTexture();
			}
			var texture = ChesterGL.assets['texture'][path];
			texture.data = img;
			var result = true;
			if (ChesterGL.webglMode) {
				result = ChesterGL.prepareWebGLTexture(img);
			}
			callback && callback(result);
		}
		img.src = "data:image/" + imgtype + ";base64," + rawData;
	}
	
	/**
	 * setups the perspective (2d or 3d)
	 */
	ChesterGL.setupPerspective = function () {
		var gl = this.gl;
		
		// quick bail if we're not on a webgl rendering mode
		if (!this.webglMode) {
			return;
		}
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		
		var width = gl.viewportWidth;
		var height = gl.viewportHeight;
		gl.viewport(0, 0, width, height);
		
		this.pMatrix = mat4.create();
		
		if (this.projection == "2d") {
			// 2d projection
			console.log("setting up 2d projection (" + width + "," + height + ")");
			mat4.ortho(0, width, 0, height, -1024, 1024, this.pMatrix);
		} else if (this.projection == "3d") {
			// 3d projection
			console.log("setting up 3d projection (" + width + "," + height + ")");
			// var f_aspect = (1.7320508075688776 / (width / height));
			var zeye   = height / 1.1566;
			var matA   = mat4.perspective(60, width / height, 0.5, 1500.0);
			var eye    = vec3.create([width/2, height/2, zeye]);
			var center = vec3.create([width/2, height/2, 0]);
			var up     = vec3.create([0, 1, 0]);
			var matB = mat4.lookAt(eye, center, up);
			mat4.multiply(matA, matB, this.pMatrix);
		} else {
			throw "Invalid projection: " + this.projection;
		}
	}
	
	/**
	 * main draw function, will call the root block
	 */
	ChesterGL.drawScene = function () {
		if (this.webglMode) {
			var gl = this.gl;
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			// global blending options
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.enable(gl.BLEND);
		} else {
			var gl = this.offContext;
			gl.setTransform(1, 0, 0, 1, 0, 0);
			gl.fillRect(0, 0, gl.viewportWidth, gl.viewportHeight);
		}
		
		// start mayhem
		if (this.rootBlock) {
			this.rootBlock.visit();
		}
		
		if (!this.webglMode) {
			// copy back the off context (if we use one)
			if (this.usesOffscreenBuffer) {
				this.gl.fillRect(0, 0, gl.viewportWidth, gl.viewportHeight);
				this.gl.drawImage(this.offCanvas, 0, 0);
			}
		}		
	}
	
	/**
	 * extend an object with another object (for super naive 1-level inheritance).
	 * When extending classes, you would usually use ChesterGL.extend(B.prototype, A.prototype) to
	 * inherit from A.
	 * 
	 * @param {Object} target the object that will be extended
	 * @param {Object} parent the parent object
	 * 
	 * @example
	 * var a = {
	 *   prop1 = function () {...},
	 *   prop2 = function () {...}
	 * }
	 * 
	 * var b = {
	 *   prop2 = function () {...}
	 * }
	 * 
	 * ChesterGL.extend(b, a);
	 * 
	 * // now you can call b.prop2() and from within prop2, you can
	 * // call the parent's version:
	 * 
	 * var b = {
	 *   prop2 = function () {
	 *     prop2_(); // call the parent's version
	 *   }
	 * }
	 */
	ChesterGL.extend = function (target, parent) {
		if (typeof target === "object" && typeof parent === "object") {
			for (var prop in parent) {
				if (!target[prop]) {
					target[prop] = parent[prop];
				} else {
					target[prop + "_"] = parent[prop];
				}
			}
		}
	}
	
	/**
	 * updates the internal FPS counter
	 */		
	ChesterGL.updateFPS = function () {
		var current = Date.now(); // milliseconds
		var delta = current - ChesterGL.lastTime;
		ChesterGL.lastTime = current;
		
		var raw_fps = 1000.0 / delta;
		var alpha = 0.1;
		var new_fps = raw_fps * alpha + ChesterGL.fps * (1.0 - alpha);
		ChesterGL.fps = Math.round(new_fps);
		ChesterGL.delta = delta;
		
		ChesterGL.debugFPS && (ChesterGL.debugFPS.textContent = ChesterGL.fps);
	}
	
	/**
	 * run at browser's native animation speed
	 * @function
	 */
	ChesterGL.run = function () {
		ChesterGL.drawScene();
		window.requestAnimFrame(ChesterGL.run, ChesterGL.canvas);
		ChesterGL.updateFPS();
		ChesterGL.update && ChesterGL.update(ChesterGL.delta);
	}
	
	// export symbols
	ChesterGL['setup'] = ChesterGL.setup;
	ChesterGL['registerAssetHandler'] = ChesterGL.registerAssetHandler;
	ChesterGL['loadAsset'] = ChesterGL.loadAsset;
	ChesterGL['assetsLoaded'] = ChesterGL.assetsLoaded;
	ChesterGL['getAsset'] = ChesterGL.getAsset;
	ChesterGL['drawScene'] = ChesterGL.drawScene;
	ChesterGL['run'] = ChesterGL.run;
	
	window['ChesterGL'] = ChesterGL;
})(window);
