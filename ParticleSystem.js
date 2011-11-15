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

(function (window) {
	var ChesterGL = window['ChesterGL'];
	
	/**
	 * @const {number}
	 * @ignore
	 */
	var BUFFER_ELEMENTS = 9;
	
	/**
	 * BUFFER_ELEMENTS * 4 (bytes) ~> BUFFER_ELEMENTS floats == 1 (lifetime) + 1 (start size) + 1 (end size) + 3 (start pos) + 3 (end pos)
	 * @ignore
	 * @const {number}
	 */
	var PARTICLE_SIZE = 36;
	
	/**
	 * @param {vec3} original The original vector
	 * @param {vec3} variance the variance for every coordinate in the original vector
	 * @return {vec3}
	 */
	function randomVec3(original, variance) {
		var vec = vec3.create();
		if (variance) {
			vec[0] = original[0] + (variance[0] * 2 * Math.random());
			vec[1] = original[1] + (variance[1] * 2 * Math.random());
			vec[2] = original[2] + (variance[2] * 2 * Math.random());
		} else {
			vec[0] = original[0];
			vec[1] = original[1];
			vec[2] = original[2];
		}
		return vec;
	}
	
	/**
	 * @constructor
	 * @extends ChesterGL.Block
	 * @param {Object} properties
	 * @return ParticleSystem;
	 */
	ChesterGL.ParticleSystem = function (properties) {
		ChesterGL.Block.call(this, null, ChesterGL.Block.TYPE.PARTICLE);
		var _this = this;
		ChesterGL.loadAsset('texture', properties['texture'], function () {
			_this.loadProperties(properties);
		});
	}
	
	/**
	 * @ignore
	 * @type {boolean}
	 */
	ChesterGL.ParticleSystem._shadersLoaded = false;
	
	/**
	 * Load the shaders for the particle system
	 */
	ChesterGL.ParticleSystem.loadShaders = function () {
		ChesterGL.initShader("particles", function (program) {
			var gl = ChesterGL.gl;
			program.mvpMatrixUniform = gl.getUniformLocation(program, "uMVPMatrix");
			program.uSampler         = gl.getUniformLocation(program, "uSampler");
			program.u_time           = gl.getUniformLocation(program, "u_time");
			program.u_startColor     = gl.getUniformLocation(program, "u_startColor");
			program.u_endColor       = gl.getUniformLocation(program, "u_endColor");
			program.attribs = {
				'a_startPosition': gl.getAttribLocation(program, 'a_startPosition'),
				'a_lifetime'  : gl.getAttribLocation(program, 'a_lifetime'),
				'a_startSize'  : gl.getAttribLocation(program, 'a_startSize'),
				'a_endSize'  : gl.getAttribLocation(program, 'a_endSize'),
				'a_speed'        : gl.getAttribLocation(program, 'a_speed')
			};
			// test for errors on gl
			var error = gl.getError();
			if (error != 0) {
				console.log("gl error: " + error);
			}
		});
		ChesterGL.ParticleSystem._shadersLoaded = true;
	}
	
	/**
	 * extend from BlockGroup
	 * @ignore
	 */
	ChesterGL.ParticleSystem.prototype = Object.create(ChesterGL.Block.prototype);
		
	/**
	 * particle texture
	 * @type {?string}
	 */
	ChesterGL.ParticleSystem.prototype.particleTexture = null;
	
	/**
	 * The current number of living particles
	 * @type {number}
	 */
	ChesterGL.ParticleSystem.prototype.maxParticles = 0;

	/**
	 * The duration of the whole system in seconds. Set it to < 0 to be infinte
	 * @type {number}
	 */
	ChesterGL.ParticleSystem.prototype.duration = 0;

	/**
	 * The lifetime of the particle (in seconds)
	 * @type {number}
	 */
	ChesterGL.ParticleSystem.prototype.lifetime = 0;

	/**
	 * The lifetime variance of the particle (in seconds)
	 * @type {number}
	 */
	ChesterGL.ParticleSystem.prototype.lifetimeVariance = 0;

	/**
	 * The starting color
	 * @type {?quat4}
	 */
	ChesterGL.ParticleSystem.prototype.startColor = null;

	/**
	 * The starting position variance
	 * @type {?vec3}
	 */
	ChesterGL.ParticleSystem.prototype.positionVariance = null;

	/**
	 * The end color
	 * @type {?quat4}
	 */
	ChesterGL.ParticleSystem.prototype.endColor = null;
	
	/**
	 * The particle speed
	 * @type {?vec3}
	 */
	ChesterGL.ParticleSystem.prototype.particleSpeed = null;

	/**
	 * The particle speed variance
	 * @type {?vec3}
	 */
	ChesterGL.ParticleSystem.prototype.particleSpeedVariance = null;

	/**
	 * The current time of the system
	 * @type {number}
	 */
	ChesterGL.ParticleSystem.prototype.elapsedTime = 0;

	/**
	 * The blending options [src, dest]
	 * @type {Array.<string>}
	 */
	ChesterGL.ParticleSystem.prototype.blendOptions = ["SRC_ALPHA", "ONE_MINUS_SRC_ALPHA"];
	
	/**
	 * @param {Object} properties
	 */
	ChesterGL.ParticleSystem.prototype.loadProperties = function (properties) {
		this.program = -1;
		if (!ChesterGL.ParticleSystem._shadersLoaded) {
			ChesterGL.ParticleSystem.loadShaders();
		}
		this.particleTexture = properties['texture'];
		this.maxParticles = properties['maxParticles'];
		this.duration = parseFloat(properties['duration']) * 1000.0;
		this.lifetime = parseFloat(properties['lifetime']) * 1000.0;
		this.lifetimeVariance = parseFloat(properties['lifetimeVariance']) * 1000.0;
		this.startColor = quat4.create(properties['startColor']);
		this.positionVariance = vec3.create(properties['positionVariance']);
		this.endColor = quat4.create(properties['endColor']);
		this.particleSpeed = vec3.create(properties['speed']);
		this.particleSpeedVariance = vec3.create(properties['speedVariance']);
		this.elapsedTime = 0;
		this.blendOptions = properties['blendOptions'].slice(0); // copy the array
		
		this.glBuffer = ChesterGL.gl.createBuffer();
		this.glBufferData = new Float32Array(this.maxParticles * BUFFER_ELEMENTS);
		this.resetParticles();
	}
	
	/**
	 * reset particle data - this is slow!
	 */
	ChesterGL.ParticleSystem.prototype.resetParticles = function () {
		var program = ChesterGL.selectProgram("particles");
		var gl = ChesterGL.gl;
		for (var i = 0; i < this.maxParticles; i++) {
			// lifetime
			this.glBufferData[i * BUFFER_ELEMENTS + 0] = Math.abs(this.lifetime + this.lifetimeVariance * (Math.random() * 2 - 1));
			// start size
			this.glBufferData[i * BUFFER_ELEMENTS + 1] = 40.0;
			// end size
			this.glBufferData[i * BUFFER_ELEMENTS + 2] = 1.0;
			
			// speed
			this.glBufferData[i * BUFFER_ELEMENTS + 3] = this.particleSpeed[0] + this.particleSpeedVariance[0] * (Math.random() * 2 - 1);
			this.glBufferData[i * BUFFER_ELEMENTS + 4] = this.particleSpeed[1] + this.particleSpeedVariance[1] * (Math.random() * 2 - 1);
			this.glBufferData[i * BUFFER_ELEMENTS + 5] = this.particleSpeed[2] + this.particleSpeedVariance[2] * (Math.random() * 2 - 1);
			
			// start position
			this.glBufferData[i * BUFFER_ELEMENTS + 6] = (Math.random() * 2 - 1) * this.positionVariance[0];
			this.glBufferData[i * BUFFER_ELEMENTS + 7] = (Math.random() * 2 - 1) * this.positionVariance[1];
			this.glBufferData[i * BUFFER_ELEMENTS + 8] = (Math.random() * 2 - 1) * this.positionVariance[2];
		}
		
		gl.uniform4fv(program.u_startColor, this.startColor);
		gl.uniform4fv(program.u_endColor  , this.endColor);
		gl.uniform1i(program.uSampler, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
		gl.vertexAttribPointer(program.attribs['a_lifetime']     , 3, gl.FLOAT, false, PARTICLE_SIZE, 0);
		gl.vertexAttribPointer(program.attribs['a_startSize']    , 3, gl.FLOAT, false, PARTICLE_SIZE, 4);
		gl.vertexAttribPointer(program.attribs['a_endSize']      , 3, gl.FLOAT, false, PARTICLE_SIZE, 8);
		gl.vertexAttribPointer(program.attribs['a_speed']        , 3, gl.FLOAT, false, PARTICLE_SIZE, 12);
		gl.vertexAttribPointer(program.attribs['a_startPosition'], 3, gl.FLOAT, false, PARTICLE_SIZE, 24);	
	}
	
	ChesterGL.ParticleSystem.prototype.update = function (delta) {
		var program = ChesterGL.selectProgram("particles");
		if (!program) {
			return;
		}
		this.elapsedTime += delta;
		if (this.duration > 0 && this.elapsedTime > this.duration) {
			this.elapsedTime = 0;
		}
		ChesterGL.gl.uniform1f(program.u_time, this.elapsedTime);
	}

	/**
	 * the only difference between this and any other block is in the Render phase
	 */
	ChesterGL.ParticleSystem.prototype.render = function () {
		var program = ChesterGL.selectProgram("particles");
		if (!program) {
			return;
		}
		var gl = ChesterGL.gl;
		var texture = ChesterGL.getAsset('texture', this.particleTexture);
		
		gl.blendFunc(gl[this.blendOptions[0]], gl[this.blendOptions[1]]);
		gl.enable(gl.BLEND);
		
		// activate the texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture.tex);
		
		// and draw:
		var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
		if (transformDirty) {
			mat4.multiply(ChesterGL.pMatrix, this.mvMatrix, this.mvpMatrix);
		}
		gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
		gl.drawArrays(gl.POINTS, 0, this.maxParticles);
	}
})(window);