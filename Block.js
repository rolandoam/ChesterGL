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
	 * @name Block
	 * @class
	 * @constructor
	 */
	var Block = function () {};
	
	/**
	 * what gl program to use
	 * @enum {number}
	 */
	Block.PROGRAM = {
		DEFAULT: 0,
		TEXTURE: 1
	};
	
	/**
	 * program names
	 * @const
	 */
	Block.PROGRAM_NAME = [
		"default",
		"texture"
	];
	
	/**
	 * @enum {number}
	 */
	Block.TYPE = {
		STANDALONE: 0,
		BLOCKGROUP: 1
	};
	
	/**
	 * this is the size of the buffer data (Float32Array)
	 * @const
	 */
	Block.QUAD_SIZE = 36;
	
	/**
	 * @const
	 */
	Block.DEG_TO_RAD = Math.PI / 180.0;
	
	/**
	 * the full frame
	 * 
	 * @const
	 * @type {Object.<string,number>}
	 */
	Block.FullFrame = {
		'l': 0.0,
		't': 0.0,
		'w': 1.0,
		'h': 1.0
	};
	
	/**
	 * the size zero constant
	 * 
	 * @const
	 * @type {Object.<string,number>}
	 */
	Block.SizeZero = {
		'w': 0,
		'h': 0
	};
	
	/**
	 * @type {?mat4}
	 */
	Block.prototype.mvMatrix = null;
	
	/**
	 * @type {boolean}
	 */
	Block.prototype.visible = true;
	
	/**
	 * did the position, scale or rotation change?
	 *
	 * @type {boolean}
	 */
	Block.prototype.isTransformDirty = false;
	
	/**
	 * @type {boolean}
	 */
	Block.prototype.isColorDirty = false;
	
	/**
	 * @type {boolean}
	 */
	Block.prototype.isFrameDirty = false;
	
	/**
	 * @type {number}
	 */
	Block.prototype.baseBufferIndex = 0;
	
	/**
	 * @type {?WebGLBuffer}
	 */
	Block.prototype.glBuffer = null;

	/**
	 * @type {Float32Array}
	 */
	Block.prototype.glBufferData = null;
			
	/**
	 * @type {Object.<string, number>}
	 */
	Block.prototype.position = {
		'x': 0,
		'y': 0,
		'z': 0
	};
	
	/**
	 * @type {Object.<string,number>}
	 */
	Block.prototype.contentSize = null;
	
	/**
	 * @type {Object.<string, number>}
	 */
	Block.prototype.color = {
		'r': 1.0,
		'g': 1.0,
		'b': 1.0,
		'a': 1.0
	};
	
	/**
	 * @type {?string}
	 */
	Block.prototype.texture = null;
	
	/**
	 * @type {number}
	 */
	Block.prototype.opacity = 1.0;
			
	/**
	 * rotation of the box - in radians
	 * @type {number}
	 */
	Block.prototype.rotation = 0;
	
	/**
	 * the scale of the box
	 * @type {number}
	 */
	Block.prototype.scale = 1.0;
			
	/**
	 * update function
	 * @type {?function()}
	 */
	Block.prototype.update = null;
	
	/**
	 * the texture frame
	 * @type {?Object.<string,number>}
	 */
	Block.prototype.frame = null;
	
	/**
	 * the block group this block belongs to
	 * @type {?Block}
	 */
	Block.prototype.parent = null;
			
	/**
	 * the array to hold children blocks
	 * @type {?Array.<Block>}
	 */
	Block.prototype.children = null;
	
	/**
	 * sets the frame for this block
	 * 
	 * @param {Object.<string,number>} newFrame
	 */
	Block.prototype.setFrame = function (newFrame) {
		this.frame = {
			't': newFrame['t'],
			'l': newFrame['l'],
			'w': newFrame['w'],
			'h': newFrame['h']
		};
		this.setContentSize(newFrame);
		this.isFrameDirty = true;
	}
	
	Block.prototype.setContentSize = function (newSize) {
		this.contentSize = {
			'w': newSize['w'],
			'h': newSize['h']
		};
		this.isFrameDirty = true;
	}
	
	/**
	 * sets the scale of the block
	 * 
	 * @param {number} newScale
	 */
	Block.prototype.setScale = function (newScale) {
		this.scale = newScale;
		this.isTransformDirty = true;			
	}
	
	/**
	 * sets the color of the block
	 * 
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 * @param {number} a
	 */
	Block.prototype.setColor = function (r, g, b, a) {
		this.color = {
			'r': r,
			'g': g,
			'b': b,
			'a': a
		}
		this.isColorDirty = true;
	}
	
	Block.prototype.setTexture = function (texturePath) {
		this.texture = texturePath;
		// force program to texture program
		this.program = Block.PROGRAM.TEXTURE;
		var block = this;
		ChesterGL.loadAsset("texture", texturePath, function (t) {
			// set the default frame for all our blocks (if it's not set)
			if (!block.contentSize) {
				block.setContentSize({
					'w': t.width,
					'h': t.height
				});
			}
			if (!block.frame) {
				block.setFrame({
					't': 0,
					'l': 0,
					'w': t.width,
					'h': t.height
				});
			}
		});
	}
	
	/**
	 * move the block to a specific location
	 */
	Block.prototype.moveTo = function (nx, ny, nz) {
		var x = nx || 0;
		var y = ny || 0;
		var z = nz || 0;
		this.position = {
			'x': x,
			'y': y,
			'z': z
		}
		this.isTransformDirty = true;
	}
	
	/**
	 * move the block relatively
	 */
	Block.prototype.moveBy = function (dx, dy, dz) {
		this.position.x += (dx || 0);
		this.position.y += (dy || 0);
		this.position.z += (dz || 0);
		this.isTransformDirty = true;
	}
	
	/**
	 * rotates the box to a specific angle
	 */
	Block.prototype.rotateTo = function (angle) {
		this.rotation = -(angle * Block.DEG_TO_RAD);
		this.isTransformDirty = true;
	}
	
	/**
	 * rotates the box by a specific angle (radians, counter clock wise)
	 * 
	 * @param {number} angle
	 */
	Block.prototype.rotateBy = function (angle) {
		this.rotation += -(angle * Block.DEG_TO_RAD);
		this.isTransformDirty = true;
	}
	
	/**
	 * adds a block as a child
	 * 
	 * @param {Block} block
	 */
	Block.prototype.addChild = function (block) {
		if (block.parent) {
			throw "can't add a block twice!";
		}
		this.children.push(block);
		block.parent = this;
	}
	
	Block.prototype.transform = function () {
		var gl = ChesterGL.gl;
		var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
		if (transformDirty) {
			mat4.identity(this.mvMatrix);
			mat4.translate(this.mvMatrix, [this.position.x, this.position.y, this.position.z]);
			mat4.rotate(this.mvMatrix, this.rotation, [0, 0, 1]);
			mat4.scale(this.mvMatrix, [this.scale, this.scale, 1]);
			// concat with parent's transform
			var ptransform = (this.parent ? this.parent.mvMatrix : null);
			if (ptransform) {
				mat4.multiply(ptransform, this.mvMatrix, this.mvMatrix);
			}
		}
		
		// bail out if we're a block group
		if (this.type == Block.TYPE.BLOCKGROUP) {
			return;
		}
		
		var bufferData = this.glBufferData;
		var inBlockGroup = this.parent && this.parent == Block.TYPE.BLOCKGROUP;
		
		if (ChesterGL.webglMode) {
			if (!inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
			}
			if (this.isFrameDirty) {
				// NOTE
				// the tex coords and the frame coords need to match. Otherwise you get a distorted image
				var hw = this.contentSize.w / 2.0, hh = this.contentSize.h / 2.0;
				var _idx = this.baseBufferIndex * Block.QUAD_SIZE;
				var z = this.position.z;

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

				if (this.program == Block.PROGRAM.TEXTURE) {
					var tex = ChesterGL.getAsset("texture", this.texture);
					var texW = tex.width,
						texH = tex.height;
					var l = this.frame.l / texW,
						t = this.frame.t / texH,
						w = this.frame.w / texW,
						h = this.frame.h / texH;
					_idx = 12 + this.baseBufferIndex * Block.QUAD_SIZE;
					bufferData[_idx+0] = l  ; bufferData[_idx+1] = t;
					bufferData[_idx+2] = l  ; bufferData[_idx+3] = t+h;
					bufferData[_idx+4] = l+w; bufferData[_idx+5] = t;
					bufferData[_idx+6] = l+w; bufferData[_idx+7] = t+h;
				}
			}
			if (this.isColorDirty) {
				_idx = 20 + this.baseBufferIndex * Block.QUAD_SIZE;
				var color = this.color;
				for (var i=0; i < 4; i++) {
					bufferData[_idx+i*4    ] = color.r;
					bufferData[_idx+i*4 + 1] = color.g;
					bufferData[_idx+i*4 + 2] = color.b;
					bufferData[_idx+i*4 + 3] = color.a;
				}
			}
			if (ChesterGL.webglMode && !inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
				gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
			}
		}
	}
	
	Block.prototype.visit = function () {
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
		if (!this.parent || this.parent.type != Block.TYPE.BLOCKGROUP) {
			this.render();
		}
		// reset our dirty markers
		this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false;
	}
	
	/**
	 * render (only will work for non-blockgroup blocks)
	 */
	Block.prototype.render = function () {
		if (this.type == Block.TYPE.BLOCKGROUP) {
			throw "Cannot call render on a BlockGroup block!";
		}
		var gl = ChesterGL.gl;
		
		if (ChesterGL.webglMode) {
			// select current shader
			var program = ChesterGL.selectProgram(Block.PROGRAM_NAME[this.program]);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
			var texOff = 12 * 4,
				colorOff = texOff + 8 * 4;

			gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, 0, 0);			
			gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, 0, colorOff);

			gl.uniform1f(program.opacityUniform, this.opacity);

			if (this.program == Block.PROGRAM.DEFAULT) {
				// no extra attributes for the shader
			} else if (this.program == Block.PROGRAM.TEXTURE) {
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
			// canvas drawing api - we only draw textures
			if (this.program == Block.PROGRAM.TEXTURE) {
				var m = this.mvMatrix;
				var texture = ChesterGL.getAsset('texture', this.texture);
				gl.globalAlpha = this.opacity;
				gl.setTransform(m[0], m[1], m[4], m[5], m[12], m[13]);
				var w = this.contentSize.w, h = this.contentSize.h;
				var frame = this.frame;
				gl.drawImage(texture, frame.l, frame.t, frame.w, frame.h, -w/2, -h/2, w, h);
			}
		}
	}
	
	/**
	 * create a new block. Pass the rect if you want to set the frame at
	 * creation time.
	 * 
	 * @constructs
	 * @param {Object.<string,number>|string=} rect
	 * @param {number=} type
	 * @param {Block=} parent
	 */
	Block.create = function (rect, type, parent) {
		var b = new Block();
		b.type = type || Block.TYPE.STANDALONE;
		if (parent) {
			b.parent = parent;
		}
		
		b.children = [];
		b.program = Block.PROGRAM.DEFAULT;
		
		if (rect) {
			if (typeof(rect) === 'string') {
				var f = ChesterGL.BlockFrames.getFrame(rect);
				b.setTexture(f.texture);
				b.setFrame(f);
				b.setContentSize(f);
			} else {
				b.setFrame(rect);
			}
		}
		// set default color
		b.setColor(1, 1, 1, 1);
		
		if (ChesterGL.webglMode && b.type == Block.TYPE.STANDALONE && (!parent || parent.type != Block.TYPE.BLOCKGROUP)) {
			var gl = ChesterGL.gl;
			// just a single buffer for all data (a "quad")
			b.glBuffer = gl.createBuffer();
			b.glBufferData = new Float32Array(Block.QUAD_SIZE);
		}
		
		// always create the mvMatrix
		b.mvMatrix = mat4.create();
		mat4.identity(b.mvMatrix);
		return b;
	}
	
	// export symbols
	// constants / enums
	Block['FullFrame'] = Block.FullFrame;
	Block['SizeZero'] = Block.SizeZero;
	Block['TYPE'] = Block.TYPE;
	// class methods
	Block['create'] = Block.create;
	// properties
	Block.prototype['visible'] = Block.prototype.visible;
	Block.prototype['position'] = Block.prototype.position;
	Block.prototype['contentSize'] = Block.prototype.contentSize;
	Block.prototype['color'] = Block.prototype.color;
	Block.prototype['texture'] = Block.prototype.texture;
	Block.prototype['opacity'] = Block.prototype.opacity;
	Block.prototype['rotation'] = Block.prototype.rotation;
	Block.prototype['scale'] = Block.prototype.scale;
	Block.prototype['update'] = Block.prototype.update;
	Block.prototype['frame'] = Block.prototype.frame;
	Block.prototype['parent'] = Block.prototype.parent;
	Block.prototype['children'] = Block.prototype.children;
	// instance methods
	Block.prototype['setFrame'] = Block.prototype.setFrame;
	Block.prototype['setContentSize'] = Block.prototype.setContentSize;
	Block.prototype['setScale'] = Block.prototype.setScale;
	Block.prototype['setColor'] = Block.prototype.setColor;
	Block.prototype['setTexture'] = Block.prototype.setTexture;
	Block.prototype['moveTo'] = Block.prototype.moveTo;
	Block.prototype['moveBy'] = Block.prototype.moveBy;
	Block.prototype['rotateTo'] = Block.prototype.rotateTo;
	Block.prototype['rotateBy'] = Block.prototype.rotateBy;
	Block.prototype['addChild'] = Block.prototype.addChild;
	
	window['ChesterGL']['Block'] = Block;
})(window);
