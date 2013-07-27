/*
 * chesterGL - Simple 2D WebGL Library
 *
 * Copyright (c) 2010-2013 Rolando Abarca
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

define(["require", "glmatrix", "chester/util", "chester/block"], function (require, glmatrix, util, Block) {
	/**
	 * will be filled later, with the core object
	 */
	var core = null;

	/**
	 * creates a new block group
	 *
	 * @constructor
	 * @param {(string|null)=} texture An optional texture that will be shared with all children
	 * @param {number=} noChildren The optional initial number of maxChidlren. Defaults to 10
	 * @extends {chesterGL.Block}
	 */
	var BlockGroup = function (texture, noChildren) {
		if (!core.settings.webglMode) {
			throw "BlockGroup only works on WebGL mode";
		}
		// call "super"
		Block.call(this, null, Block.TYPE.BLOCKGROUP);
		if (texture) {
			this.texture = texture;
			this.program = Block.PROGRAM.TEXTURE;
		} else {
			this.program = Block.PROGRAM.DEFAULT;
		}
		this.maxChildren = noChildren || 10;

		// create the buffers for the children
		this.createBuffers();
	};
	util.inherits(BlockGroup, Block);

	/**
	 * The max number of children this blockgroup can hold (this is here for the buffer data)
	 * @type {number}
	 * @ignore
	 */
	BlockGroup.prototype.maxChildren = 0;

	/**
	 * @type {boolean}
	 * @ignore
	 */
	BlockGroup.prototype.isChildDirty = false;

	/**
	 * @type {?WebGLBuffer}
	 * @ignore
	 */
	BlockGroup.prototype.indexBuffer = null;

	/**
	 * @type {?Uint16Array}
	 * @ignore
	 */
	BlockGroup.prototype.indexBufferData = null;

	/**
	 * Creates the buffers for the current maxChildren size
	 * @param {Array|Float32Array=} oldBufferData
	 * @param {Array|Uint16Array=} oldIndexData
	 * @param {boolean=} recreate
	 * @ignore
	 */
	BlockGroup.prototype.createBuffers = function (oldBufferData, oldIndexData, recreate) {
		var gl = core.gl;
		if (!this.glBuffer || recreate)
			this.glBuffer = gl.createBuffer();
		if (!this.indexBuffer || recreate)
			this.indexBuffer = gl.createBuffer();

		if (recreate) {
			this.recreateIndices(0);
		} else {
			var glBufferData    = new Float32Array(Block.BUFFER_SIZE * this.maxChildren);
			var indexBufferData = new Uint16Array(6 * this.maxChildren);
			if (oldBufferData) {
				glBufferData.set(oldBufferData);
			}
			if (oldIndexData) {
				indexBufferData.set(oldIndexData);
			}
			this.glBufferData = glBufferData;
			this.indexBufferData = indexBufferData;
		}
	};

	/**
	 * creates a block that can be added to this block group
	 * @param {glmatrix.vec4} rect
	 */
	BlockGroup.prototype.createBlock = function (rect) {
		var b = new Block(rect, Block.TYPE.STANDALONE, this);
		if (this.texture) {
			b.setTexture(this.texture, rect);
		}
		return b;
	};

	/**
	 * appends a child
	 * @param {...Block} blocks
	 */
	BlockGroup.prototype.append = function (blocks) {
		for (var i in arguments) {
			var block = arguments[i];
			if (block.parent != this) {
				throw "Invalid child: can only add children created with BlockGroup.create";
			}
			if (this.children.length >= this.maxChildren) {
				// should resize the buffers
				this.maxChildren *= 2;
				this.createBuffers(this.glBufferData, this.indexBufferData);
			}
			if (!this.texture) {
				this.texture = block.texture;
			} else {
				if (this.texture != block.texture) {
					throw "Invalid child: only can add child with the same texture";
				}
			}
			this.children.push(block);

			var length = this.children.length;

			// just point the buffer data on the child and set the baseIndex
			block.baseBufferIndex = length-1;
			block.glBufferData    = this.glBufferData;
			this.isChildDirty = true;
		}
		return this;
	};

	/**
	 * removes a block from the group
	 * @param {Block} b
	 */
	BlockGroup.prototype.remove = function (b) {
		if (b.parent != this) {
			throw "Invalid child";
		}
		if (this._inVisit) {
			this._scheduledRemove.push(b);
		} else {
			var idx = this.children.indexOf(b);
			if (idx > 0) {
				var _b = this.children.splice(idx, 1);
				_b[0].parent = null;
				// for the rest of the children, mark them as dirty and reduce the baseBufferIndex
				for (var i=idx; i < this.totalChildren; i++) {
					_b = this.children[i];
					_b.baseBufferIndex = i;
					_b.isTransformDirty = true;
					_b.isColorDirty = true;
				}
			}
			this.isChildDirty = true;
		}
		return this;
	};

	/**
	 * when the block list changes, the indices array must be recreated
	 * @param {number} startIdx
	 * @param {number=} total
	 */
	BlockGroup.prototype.recreateIndices = function (startIdx, total) {
		var lastIdx = (this.indexBufferData[startIdx*6 - 1] || -1) + 1;
		total = total || Math.max(this.children.length, 1);
		for (var i = startIdx; i < total; i ++) {
			var idx = i*6;
			this.indexBufferData[idx + 0] = lastIdx    ; this.indexBufferData[idx + 1] = lastIdx + 1; this.indexBufferData[idx + 2] = lastIdx + 2;
			this.indexBufferData[idx + 3] = lastIdx + 2; this.indexBufferData[idx + 4] = lastIdx + 1; this.indexBufferData[idx + 5] = lastIdx + 3;
			lastIdx += 4;
		}
		var gl = core.gl;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferData, gl.STATIC_DRAW);
	};

	/**
	 * where the fun begins
	 * @ignore
	 */
	BlockGroup.prototype.visit = function () {
		this._inVisit = true;
		if (this.update) {
			this.update(core.delta);
		}
		if (!this.visible) {
			this._inVisit = false;
			return;
		}
		this.transform();

		// this should be more like cocos2d: preserve the z-ordering
		var children = this.children;
		var len = children.length;
		for (var i=0; i < len; i++) {
			children[i].visit();
		}

		// re-bind the glBuffer (might have changed in the children visit)
		var gl = core.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);

		if (this.isChildDirty) {
			this.recreateIndices(0);
			this.isChildDirty = false;
		}
		// render this block group
		this.render();

		// reset our dirty markers
		this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false;
		this._inVisit = false;

		var b;
		while ((b = this._scheduledRemove.shift())) {
			if (b === "all") {
				this.removeAll();
			} else {
				this.remove(b);
			}
		}
	};

	/**
	 * actually render the block group
	 * @param {number=} totalChildren Optional. The number of children to render
	 * @ignore
	 */
	BlockGroup.prototype.render = function (totalChildren) {
		var gl = core.gl;

		// select current shader
		var program = core.selectProgram(Block.PROGRAM_NAME[this.program]);
		totalChildren = totalChildren || this.children.length;
		var texOff = 3 * 4,
			colorOff = texOff + 2 * 4,
			stride = Block.VERT_SIZE;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);

		gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
		if (this.program == Block.PROGRAM.DEFAULT) {
			// no extra attributes for the shader
		} else if (this.program == Block.PROGRAM.TEXTURE) {
			var texture = core.getAsset('texture', this.texture);

			// pass the texture attributes
			gl.vertexAttribPointer(program.attribs['textureCoordAttribute'], 2, gl.FLOAT, false, stride, texOff);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture.tex);
			gl.uniform1i(program.samplerUniform, 0);
		}
		gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, colorOff);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

		// set the matrix uniform (the multiplied model view projection matrix)
		var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
		if (transformDirty) {
			glmatrix.mat4.multiply(this.mvpMatrix, core.pMatrix, this.mvMatrix);
		}
		gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
		gl.drawElements(gl.TRIANGLES, totalChildren * 6, gl.UNSIGNED_SHORT, 0);
	};

	BlockGroup.setup = function BlockGroup_setup(c) {
		core = c;
	};

	return BlockGroup;
});

