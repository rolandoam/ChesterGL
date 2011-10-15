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
	 * creates a new block. Pass the rect if you want to set the frame at
	 * creation time.
	 * 
	 * @constructor
	 * @param {Object.<string,number>|string=} rect
	 * @param {number=} type
	 * @param {ChesterGL.Block=} parent
	 */
	ChesterGL.Block = function (rect, type, parent) {
		this.type = type || ChesterGL.Block.TYPE.STANDALONE;
		if (parent) {
			this.parent = parent;
		}
		
		this.children = [];
		this.program = ChesterGL.Block.PROGRAM.DEFAULT;
		
		if (rect) {
			if (typeof(rect) === 'string') {
				var f = ChesterGL.BlockFrames.getFrame(rect);
				this.setTexture(f.texture);
				this.setFrame(f.frame);
			} else {
				this.setFrame(rect);
			}
		}
		// set default color
		this.setColor([1, 1, 1, 1]);
		
		if (ChesterGL.webglMode && this.type == ChesterGL.Block.TYPE.STANDALONE && (!parent || parent.type != ChesterGL.Block.TYPE.BLOCKGROUP)) {
			var gl = ChesterGL.gl;
			// just a single buffer for all data (a "quad")
			this.glBuffer = gl.createBuffer();
			this.glBufferData = new Float32Array(ChesterGL.Block.QUAD_SIZE);
		}
		
		// always create the mvMatrix
		this.mvMatrix = mat4.create();
		mat4.identity(this.mvMatrix);
	}
	
	/**
	 * what gl program to use
	 * @enum {number}
	 */
	ChesterGL.Block.PROGRAM = {
		DEFAULT: 0,
		TEXTURE: 1
	};
	
	/**
	 * program names
	 * @const
	 */
	ChesterGL.Block.PROGRAM_NAME = [
		"default",
		"texture"
	];
	
	/**
	 * @enum {number}
	 */
	ChesterGL.Block.TYPE = {
		STANDALONE: 0,
		BLOCKGROUP: 1
	};
	
	/**
	 * this is the size of the buffer data (Float32Array)
	 * 4*3 (verts) + 4*2 (tex coords) + 4*4 (color)
	 * @const
	 */
	ChesterGL.Block.QUAD_SIZE = 36;
	
	/**
	 * @const
	 */
	ChesterGL.Block.DEG_TO_RAD = Math.PI / 180.0;
	
	/**
	 * the full frame
	 * 
	 * @const
	 * @type {quat4}
	 */
	ChesterGL.Block.FullFrame = quat4.create([0.0, 0.0, 1.0, 1.0]);
	
	/**
	 * the size zero constant
	 * 
	 * @const
	 * @type {vec2}
	 */
	ChesterGL.Block.SizeZero = vec2.create([0.0, 0.0]);
	
	/**
	 * @type {?mat4}
	 */
	ChesterGL.Block.prototype.mvMatrix = null;
	
	/**
	 * @type {boolean}
	 */
	ChesterGL.Block.prototype.visible = true;
	
	/**
	 * did the position, scale or rotation change?
	 *
	 * @type {boolean}
	 */
	ChesterGL.Block.prototype.isTransformDirty = false;
	
	/**
	 * @type {boolean}
	 */
	ChesterGL.Block.prototype.isColorDirty = false;
	
	/**
	 * @type {boolean}
	 */
	ChesterGL.Block.prototype.isFrameDirty = false;
	
	/**
	 * @type {number}
	 */
	ChesterGL.Block.prototype.baseBufferIndex = 0;
	
	/**
	 * @type {?WebGLBuffer}
	 */
	ChesterGL.Block.prototype.glBuffer = null;

	/**
	 * @type {Float32Array}
	 */
	ChesterGL.Block.prototype.glBufferData = null;
			
	/**
	 * @type {vec3}
	 */
	ChesterGL.Block.prototype.position = vec3.create();
	
	/**
	 * @type {?vec3}
	 */
	ChesterGL.Block.prototype.contentSize = null;
	
	/**
	 * @type {quat4}
	 */
	ChesterGL.Block.prototype.color = quat4.create([1.0, 1.0, 1.0, 1.0]);
	
	/**
	 * @type {?string}
	 */
	ChesterGL.Block.prototype.texture = null;
	
	/**
	 * @type {number}
	 */
	ChesterGL.Block.prototype.opacity = 1.0;
			
	/**
	 * rotation of the box - in radians
	 * @type {number}
	 */
	ChesterGL.Block.prototype.rotation = 0;
	
	/**
	 * the scale of the box
	 * @type {number}
	 */
	ChesterGL.Block.prototype.scale = 1.0;
			
	/**
	 * update function
	 * @type {?function()}
	 */
	ChesterGL.Block.prototype.update = null;
	
	/**
	 * the texture frame
	 * @type {?quat4}
	 */
	ChesterGL.Block.prototype.frame = null;
	
	/**
	 * the block group this block belongs to
	 * @type {?ChesterGL.Block}
	 */
	ChesterGL.Block.prototype.parent = null;
			
	/**
	 * the array to hold children blocks
	 * @type {?Array.<ChesterGL.Block>}
	 */
	ChesterGL.Block.prototype.children = null;
	
	/**
	 * sets the frame for this block
	 * 
	 * @param {quat4} newFrame
	 */
	ChesterGL.Block.prototype.setFrame = function (newFrame) {
		this.frame = quat4.create(newFrame);
		this.setContentSize([newFrame[2], newFrame[3]]);
		this.isFrameDirty = true;
	}
	
	/**
	 * sets the size of the block in pixels
	 * 
	 * @param {vec2|Array} newSize
	 * @example
	 * // sets the content size to 128 x 128px
	 * block.setContentSize([128, 128]);
	 */
	ChesterGL.Block.prototype.setContentSize = function (newSize) {
		this.contentSize = vec2.create(newSize);
		this.isFrameDirty = true;
	}
	
	/**
	 * sets the scale of the block
	 * 
	 * @param {number} newScale
	 */
	ChesterGL.Block.prototype.setScale = function (newScale) {
		this.scale = newScale;
		this.isTransformDirty = true;			
	}
	
	/**
	 * sets the color of the block
	 * the quat4 should be created in the order RGBA
	 * 
	 * @param {quat4} color
	 */
	ChesterGL.Block.prototype.setColor = function (color) {
		this.color = quat4.create(color);
		this.isColorDirty = true;
	}
	
	ChesterGL.Block.prototype.setTexture = function (texturePath) {
		this.texture = texturePath;
		// force program to texture program
		this.program = ChesterGL.Block.PROGRAM.TEXTURE;
		var block = this;
		ChesterGL.loadAsset("texture", texturePath, function (t) {
			// set the default frame for all our blocks (if it's not set)
			if (!block.contentSize) {
				block.setContentSize([t.width, t.height]);
			}
			if (!block.frame) {
				block.setFrame([0, 0, t.width, t.height]);
			}
		});
	}
	
	/**
	 * move the block to a specific location.
	 * You can pass a time in seconds to make this an action
	 * 
	 * @param {vec3|Array} vec
	 * @param {number=} time The time it should take to move to that position. Don't pass time to make it instantly
	 */
	ChesterGL.Block.prototype.moveTo = function (vec, time) {
		this.position = vec3.create(vec);
		this.isTransformDirty = true;
	}
	
	/**
	 * move the block relatively
	 * @param {vec3|Array} vec
	 * @param {number=} time The time it should take to move to that position. Don't pass time to make it instantly
	 */
	ChesterGL.Block.prototype.moveBy = function (vec, time) {
		vec3.add(this.position, vec);
		this.isTransformDirty = true;
	}
	
	/**
	 * rotates the box to a specific angle (degrees, CW)
	 */
	ChesterGL.Block.prototype.rotateTo = function (angle) {
		this.rotation = -(angle * ChesterGL.Block.DEG_TO_RAD);
		this.isTransformDirty = true;
	}
	
	/**
	 * rotates the box by a specific angle (degrees, CW)
	 * 
	 * @param {number} angle
	 */
	ChesterGL.Block.prototype.rotateBy = function (angle) {
		this.rotation += -(angle * ChesterGL.Block.DEG_TO_RAD);
		this.isTransformDirty = true;
	}
	
	/**
	 * adds a block as a child
	 * 
	 * @param {ChesterGL.Block} block
	 */
	ChesterGL.Block.prototype.addChild = function (block) {
		if (block.parent) {
			throw "can't add a block twice!";
		}
		this.children.push(block);
		block.parent = this;
	}
	
	ChesterGL.Block.prototype.transform = function () {
		var gl = ChesterGL.gl;
		var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
		if (transformDirty) {
			mat4.identity(this.mvMatrix);
			mat4.translate(this.mvMatrix, this.position);
			mat4.rotate(this.mvMatrix, this.rotation, [0, 0, 1]);
			mat4.scale(this.mvMatrix, [this.scale, this.scale, 1]);
			// concat with parent's transform
			var ptransform = (this.parent ? this.parent.mvMatrix : null);
			if (ptransform) {
				mat4.multiply(ptransform, this.mvMatrix, this.mvMatrix);
			}
		}
		
		// bail out if we're a block group
		if (this.type == ChesterGL.Block.TYPE.BLOCKGROUP) {
			return;
		}
		
		var bufferData = this.glBufferData;
		var inBlockGroup = this.parent && this.parent.type == ChesterGL.Block.TYPE.BLOCKGROUP;
		
		if (ChesterGL.webglMode) {
			if (!inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
			}
			if (this.isFrameDirty) {
				// NOTE
				// the tex coords and the frame coords need to match. Otherwise you get a distorted image
				var hw = this.contentSize[0] * 0.5, hh = this.contentSize[1] * 0.5;
				var _idx = this.baseBufferIndex * ChesterGL.Block.QUAD_SIZE;
				var z = this.position[2];

				// NOTE
				// this is going to be slow :P
				// this is using the matrix to transform the vertex data
				if (inBlockGroup) {
					var tr = [ hw,  hh, 0],
						tl = [-hw,  hh, 0],
						br = [ hw, -hh, 0],
						bl = [-hw, -hh, 0];
					mat4.multiplyVec3(this.mvMatrix, tr);
					mat4.multiplyVec3(this.mvMatrix, tl);
					mat4.multiplyVec3(this.mvMatrix, bl);
					mat4.multiplyVec3(this.mvMatrix, br);

					bufferData[_idx+0] =  bl[0]; bufferData[_idx+ 1] =  bl[1]; bufferData[_idx+ 2] = z;
					bufferData[_idx+3] =  tl[0]; bufferData[_idx+ 4] =  tl[1]; bufferData[_idx+ 5] = z;
					bufferData[_idx+6] =  br[0]; bufferData[_idx+ 7] =  br[1]; bufferData[_idx+ 8] = z;
					bufferData[_idx+9] =  tr[0]; bufferData[_idx+10] =  tr[1]; bufferData[_idx+11] = z;
				} else {
					bufferData[_idx+0] = -hw; bufferData[_idx+ 1] = -hh; bufferData[_idx+ 2] = 0;
					bufferData[_idx+3] = -hw; bufferData[_idx+ 4] =  hh; bufferData[_idx+ 5] = 0;
					bufferData[_idx+6] =  hw; bufferData[_idx+ 7] = -hh; bufferData[_idx+ 8] = 0;
					bufferData[_idx+9] =  hw; bufferData[_idx+10] =  hh; bufferData[_idx+11] = 0;
				}

				if (this.program == ChesterGL.Block.PROGRAM.TEXTURE) {
					var tex = ChesterGL.getAsset("texture", this.texture);
					var texW = tex.width,
						texH = tex.height;
					var l = this.frame[0] / texW,
						t = this.frame[1] / texH,
						w = this.frame[2] / texW,
						h = this.frame[3] / texH;
					_idx += 12;
					bufferData[_idx+0] = l  ; bufferData[_idx+1] = t;
					bufferData[_idx+2] = l  ; bufferData[_idx+3] = t+h;
					bufferData[_idx+4] = l+w; bufferData[_idx+5] = t;
					bufferData[_idx+6] = l+w; bufferData[_idx+7] = t+h;
				}
			}
			if (this.isColorDirty) {
				_idx = 20 + this.baseBufferIndex * ChesterGL.Block.QUAD_SIZE;
				var color = this.color;
				for (var i=0; i < 4; i++) {
					bufferData[_idx+i*4    ] = color[0];
					bufferData[_idx+i*4 + 1] = color[1];
					bufferData[_idx+i*4 + 2] = color[2];
					bufferData[_idx+i*4 + 3] = color[3];
				}
			}
			if (ChesterGL.webglMode && !inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
				gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
			}
		}
	}
	
	ChesterGL.Block.prototype.visit = function () {
		if (this.update) {
			this.update();
		}
		if (!this.visible) {
			return;
		}
		this.transform();
		
		var children = this.children;
		var len = children.length;
		for (var i=0; i < len; i++) {
			children[i].visit();
		}
		
		// render this block if not in a block group
		if (!this.parent || this.parent.type != ChesterGL.Block.TYPE.BLOCKGROUP) {
			this.render();
		}
		// reset our dirty markers
		this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false;
	}
	
	/**
	 * render (only will work for non-blockgroup blocks)
	 */
	ChesterGL.Block.prototype.render = function () {
		if (this.type == ChesterGL.Block.TYPE.BLOCKGROUP) {
			throw "Cannot call render on a BlockGroup block!";
		}
		
		if (ChesterGL.webglMode) {
			var gl = ChesterGL.gl;
			// select current shader
			var program = ChesterGL.selectProgram(ChesterGL.Block.PROGRAM_NAME[this.program]);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
			var texOff = 12 * 4,
				colorOff = texOff + 8 * 4;

			gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, 0, 0);			
			gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, 0, colorOff);

			gl.uniform1f(program.opacityUniform, this.opacity);

			if (this.program == ChesterGL.Block.PROGRAM.DEFAULT) {
				// no extra attributes for the shader
			} else if (this.program == ChesterGL.Block.PROGRAM.TEXTURE) {
				var texture = ChesterGL.getAsset('texture', this.texture);

				// pass the texture attributes
				gl.vertexAttribPointer(program.attribs['textureCoordAttribute'], 2, gl.FLOAT, false, 0, texOff);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture.tex);
				gl.uniform1i(program.samplerUniform, 0);				
			}

			// set the matrix uniform (actually, only the model view matrix)
			gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		} else {
			var gl = ChesterGL.offContext;
			// canvas drawing api - we only draw textures
			if (this.program == ChesterGL.Block.PROGRAM.TEXTURE) {
				var m = this.mvMatrix;
				var texture = ChesterGL.getAsset('texture', this.texture);
				gl.globalAlpha = this.opacity;
				gl.setTransform(m[0], m[1], m[4], m[5], m[12], m[13]);
				var w = this.contentSize[0], h = this.contentSize[1];
				var frame = this.frame;
				gl.drawImage(texture, frame[0], texture.height - (frame[1] + h), frame[2], frame[3], -w/2, -h/2, w, h);
			}
		}
	}
		
	// export symbols
	// constants / enums
	ChesterGL.Block['FullFrame'] = ChesterGL.Block.FullFrame;
	ChesterGL.Block['SizeZero']  = ChesterGL.Block.SizeZero;
	ChesterGL.Block['TYPE']      = ChesterGL.Block.TYPE;
	// class methods
	ChesterGL.Block['create'] = ChesterGL.Block.create;
	// properties
	ChesterGL.Block.prototype['visible'] = ChesterGL.Block.prototype.visible;
	ChesterGL.Block.prototype['position'] = ChesterGL.Block.prototype.position;
	ChesterGL.Block.prototype['contentSize'] = ChesterGL.Block.prototype.contentSize;
	ChesterGL.Block.prototype['color'] = ChesterGL.Block.prototype.color;
	ChesterGL.Block.prototype['texture'] = ChesterGL.Block.prototype.texture;
	ChesterGL.Block.prototype['opacity'] = ChesterGL.Block.prototype.opacity;
	ChesterGL.Block.prototype['rotation'] = ChesterGL.Block.prototype.rotation;
	ChesterGL.Block.prototype['scale'] = ChesterGL.Block.prototype.scale;
	ChesterGL.Block.prototype['update'] = ChesterGL.Block.prototype.update;
	ChesterGL.Block.prototype['frame'] = ChesterGL.Block.prototype.frame;
	ChesterGL.Block.prototype['parent'] = ChesterGL.Block.prototype.parent;
	ChesterGL.Block.prototype['children'] = ChesterGL.Block.prototype.children;
	// instance methods
	ChesterGL.Block.prototype['setFrame'] = ChesterGL.Block.prototype.setFrame;
	ChesterGL.Block.prototype['setContentSize'] = ChesterGL.Block.prototype.setContentSize;
	ChesterGL.Block.prototype['setScale'] = ChesterGL.Block.prototype.setScale;
	ChesterGL.Block.prototype['setColor'] = ChesterGL.Block.prototype.setColor;
	ChesterGL.Block.prototype['setTexture'] = ChesterGL.Block.prototype.setTexture;
	ChesterGL.Block.prototype['moveTo'] = ChesterGL.Block.prototype.moveTo;
	ChesterGL.Block.prototype['moveBy'] = ChesterGL.Block.prototype.moveBy;
	ChesterGL.Block.prototype['rotateTo'] = ChesterGL.Block.prototype.rotateTo;
	ChesterGL.Block.prototype['rotateBy'] = ChesterGL.Block.prototype.rotateBy;
	ChesterGL.Block.prototype['addChild'] = ChesterGL.Block.prototype.addChild;
	
	window['ChesterGL']['Block'] = ChesterGL.Block;
})(window);
