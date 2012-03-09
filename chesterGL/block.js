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

goog.provide("chesterGL.Block");

goog.require("goog.math.Vec2");
goog.require("goog.math.Size");
goog.require("chesterGL.core");

/**
 * creates a new block. Pass the rect if you want to set the frame at
 * creation time.
 * 
 * @constructor
 * @param {Object.<string,number>|string=} rect
 * @param {number=} type
 * @param {chesterGL.Block=} parent
 */
chesterGL.Block = function (rect, type, parent) {
	this.type = type || chesterGL.Block.TYPE['STANDALONE'];
	if (parent) {
		this.parent = parent;
	}

	this.children = [];
	this.program = chesterGL.Block.PROGRAM['DEFAULT'];

	if (rect) {
		if (typeof(rect) === 'string') {
			/** @type {chesterGL.Block.frameType} */ var f = chesterGL.BlockFrames.getFrame(rect);
			this.setTexture(f.texture);
			this.setFrame(f.frame);
		} else {
			this.setFrame(rect);
		}
	}
	// set default color
	if (this.type == chesterGL.Block.TYPE['STANDALONE']) {
		this.setColor([1, 1, 1, 1]);
	}

	if (chesterGL.webglMode && this.type == chesterGL.Block.TYPE['STANDALONE'] && (!parent || parent.type != chesterGL.Block.TYPE['BLOCKGROUP'])) {
		var gl = chesterGL.gl;
		// just a single buffer for all data (a 4x"quad")
		this.glBuffer = gl.createBuffer();
		this.glBufferData = new Float32Array(chesterGL.Block.BUFFER_SIZE);
	}

	// always create the mvMatrix
	this.mvMatrix = mat4.create();
	this.mvpMatrix = mat4.create();
	mat4.identity(this.mvMatrix);

	// create the remove/add lists
	this._scheduledAdd = [];
	this._scheduledRemove = [];
};

/**
 * @typedef {Object.<string,Object>}
 */
chesterGL.Block.frameType;

/**
 * what gl program to use
 * @enum {number}
 */
chesterGL.Block.PROGRAM = {
	'DEFAULT': 0,
	'TEXTURE': 1
};

/**
 * program names
 * @const
 * @type {Array.<string>}
 */
chesterGL.Block.PROGRAM_NAME = [
	"default",
	"texture"
];

/**
 * Different types of blocks
 * @enum {number}
 */
chesterGL.Block.TYPE = {
	'STANDALONE': 0,
	'BLOCKGROUP': 1,
	'SCENE':      2,
	'TMXBLOCK':   3,
	'PARTICLE':   4,
	'PRIMITIVE':  5
};

/**
 * This is the size of one quad, the buffer data length (in bytes) will be 4 * QUAD_SIZE
 * 12 (verts, 3 floats) + 8 (tex coords, 2 floats) + 16 (color, 4 floats)
 * @const
 * @type {number}
 */
chesterGL.Block.QUAD_SIZE = 36;

/**
 * This is how many items the buffer data must have.
 * 3 (vert) + 2 (tex) + 4 (color) = 9; 9 * 4 (verts) = 36
 * @const
 * @type {number}
 */
chesterGL.Block.BUFFER_SIZE = 36;

/**
 * @const
 * @type {number}
 */
chesterGL.Block.DEG_TO_RAD = Math.PI / 180.0;

/**
 * @const
 * @type {number}
 */
chesterGL.Block.RAD_TO_DEG = 180.0 / Math.PI;

/**
 * the full frame
 * 
 * @const
 * @type {quat4}
 */
chesterGL.Block.FullFrame = quat4.create([0.0, 0.0, 1.0, 1.0]);

/**
 * the size zero constant
 * 
 * @const
 * @type {goog.math.Vec2}
 */
chesterGL.Block.SizeZero = new goog.math.Vec2(0.0, 0.0);

/**
 * @type {string}
 */
chesterGL.Block.prototype.title = "";

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.Block.prototype.debugNodeAdded = false;

/**
 * @type {?mat4}
 */
chesterGL.Block.prototype.mvMatrix = null;

/**
 * @type {?mat4}
 */
chesterGL.Block.prototype.mvpMatrix = null;

/**
 * @type {boolean}
 */
chesterGL.Block.prototype.visible = true;

/**
 * did the position, scale or rotation change?
 *
 * @type {boolean}
 */
chesterGL.Block.prototype.isTransformDirty = false;

/**
 * @type {boolean}
 */
chesterGL.Block.prototype.isColorDirty = false;

/**
 * @type {boolean}
 */
chesterGL.Block.prototype.isFrameDirty = false;

/**
 * @type {number}
 */
chesterGL.Block.prototype.baseBufferIndex = 0;

/**
 * @type {?WebGLBuffer}
 */
chesterGL.Block.prototype.glBuffer = null;

/**
 * @type {Float32Array}
 */
chesterGL.Block.prototype.glBufferData = null;

/**
 * @type {vec3}
 */
chesterGL.Block.prototype.position = vec3.create();

/**
 * @type {?goog.math.Size}
 */
chesterGL.Block.prototype.contentSize = null;

/**
 * @type {quat4}
 */
chesterGL.Block.prototype.color = quat4.create([1.0, 1.0, 1.0, 1.0]);

/**
 * @type {?string}
 */
chesterGL.Block.prototype.texture = null;

/**
 * @type {number}
 */
chesterGL.Block.prototype.opacity = 1.0;

/**
 * rotation of the box - in radians
 * @type {number}
 */
chesterGL.Block.prototype.rotation = 0;

/**
 * the scale of the box
 * @type {number}
 */
chesterGL.Block.prototype.scale = 1.0;

/**
 * update function
 * @type {?function(number)}
 */
chesterGL.Block.prototype.update = null;

/**
 * the texture frame
 * @type {?quat4}
 */
chesterGL.Block.prototype.frame = null;

/**
 * the block group this block belongs to
 * @type {?chesterGL.Block}
 */
chesterGL.Block.prototype.parent = null;

/**
 * the array to hold children blocks
 * @type {?Array.<chesterGL.Block>}
 */
chesterGL.Block.prototype.children = null;

/**
 * The scheduled list of blocks to add/remove after a visit
 * @ignore
 * @type {?Array.<chesterGL.Block>}
 */
chesterGL.Block.prototype._scheduledAdd = null;

/**
 * @ignore
 * @type {?Array.<chesterGL.Block>}
 */
chesterGL.Block.prototype._scheduledRemove = null;

/**
 * Are we visiting this node?
 * @ignore
 * @type {boolean}
 */
chesterGL.Block.prototype._inVisit = false;

/**
 * @ignore
 */
chesterGL.Block.prototype.addDebugNode = function () {
	if (this.program == chesterGL.Block.PROGRAM['TEXTURE']) {
		var dbg = new chesterGL.PrimitiveBlock(1, 1);
		this.addChild(dbg);
		dbg.setUpdate(function () {
			var sz = this.parent.contentSize;
			var w = sz.width / 2, h = sz.height / 2;
			var poly = [[-w, -h, 0], [-w, h, 0], [w, h, 0], [w, -h, 0]];
			this.drawPolygon(poly, [1, 1, 1, 1], true);
		});
	}
	this.debugNodeAdded = true;
};

/**
 * sets the frame for this block
 * 
 * @param {quat4} newFrame
 */
chesterGL.Block.prototype.setFrame = function (newFrame) {
	if (typeof newFrame === "string") {
		// just get the cached frame
		newFrame = chesterGL.BlockFrames.getFrame(/** @type {string} */(newFrame)).frame;
	}
	this.frame = quat4.create(newFrame);
	this.setContentSize(newFrame[2], newFrame[3]);
	this.isFrameDirty = true;
}

/**
 * sets the size of the block in pixels
 * 
 * @param {number} width
 * @param {number} height
 * @example
 * // sets the content size to 128 x 128px
 * block.setContentSize(128, 128);
 */
chesterGL.Block.prototype.setContentSize = function (width, height) {
	this.contentSize = new goog.math.Size(width, height);
	this.isFrameDirty = true;
};

/**
 * sets the scale of the block
 * 
 * @param {number} newScale
 */
chesterGL.Block.prototype.setScale = function (newScale) {
	this.scale = newScale;
	this.isTransformDirty = true;			
};

/**
 * sets the color of the block
 * the quat4 should be created in the order RGBA
 * 
 * @param {quat4} color
 */
chesterGL.Block.prototype.setColor = function (color) {
	this.color = quat4.create(color);
	this.isColorDirty = true;
};

chesterGL.Block.prototype.setPosition = function (p) {
	this.position = vec3.create(p);
	this.isTransformDirty = true;
};

/**
 * sets the texture of the block - the texture will be loaded if needed
 * @param {string} texturePath
 */
chesterGL.Block.prototype.setTexture = function (texturePath) {
	this.texture = texturePath;
	// force program to texture program
	this.program = chesterGL.Block.PROGRAM['TEXTURE'];
	if (chesterGL.debugSprite) { this.addDebugNode(); }
	var block = this;
	chesterGL.loadAsset("texture", texturePath, function (t) {
		// set the default frame for all our blocks (if it's not set)
		if (!block.contentSize) {
			block.setContentSize(t.width, t.height);
		}
		if (!block.frame) {
			block.setFrame([0, 0, t.width, t.height]);
		}
	});
};

/**
 * sets the rotation of the block to a specific angle
 * @param {number} angle specified in radians, CW
 */
chesterGL.Block.prototype.setRotation = function (angle) {
	this.rotation = angle;
	this.isTransformDirty = true;
};

/**
 * sets the update function - to be called every frame for this block
 * @param {function (?number)} callback
 */
chesterGL.Block.prototype.setUpdate = function (callback) {
	this.update = callback;
};

/**
 * Adds a block as a child. If you add the block while in a visit of the parent block,
 * the child will be scheduled to be added after the visit.
 * 
 * @param {chesterGL.Block} block
 */
chesterGL.Block.prototype.addChild = function (block) {
	if (block.parent) {
		throw "can't add a block twice!";
	}
	if (this._inVisit) {
		this._scheduledAdd.push(block);
	} else {
		this.children.push(block);
		block.parent = this;
	}
};

/**
 * removes a block from the children list. If you remove the child while in a visit of the parent block,
 * the child will be scheduled to be removed after the visit.
 * 
 * @param {chesterGL.Block} block
 */
chesterGL.Block.prototype.removeChild = function (block) {
	if (!block.parent || block.parent != this) {
		throw "not our child!";
	}
	if (this._inVisit) {
		this._scheduledRemove.push(block);
	} else {
		var idx = this.children.indexOf(block);
		if (idx >= 0) {
			this.children.splice(idx,1);
		}
	}
}

/**
 * actually performs the transformation
 */
chesterGL.Block.prototype.transform = function () {
	var gl = chesterGL.gl;
	var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
	if (transformDirty) {
		mat4.identity(this.mvMatrix);
		mat4.translate(this.mvMatrix, this.position);
		mat4.rotate(this.mvMatrix, this.rotation * (chesterGL.webglMode ? -1 : 1), [0, 0, 1]);
		mat4.scale(this.mvMatrix, [this.scale, this.scale, 1]);
		// concat with parent's transform
		var ptransform = (this.parent ? this.parent.mvMatrix : null);
		if (ptransform) {
			mat4.multiply(ptransform, this.mvMatrix, this.mvMatrix);
		}
	}

	// bail out if we're a block group or a primitive block
	if (this.type == chesterGL.Block.TYPE['BLOCKGROUP'] || this.type == chesterGL.Block.TYPE['PRIMITIVE']) {
		return;
	}

	var bufferData = this.glBufferData;
	var inBlockGroup = this.parent && this.parent.type == chesterGL.Block.TYPE['BLOCKGROUP'];

	if (chesterGL.webglMode) {
		if (!inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
		}
		if (this.isFrameDirty || (inBlockGroup && this.isTransformDirty)) {
			// NOTE
			// the tex coords and the frame coords need to match. Otherwise you get a distorted image
			var offset = 9;
			var hw = this.contentSize.width * 0.5, hh = this.contentSize.height * 0.5;
			var _idx = this.baseBufferIndex * chesterGL.Block.BUFFER_SIZE;
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

				bufferData[_idx           ] =  bl[0]; bufferData[_idx + 1           ] =  bl[1]; bufferData[_idx + 2           ] = z;
				bufferData[_idx +   offset] =  tl[0]; bufferData[_idx + 1 +   offset] =  tl[1]; bufferData[_idx + 2 +   offset] = z;
				bufferData[_idx + 2*offset] =  br[0]; bufferData[_idx + 1 + 2*offset] =  br[1]; bufferData[_idx + 2 + 2*offset] = z;
				bufferData[_idx + 3*offset] =  tr[0]; bufferData[_idx + 1 + 3*offset] =  tr[1]; bufferData[_idx + 2 + 3*offset] = z;
			} else {
				bufferData[_idx           ] = -hw; bufferData[_idx + 1           ] = -hh; bufferData[_idx + 2           ] = 0;
				bufferData[_idx +   offset] = -hw; bufferData[_idx + 1 +   offset] =  hh; bufferData[_idx + 2 +   offset] = 0;
				bufferData[_idx + 2*offset] =  hw; bufferData[_idx + 1 + 2*offset] = -hh; bufferData[_idx + 2 + 2*offset] = 0;
				bufferData[_idx + 3*offset] =  hw; bufferData[_idx + 1 + 3*offset] =  hh; bufferData[_idx + 2 + 3*offset] = 0;
			}

			if (this.program == chesterGL.Block.PROGRAM['TEXTURE']) {
				var tex = chesterGL.getAsset("texture", this.texture);
				var texW = tex.width,
					texH = tex.height;
				var l = this.frame[0] / texW,
					b = this.frame[1] / texH,
					w = this.frame[2] / texW,
					h = this.frame[3] / texH;
				_idx += 3;
				bufferData[_idx           ] = l  ; bufferData[_idx+1           ] = b;
				bufferData[_idx +   offset] = l  ; bufferData[_idx+1 +   offset] = b+h;
				bufferData[_idx + 2*offset] = l+w; bufferData[_idx+1 + 2*offset] = b;
				bufferData[_idx + 3*offset] = l+w; bufferData[_idx+1 + 3*offset] = b+h;
			}
		}
		if (this.isColorDirty) {
			_idx = 5 + this.baseBufferIndex * chesterGL.Block.BUFFER_SIZE;
			var color = this.color;
			var opacity = this.opacity;
			for (var i=0; i < 4; i++) {
				bufferData[_idx     + offset*i] = color[0] * opacity;
				bufferData[_idx + 1 + offset*i] = color[1] * opacity;
				bufferData[_idx + 2 + offset*i] = color[2] * opacity;
				bufferData[_idx + 3 + offset*i] = color[3] * opacity;
			}
		}
		if (chesterGL.webglMode && !inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
			gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
		}
	}
}

/**
 * prepares the block for the rendering (transforms if necessary)
 */
chesterGL.Block.prototype.visit = function () {
	this._inVisit = true;
	if (this.update) {
		this.update(chesterGL.delta);
	}
	if (!this.visible) {
		this._inVisit = false;
		return;
	}
	this.transform();

	var children = this.children;
	var len = children.length;
	for (var i=0; i < len; i++) {
		children[i].visit();
	}

	// render this block if not in a block group
	if (!this.parent || this.parent.type != chesterGL.Block.TYPE['BLOCKGROUP']) {
		this.render();
	}
	// reset our dirty markers
	this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false;
	this._inVisit = false;

	// do we have blocks scheduled to be removed/added?
	var b;
	while (b = this._scheduledAdd.shift()) {
		this.addChild(b);
	}
	while (b = this._scheduledRemove.shift()) {
		this.removeChild(b);
	}
}

/**
 * render (only will work for non-blockgroup blocks)
 */
chesterGL.Block.prototype.render = function () {
	if (this.type == chesterGL.Block.TYPE['BLOCKGROUP']) {
		throw "Cannot call render on a BlockGroup block!";
	}
	// dummy render for scene blocks
	if (this.type == chesterGL.Block.TYPE['SCENE']) {
		return;
	}

	if (chesterGL.webglMode) {
		var gl = chesterGL.gl;
		// select current shader
		var program = chesterGL.selectProgram(chesterGL.Block.PROGRAM_NAME[this.program]);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
		var texOff = 3 * 4,
			colorOff = texOff + 2 * 4,
			stride = chesterGL.Block.QUAD_SIZE;

		gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
		gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, colorOff);

		if (this.program == chesterGL.Block.PROGRAM['DEFAULT']) {
			// no extra attributes for the shader
		} else if (this.program == chesterGL.Block.PROGRAM['TEXTURE']) {
			var texture = chesterGL.getAsset('texture', this.texture);

			// pass the texture attributes
			gl.vertexAttribPointer(program.attribs['textureCoordAttribute'], 2, gl.FLOAT, false, stride, texOff);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture.tex);
			gl.uniform1i(program.samplerUniform, 0);
			gl.activatedTexture = true;
		}

		// set the matrix uniform (the multiplied model view projection matrix)
		var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
		if (transformDirty) {
			mat4.multiply(chesterGL.pMatrix, this.mvMatrix, this.mvpMatrix);
		}
		gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	} else {
		var gl = chesterGL.offContext;
		// canvas drawing api - we only draw textures
		if (this.program == chesterGL.Block.PROGRAM.TEXTURE) {
			var m = this.mvMatrix;
			var texture = chesterGL.getAsset('texture', this.texture);
			gl.globalAlpha = this.opacity;
			gl.setTransform(m[0], m[1], m[4], m[5], m[12], gl.viewportHeight - m[13]);
			var w = this.contentSize.width, h = this.contentSize.height;
			var frame = this.frame;
			gl.drawImage(texture, frame[0], texture.height - (frame[1] + h), frame[2], frame[3], -w/2, -h/2, w, h);
		}
	}
}

// export symbols
goog.exportSymbol('chesterGL.Block', chesterGL.Block);
// constants / enums
goog.exportSymbol('chesterGL.Block.FullFrame', chesterGL.Block.FullFrame);
goog.exportSymbol('chesterGL.Block.SizeZero', chesterGL.Block.SizeZero);
goog.exportSymbol('chesterGL.Block.TYPE', chesterGL.Block.TYPE);
goog.exportSymbol('chesterGL.Block.PROGRAM', chesterGL.Block.PROGRAM);
goog.exportSymbol('chesterGL.Block.PROGRAM_NAME', chesterGL.Block.PROGRAM_NAME);
// properties
goog.exportProperty(chesterGL.Block.prototype, 'title', chesterGL.Block.prototype.title);
// instance methods
goog.exportProperty(chesterGL.Block.prototype, 'addChild', chesterGL.Block.prototype.addChild);	
goog.exportProperty(chesterGL.Block.prototype, 'removeChild', chesterGL.Block.prototype.removeChild);
goog.exportProperty(chesterGL.Block.prototype, 'setPosition', chesterGL.Block.prototype.setPosition);
goog.exportProperty(chesterGL.Block.prototype, 'setRotation', chesterGL.Block.prototype.setRotation);
goog.exportProperty(chesterGL.Block.prototype, 'setColor', chesterGL.Block.prototype.setColor);
goog.exportProperty(chesterGL.Block.prototype, 'setFrame', chesterGL.Block.prototype.setFrame);
goog.exportProperty(chesterGL.Block.prototype, 'setContentSize', chesterGL.Block.prototype.setContentSize);
goog.exportProperty(chesterGL.Block.prototype, 'setTexture', chesterGL.Block.prototype.setTexture);
goog.exportProperty(chesterGL.Block.prototype, 'setScale', chesterGL.Block.prototype.setScale);
goog.exportProperty(chesterGL.Block.prototype, 'setUpdate', chesterGL.Block.prototype.setUpdate);
