/*
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

goog.provide("chesterGL.BlockGroup");

goog.require("goog.vec.Mat4");
goog.require("chesterGL.Block");

/**
 * creates a new block group
 * 
 * @constructor
 * @param {(string|null)=} texture An optional texture that will be shared with all children
 * @param {number=} noChildren The optional initial number of maxChidlren. Defaults to 10
 * @extends {chesterGL.Block}
 */
chesterGL.BlockGroup = function (texture, noChildren) {
	if (!chesterGL.webglMode) {
		throw "BlockGroup only works on WebGL mode";
	}
	// call "super"
	chesterGL.Block.call(this, null, chesterGL.Block.TYPE['BLOCKGROUP']);
	if (texture) {
		this.texture = texture;
		this.program = chesterGL.Block.PROGRAM['TEXTURE'];
	} else {
		this.program = chesterGL.Block.PROGRAM['DEFAULT'];
	}
	this.maxChildren = noChildren || 10;
	
	// create the buffers for the children
	this.createBuffers();
};
goog.inherits(chesterGL.BlockGroup, chesterGL.Block);

/**
 * The max number of children this blockgroup can hold (this is here for the buffer data)
 * @type {number}
 * @ignore
 */
chesterGL.BlockGroup.prototype.maxChildren = 0;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.BlockGroup.prototype.isChildDirty = false;
		
/**
 * @type {?WebGLBuffer}
 * @ignore
 */
chesterGL.BlockGroup.prototype.indexBuffer = null;

/**
 * @type {?Uint16Array}
 * @ignore
 */
chesterGL.BlockGroup.prototype.indexBufferData = null;

/**
 * Creates the buffers for the current maxChildren size
 * @param {Array|Float32Array=} oldBufferData
 * @param {Array|Uint16Array=} oldIndexData
 * @ignore
 */
chesterGL.BlockGroup.prototype.createBuffers = function (oldBufferData, oldIndexData) {
	var gl = chesterGL.gl;
	if (!this.glBuffer)
		this.glBuffer = gl.createBuffer();
	if (!this.indexBuffer)
		this.indexBuffer = gl.createBuffer();

	var glBufferData    = new Float32Array(chesterGL.Block.QUAD_SIZE * this.maxChildren);
	var indexBufferData = new Uint16Array(6 * this.maxChildren);
	if (oldBufferData) {
		glBufferData.set(oldBufferData);
	}
	if (oldIndexData) {
		indexBufferData.set(oldIndexData);
	}
	this.glBufferData = glBufferData;
	this.indexBufferData = indexBufferData;
};

/**
 * creates a block that can be added to this block group
 * @param {goog.vec.Vec4.Type} rect
 */
chesterGL.BlockGroup.prototype.createBlock = function (rect) {
	var b = new chesterGL.Block(rect, chesterGL.Block.TYPE['STANDALONE'], this);
	if (this.texture) {
		b.setTexture(this.texture);
	}
	return b;
};

/**
 * adds a child
 * @param {chesterGL.Block} block
 */
chesterGL.BlockGroup.prototype.addChild = function (block) {
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
};

/**
 * removes a block from the group
 * @param {chesterGL.Block} b
 */
chesterGL.BlockGroup.prototype.removeChild = function (b) {
	if (b.parent != this) {
		throw "Invalid child";
	}
	if (this._inVisit) {
		this._scheduledRemove.push(b);
	} else {
		var idx = this.children.indexOf(b);
		if (idx > 0) {
			this.children.splice(idx, 1);
			// for the rest of the children, mark them as dirty and reduce the baseBufferIndex
			for (var i=idx; i < this.totalChildren; i++) {
				var _b = this.children[i];
				_b.baseBufferIndex = i;
				_b.isTransformDirty = true;
				_b.isColorDirty = true;
			}
		}
		this.isChildDirty = true;
	}
};

/**
 * when the block list changes, the indices array must be recreated
 * @param {number} startIdx
 */
chesterGL.BlockGroup.prototype.recreateIndices = function (startIdx) {
	var lastIdx = (this.indexBufferData[startIdx*6 - 1] || -1) + 1;
	var total = Math.max(this.children.length, 1);
	for (var i = startIdx; i < total; i ++) {
		var idx = i*6;
		this.indexBufferData[idx + 0] = lastIdx    ; this.indexBufferData[idx + 1] = lastIdx + 1; this.indexBufferData[idx + 2] = lastIdx + 2;
		this.indexBufferData[idx + 3] = lastIdx + 2; this.indexBufferData[idx + 4] = lastIdx + 1; this.indexBufferData[idx + 5] = lastIdx + 3;
		lastIdx += 4;
	}
	var gl = chesterGL.gl;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferData, gl.STATIC_DRAW);
};

/**
 * where the fun begins
 * @ignore
 */
chesterGL.BlockGroup.prototype.visit = function () {
	this._inVisit = true;
	if (this.update) {
		this.update(chesterGL.delta);
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
	var gl = chesterGL.gl;
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
	while (b = this._scheduledRemove.shift()) {
		this.removeChild(b);
	}
};

/**
 * actually render the block group
 * @ignore
 */
chesterGL.BlockGroup.prototype.render = function () {
	var gl = chesterGL.gl;
	
	// select current shader
	var program = chesterGL.selectProgram(chesterGL.Block.PROGRAM_NAME[this.program]);
	var totalChildren = this.children.length;
	var texOff = 3 * 4,
		colorOff = texOff + 2 * 4,
		stride = chesterGL.Block.QUAD_SIZE;
	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
	
	gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
	if (this.program == chesterGL.Block.PROGRAM['DEFAULT']) {
		// no extra attributes for the shader
	} else if (this.program == chesterGL.Block.PROGRAM['TEXTURE']) {
		var texture = chesterGL.getAsset('texture', this.texture);
		
		// pass the texture attributes
		gl.vertexAttribPointer(program.attribs['textureCoordAttribute'], 2, gl.FLOAT, false, stride, texOff);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture.tex);
		gl.uniform1i(program.samplerUniform, 0);
	}
	gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, colorOff);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	
	// set the matrix uniform (the multiplied model view projection matrix)
	goog.vec.Mat4.multMat(chesterGL.pMatrix, this.mvMatrix, this.mvpMatrix);
	gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
	// gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4 * this.children.length);
	gl.drawElements(gl.TRIANGLES, totalChildren * 6, gl.UNSIGNED_SHORT, 0);
};

// export the symbol
goog.exportSymbol('chesterGL.BlockGroup', chesterGL.BlockGroup);
// instance methods
goog.exportProperty(chesterGL.BlockGroup.prototype, 'createBlock', chesterGL.BlockGroup.prototype.createBlock);
goog.exportProperty(chesterGL.BlockGroup.prototype, 'addChild', chesterGL.BlockGroup.prototype.addChild);
goog.exportProperty(chesterGL.BlockGroup.prototype, 'removeChild', chesterGL.BlockGroup.prototype.removeChild);
