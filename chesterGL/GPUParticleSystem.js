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

goog.provide("chesterGL.GPUParticleSystem");

goog.require("goog.vec.Vec4");
goog.require("chesterGL.Block");
goog.require("chesterGL.ParticleSystem");

/**
 * @const {number}
 * @ignore
 */
var BUFFER_ELEMENTS = 10;

/**
 * BUFFER_ELEMENTS * 4 (bytes) ~> BUFFER_ELEMENTS floats == 1 (lifetime) + 1 (start time) + 1 (start size) + 1 (end size) + 3 (start pos) + 3 (end pos)
 * @const {number}
 * @ignore
 */
var PARTICLE_SIZE = 40;

/**
 * @constructor
 * @param {Object} properties
 * @extends chesterGL.Block
 */
chesterGL.GPUParticleSystem = function (properties) {
	chesterGL.Block.call(this, null, chesterGL.Block.TYPE.PARTICLE);
	var _this = this;
	chesterGL.loadAsset('texture', properties['texture'], null, function () {
		_this.loadProperties(properties);
	});
};
goog.inherits(chesterGL.GPUParticleSystem, chesterGL.Block);

/**
 * @ignore
 * @type {boolean}
 */
chesterGL.GPUParticleSystem._shadersLoaded = false;

/**
 * Load the shaders for the particle system
 */
chesterGL.GPUParticleSystem.loadShaders = function () {
	chesterGL.initShader("particles", function (program) {
		var gl = chesterGL.gl;
		program.mvpMatrixUniform = gl.getUniformLocation(program, "uMVPMatrix");
		program.uSampler         = gl.getUniformLocation(program, "uSampler");
		program.u_time           = gl.getUniformLocation(program, "u_time");
		program.u_startColor     = gl.getUniformLocation(program, "u_startColor");
		program.u_endColor       = gl.getUniformLocation(program, "u_endColor");
		program.attribs = {
			'a_startPosition': gl.getAttribLocation(program, 'a_startPosition'),
			'a_lifetime'  : gl.getAttribLocation(program, 'a_lifetime'),
			'a_startTime'  : gl.getAttribLocation(program, 'a_startTime'),
			'a_startSize'  : gl.getAttribLocation(program, 'a_startSize'),
			'a_endSize'  : gl.getAttribLocation(program, 'a_endSize'),
			'a_speed'        : gl.getAttribLocation(program, 'a_speed')
		};
					
		// test for errors on gl
		var error = gl.getError();
		if (error !== 0) {
			console.log("gl error: " + error);
		}
	});
	chesterGL.GPUParticleSystem._shadersLoaded = true;
};

/**
 * Is the system running? (set to false to stop it)
 * @type {boolean}
 */
chesterGL.GPUParticleSystem.prototype.running = true;
	
/**
 * particle texture
 * @type {?string}
 */
chesterGL.GPUParticleSystem.prototype.particleTexture = null;

/**
 * The rate of the emission (it is calculated as totalParticles / lifetime)
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.emissionRate = 0;

/**
 * The timer that counts for the next emission
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.emissionCounter = 0;

/**
 * The current number of living particles
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.particleCount = 0;

/**
 * The current number of living particles
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.maxParticles = 0;

/**
 * The duration of the whole system in seconds. Set it to < 0 to be infinte
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.duration = 0;

/**
 * The lifetime of the particle (in seconds)
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.lifetime = 0;

/**
 * The lifetime variance of the particle (in seconds)
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.lifetimeVariance = 0;

/**
 * The starting color
 * @type {?goog.vec.Vec4.Type}
 */
chesterGL.GPUParticleSystem.prototype.startColor = null;

/**
 * The starting position variance
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.GPUParticleSystem.prototype.positionVariance = null;

/**
 * The end color
 * @type {?goog.vec.Vec4.Type}
 */
chesterGL.GPUParticleSystem.prototype.endColor = null;

/**
 * The particle speed
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.GPUParticleSystem.prototype.particleSpeed = null;

/**
 * The particle speed variance
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.GPUParticleSystem.prototype.particleSpeedVariance = null;

/**
 * The starting size
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.startSize = 0.0;

/**
 * The starting size variance
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.startSizeVariance = 0.0;

/**
 * The end size
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.endSize = 0.0;

/**
 * The end size variance
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.endSizeVariance = 0.0;

/**
 * @type {boolean}
 */
chesterGL.GPUParticleSystem.prototype.particleAdded = false;

/**
 * The current time of the system
 * @type {number}
 */
chesterGL.GPUParticleSystem.prototype.elapsedTime = 0;

/**
 * The blending options [src, dest]
 * @type {Array.<string>}
 */
chesterGL.GPUParticleSystem.prototype.blendOptions = ["SRC_ALPHA", "ONE_MINUS_SRC_ALPHA"];

/**
 * @param {Object} properties
 */
chesterGL.GPUParticleSystem.prototype.loadProperties = function (properties) {
	this.program = -1;
	if (!chesterGL.GPUParticleSystem._shadersLoaded) {
		chesterGL.GPUParticleSystem.loadShaders();
	}
	this.particleTexture = properties['texture'];
	this.maxParticles = properties['maxParticles'];
	this.duration = parseFloat(properties['duration']) * 1000.0;
	this.lifetime = parseFloat(properties['lifetime']) * 1000.0;
	this.lifetimeVariance = parseFloat(properties['lifetimeVariance']) * 1000.0;
	this.startColor = goog.vec.Vec4.createFloat32FromArray(properties['startColor']);
	this.positionVariance = goog.vec.Vec3.createFloat32FromArray(properties['positionVariance']);
	this.endColor = goog.vec.Vec4.createFloat32FromArray(properties['endColor']);
	this.particleSpeed = goog.vec.Vec3.createFloat32FromArray(properties['speed']);
	this.particleSpeedVariance = goog.vec.Vec3.createFloat32FromArray(properties['speedVariance']);
	this.startSize = parseFloat(properties['startSize']);
	this.startSizeVariance = parseFloat(properties['startSizeVariance']);
	this.endSize = parseFloat(properties['endSize']);
	this.endSizeVariance = parseFloat(properties['endSizeVariance']);
	this.elapsedTime = 0;
	this.blendOptions = properties['blendOptions'].slice(0); // copy the array
	this.running = true;
	
	this.glBuffer = chesterGL.gl.createBuffer();
	this.glBufferData = new Float32Array(this.maxParticles * BUFFER_ELEMENTS);
	this.resetParticles();
};

/**
 * adds a new particle (sets the lifetime in the data sent to the shader)
 */
chesterGL.GPUParticleSystem.prototype.addParticle = function () {
	var lifespan = Math.abs(this.lifetime + this.lifetimeVariance * (Math.random() * 2 - 1));
	this.initParticle(this.particleCount, lifespan, this.elapsedTime);
	this.particleCount++;
	this.particleAdded = true;
};

/**
 * @param {number} idx
 * @param {number=} lifetime
 * @param {number=} startTime
 */
chesterGL.GPUParticleSystem.prototype.initParticle = function (idx, lifetime, startTime) {
	var d = this.glBufferData;
	lifetime = lifetime || -1.0;
	startTime = startTime || 0.0;
	
	// lifetime, start time, start size, end size
	d[idx * BUFFER_ELEMENTS + 0] = lifetime;
	d[idx * BUFFER_ELEMENTS + 1] = startTime;
	d[idx * BUFFER_ELEMENTS + 2] = this.startSize + this.startSizeVariance * (Math.random() * 2 - 1);
	d[idx * BUFFER_ELEMENTS + 3] = this.endSize + this.endSizeVariance * (Math.random() * 2 - 1);
	
	// speed
	d[idx * BUFFER_ELEMENTS + 4] = this.particleSpeed[0] + this.particleSpeedVariance[0] * (Math.random() * 2 - 1);
	d[idx * BUFFER_ELEMENTS + 5] = this.particleSpeed[1] + this.particleSpeedVariance[1] * (Math.random() * 2 - 1);
	d[idx * BUFFER_ELEMENTS + 6] = this.particleSpeed[2] + this.particleSpeedVariance[2] * (Math.random() * 2 - 1);
	
	// start position
	d[idx * BUFFER_ELEMENTS + 7] = (Math.random() * 2 - 1) * this.positionVariance[0];
	d[idx * BUFFER_ELEMENTS + 8] = (Math.random() * 2 - 1) * this.positionVariance[1];
	d[idx * BUFFER_ELEMENTS + 9] = (Math.random() * 2 - 1) * this.positionVariance[2];
};

/**
 * reset particle data - this is slow!
 */
chesterGL.GPUParticleSystem.prototype.resetParticles = function () {
	var program = chesterGL.selectProgram("particles");
	var gl = chesterGL.gl;
	for (var i = 0; i < this.maxParticles; i++) {
		this.initParticle(i);
	}
	gl.uniform4fv(program.u_startColor, /** @type {Float32Array} */(this.startColor));
	gl.uniform4fv(program.u_endColor  , /** @type {Float32Array} */(this.endColor));
	gl.uniform1i(program.uSampler, 0);

	this.sendParticleData(program);
	
	this.particleCount = this.emissionCounter = 0;
	// how many particles are emitted per second
	this.emissionRate = this.maxParticles / Math.abs(this.lifetime);
};

/**
 * will send the particle data to the gpu
 * @param {WebGLProgram} program
 */
chesterGL.GPUParticleSystem.prototype.sendParticleData = function (program) {
	var gl = chesterGL.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
};

/**
 * @type {Float32Array}
 * @ignore
 */
var _ps_tmp = new Float32Array(BUFFER_ELEMENTS);

/**
 * The update loop for the particle system
 * @param {number} delta
 */
chesterGL.GPUParticleSystem.prototype.update = function (delta) {
	var program = chesterGL.selectProgram("particles");
	if (!program) {
		return;
	}
	this.elapsedTime += delta;

	// how many seconds until the next particle
	var rate = 1.0 / this.emissionRate;
	this.emissionCounter += delta;
	while (this.particleCount < this.maxParticles && this.emissionCounter > rate && this.running) {
		this.addParticle();
		this.emissionCounter -= rate;
	}

	for (var i = 0; i < this.maxParticles; i++) {
		var buffer = this.glBufferData;
		var idx = i * BUFFER_ELEMENTS;
		// if expired, move the (buffer) particle ahead
		if (buffer[idx] > 0 && (buffer[idx] + buffer[idx+1]) <= this.elapsedTime && i != this.particleCount - 1) {
			// copy the particle into the tmp buffer and invalidate
			var tmp = buffer.subarray(idx, idx + BUFFER_ELEMENTS);
			_ps_tmp.set(tmp);
			_ps_tmp[0] = -1.0;
			// shift the array from idx to particleCount
			tmp = buffer.subarray(idx + BUFFER_ELEMENTS, this.particleCount * BUFFER_ELEMENTS);
			buffer.set(tmp, idx);
			// copy the old particle in the last spot
			buffer.set(_ps_tmp, (this.particleCount-1) * BUFFER_ELEMENTS);
			// decrease the particle count
			this.particleCount --;
		}
	}

	if (this.duration > 0 && this.elapsedTime > this.duration) {
		this.running = false;
	}
};

chesterGL.GPUParticleSystem.prototype.render = function () {
	var program = chesterGL.selectProgram("particles");
	if (!program) {
		return;
	}
	var gl = chesterGL.gl;
	var texture = chesterGL.getAsset('texture', this.particleTexture);
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl[this.blendOptions[0]], gl[this.blendOptions[1]]);
	
	if (this.particleAdded) {
		this.sendParticleData(program);
		this.particleAdded = false;
	}
	
	// send the elapsed time
	gl.uniform1f(program.u_time, this.elapsedTime);
	
	// activate the texture
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture.tex);
	
	// bind buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
	gl.vertexAttribPointer(program.attribs['a_lifetime']     , 3, gl.FLOAT, false, PARTICLE_SIZE, 0);
	gl.vertexAttribPointer(program.attribs['a_startTime']    , 3, gl.FLOAT, false, PARTICLE_SIZE, 4);
	gl.vertexAttribPointer(program.attribs['a_startSize']    , 3, gl.FLOAT, false, PARTICLE_SIZE, 8);
	gl.vertexAttribPointer(program.attribs['a_endSize']      , 3, gl.FLOAT, false, PARTICLE_SIZE, 12);
	gl.vertexAttribPointer(program.attribs['a_speed']        , 3, gl.FLOAT, false, PARTICLE_SIZE, 16);
	gl.vertexAttribPointer(program.attribs['a_startPosition'], 3, gl.FLOAT, false, PARTICLE_SIZE, 28);
	
	// and draw:
	var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
	if (transformDirty) {
		goog.vec.Mat4.multMat(chesterGL.pMatrix, this.mvMatrix, this.mvpMatrix);
	}
	gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
	gl.drawArrays(gl.POINTS, 0, this.maxParticles);

	// revert the default blend func
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

goog.exportSymbol('chesterGL.GPUParticleSystem', chesterGL.GPUParticleSystem);
// // class methods
goog.exportProperty(chesterGL.GPUParticleSystem, 'loadShaders', chesterGL.GPUParticleSystem.loadShaders);
// // instance methods
goog.exportProperty(chesterGL.GPUParticleSystem.prototype, 'loadProperties', chesterGL.GPUParticleSystem.prototype.loadProperties);
