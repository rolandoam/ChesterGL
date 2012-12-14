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

goog.provide("chesterGL.Block");

goog.require("goog.vec.Mat4");
goog.require("goog.math.Size");
goog.require("chesterGL.core");

/**
 * creates a new block. Pass the rect if you want to set the frame at
 * creation time.
 *
 * @constructor
 * @param {goog.vec.Vec4.Vec4Like|string=} rect
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

	// set default color and content size
	this.setContentSize(0, 0);
	if (this.type == chesterGL.Block.TYPE['STANDALONE']) {
		this.setColor([1, 1, 1, 1]);
	}
	if (rect) {
		if (typeof rect === "string" && chesterGL.hasAsset("texture", rect)) {
			this.setTexture(rect);
		} else {
			this.setFrame(rect);
		}
	}
	this.setPosition(0, 0, 0);
	// default anchor point
	this.setAnchorPoint(0.5, 0.5);

	if (chesterGL.webglMode && (!parent || parent.type != chesterGL.Block.TYPE['BLOCKGROUP'])) {
		var gl = chesterGL.gl;
		// just a single buffer for all data (a "quad")
		this.glBuffer = gl.createBuffer();
		this.glBufferData = new Float32Array(chesterGL.Block.BUFFER_SIZE);
	}

	// always create the mvMatrix
	this.mvMatrix = goog.vec.Mat4.createFloat32();
	this.mvpMatrix = goog.vec.Mat4.createFloat32();
	this.mvMatrix = /** @type {Float32Array} */(goog.vec.Mat4.makeIdentity(goog.vec.Mat4.createFloat32()));

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
 * This is the size of one "interleaved" vertex, in bytes
 * 3 (position) + 2 (tex coord) + 4 (color) = 9 floats = 36 bytes
 * @const
 * @type {number}
 * @ignore
 */
chesterGL.Block.VERT_SIZE = 36;

/**
 * This is how many items the buffer data must have.
 * 3 (vert) + 2 (tex) + 4 (color) = 9; 9 * 4 (verts) = 36
 * @const
 * @type {number}
 * @ignore
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
 * One degree in radians
 * @const
 * @type {number}
 */
chesterGL.Block.ONE_DEG = 1 * chesterGL.Block.DEG_TO_RAD;

/**
 * the full frame
 *
 * @const
 * @type {goog.vec.Vec4.Type}
 */
chesterGL.Block.FullFrame = goog.vec.Vec4.createFloat32FromValues(0.0, 0.0, 1.0, 1.0);

/**
 * the size zero constant
 *
 * @const
 * @type {goog.math.Size}
 */
chesterGL.Block.SizeZero = new goog.math.Size(0.0, 0.0);

/**
 * Sets the title of this block, only used in the scenes right now (for analytics)
 * @type {string}
 */
chesterGL.Block.prototype.title = "";

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.Block.prototype.debugNodeAdded = false;

/**
 * @type {?goog.vec.Mat4.Type}
 * @ignore
 */
chesterGL.Block.prototype.mvMatrix = null;

/**
 * @type {?goog.vec.Mat4.Type}
 * @ignore
 */
chesterGL.Block.prototype.mvpMatrix = null;

/**
 * Sets whether or not the block is visible
 * @type {boolean}
 */
chesterGL.Block.prototype.visible = true;

/**
 * True if the node/scene is running
 * @type {boolean}
 */
chesterGL.Block.prototype.isRunning = false;

/**
 * did the position, scale or rotation change?
 * @type {boolean}
 * @ignore
 */
chesterGL.Block.prototype.isTransformDirty = false;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.Block.prototype.isColorDirty = false;

/**
 * @type {boolean}
 * @ignore
 */
chesterGL.Block.prototype.isFrameDirty = false;

/**
 * @type {number}
 * @ignore
 */
chesterGL.Block.prototype.baseBufferIndex = 0;

/**
 * @type {?WebGLBuffer}
 * @ignore
 */
chesterGL.Block.prototype.glBuffer = null;

/**
 * @type {Float32Array}
 * @ignore
 */
chesterGL.Block.prototype.glBufferData = null;

/**
 * the position of the anchor point of the block. Use the setter to modify this property
 * @type {goog.vec.Vec3.Type}
 */
chesterGL.Block.prototype.position = null;

/**
 * the anchor point for the block. Use the setter to modify this property
 * @type {goog.math.Vec2}
 */
chesterGL.Block.prototype.anchorPoint = null;

/**
 * the content size of the block. Use the setter to modify this property
 * @type {?goog.math.Size}
 */
chesterGL.Block.prototype.contentSize = null;

/**
 * the color of the block. Use the setter to modify this property
 * @type {goog.vec.Vec4.Type}
 */
chesterGL.Block.prototype.color = null;

/**
 * The name of the texture associated with this block. Use the setter to modify this property
 * @type {?string}
 */
chesterGL.Block.prototype.texture = null;

/**
 * rotation of the box - in radians. Use the setter to modify this property
 * @type {number}
 */
chesterGL.Block.prototype.rotation = 0;

/**
 * the scale in the X axis of the box. Use the setter to modify this property
 * @type {number}
 */
chesterGL.Block.prototype.scaleX = 1.0;

/**
 * the scale in the Y axis of the box. Use the setter to modify this property
 * @type {number}
 */
chesterGL.Block.prototype.scaleY = 1.0;

/**
 * update function - called every frame with the delta in milliseconds since last frame
 * @type {?function(number)}
 */
chesterGL.Block.prototype.update = null;

/**
 * the texture frame. Use the setter to modify this property
 * @type {?goog.vec.Vec4.Type}
 */
chesterGL.Block.prototype.frame = null;

/**
 * the block group this block belongs to. Read only
 * @type {?chesterGL.Block}
 */
chesterGL.Block.prototype.parent = null;

/**
 * the array to hold children blocks. Read only, to modify use append or remove
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
	if (this.contentSize.width > 0) {
		var dbg = new chesterGL.PrimitiveBlock(1, 1);
		this.append(dbg);
		dbg.isInAtlas = (this.parent.type == chesterGL.Block.TYPE['BLOCKGROUP']) ? 1 : 0;
		dbg.setUpdate(function () {
			var sz = this.parent.contentSize;
			var w = sz.width / 2, h = sz.height / 2;
			var poly = [[-w, -h, 0], [-w, h, 0], [w, h, 0], [w, -h, 0]];
			if (this.isInAtlas) {
				this.drawPolygon(poly, [1, 0, 0, 1], true);
			} else {
				this.drawPolygon(poly, [1, 1, 1, 1], true);
			}
		});
	}
	this.debugNodeAdded = true;
};

/**
 * executed when the node/scene is activated for the first time
 * or when adding a new child to a running scene.
 */
chesterGL.Block.prototype.onEnterScene = function () {
	this.isRunning = true;
	for (var i in this.children) {
		this.children[i]['onEnterScene']();
	}
};

/**
 * executed when the node/scene is removed
 */
chesterGL.Block.prototype.onExitScene = function () {
	this.isRunning = false;
	for (var i in this.children) {
		this.children[i]['onExitScene']();
	}
};

/**
 * sets the frame for this block
 *
 * @param {goog.vec.Vec3.Vec3Like|string} newFrame
 * @param {boolean=} isHighDPI
 */
chesterGL.Block.prototype.setFrame = function (newFrame, isHighDPI) {
	if (typeof newFrame === "string") {
		// just get the cached frame
		var tmpFrame = chesterGL.BlockFrames.getFrame(newFrame);
		if (!tmpFrame) {
			throw "Invalid frame name: " + newFrame;
		}
		newFrame = tmpFrame.frame;
		// this will, in turn, call setFrame again
		this.setTexture(tmpFrame.texture, newFrame);
	} else {
		if (!this.frame) {
			this.frame = goog.vec.Vec4.createFloat32FromArray(newFrame);
		} else {
			goog.vec.Vec4.setFromArray(this.frame, newFrame);
		}
		// if on highDPI mode, and the texture is a highDPI texture, then set the content size to
		// the "real" content size.
		if (isHighDPI) {
			this.setContentSize(newFrame[2] / chesterGL.devicePixelRatio, newFrame[3] / chesterGL.devicePixelRatio);
		} else {
			this.setContentSize(newFrame[2], newFrame[3]);
		}
	}
	this.isFrameDirty = true;
};

/**
 * gets the frame for this block
 *
 * @return {Float32Array}
 */
chesterGL.Block.prototype.getFrame = function () {
	return this.frame;
};

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

chesterGL.Block.prototype.getContentSize = function () {
	return this.contentSize;
};

/**
 * sets the scale of the block
 *
 * @param {number} newScaleX
 * @param {?number} newScaleY optional: pass only newScaleX to set both
 */
chesterGL.Block.prototype.setScale = function (newScaleX, newScaleY) {
	this.scaleX = newScaleX;
	if (arguments.length == 2) {
		this.scaleY = /** @type {number} */(newScaleY);
	} else {
		this.scaleY = this.scaleX;
	}
	this.isTransformDirty = true;
};

/**
 * gets the scale of the block
 *
 * @return {number} the scaleX property
 */
chesterGL.Block.prototype.getScale = function () {
	return this.scaleX;
};

/**
 * sets the color of the block
 * the array should be created in the order RGBA
 *
 * @param {Array|Float32Array} color
 */
chesterGL.Block.prototype.setColor = function (color) {
	if (!this.color) {
		this.color = goog.vec.Vec4.createFloat32FromArray(color);
	} else {
		goog.vec.Vec4.setFromArray(this.color, color);
	}
	this.isColorDirty = true;
};

/**
 * gets the color of the block
 * @return {Float32Array} an array with the color [r, g, b, a]
 */
chesterGL.Block.prototype.getColor = function () {
	return this.color;
};

/**
 * sets the position of the block (x, y, z). It accepts an array
 * or three values (preferred in order to avoid GC)
 *
 * @param {Array|Float32Array|number} x
 * @param {number=} y
 * @param {number=} z
 */
chesterGL.Block.prototype.setPosition = function (x, y, z) {
	if (!this.position) {
		if (arguments.length == 1)
			this.position = goog.vec.Vec3.createFloat32FromArray(/** @type {Array} */(x));
		else
			this.position = goog.vec.Vec3.createFloat32FromValues(/** @type {number} */(x), /** @type {number} */(y), /** @type {number} */(z));
	} else {
		if (arguments.length == 1)
			goog.vec.Vec3.setFromArray(this.position, /** @type {Array} */(x));
		else
			goog.vec.Vec3.setFromValues(this.position, /** @type {number} */(x), /** @type {number} */(y), /** @type {number} */(z));
	}
	this.isTransformDirty = true;
};

/**
 * sets the anchor point for the block. By default it's (0.5, 0.5)
 * That means it's in the center of the block. (0,0) is the bottom left, (1,1) is the top right.
 * You can specify numbers bigger than 1 and smaller than 0 if you want.
 * @param {number} x
 * @param {number} y
 */
chesterGL.Block.prototype.setAnchorPoint = function(x, y) {
	this.anchorPoint = new goog.math.Vec2(x, y);
};

/**
 * @return {goog.math.Vec2}
 */
chesterGL.Block.prototype.getAnchorPoint = function() {
	return this.anchorPoint;
};

/**
 * gets the position of the block (x, y, z)
 * @return {Float32Array}
 */
chesterGL.Block.prototype.getPosition = function () {
	return this.position;
};

/**
 * returns the absolute position of the block, basically the position of the block applying the
 * transformations from all its parents.
 * @return {Float32Array|Array}
 */
chesterGL.Block.prototype.getAbsolutePosition = function () {
	var p = this.parent,
		pos = goog.vec.Vec3.createFloat32FromArray(this.position);
	while (p) {
		goog.vec.Mat4.multVec3(p.mvMatrix, pos, pos);
		p = p.parent;
	}
	return pos;
};

/** @ignore */
chesterGL.Block.__tmpInv = [];

/**
 * converts a global point to local coordinates
 * @param {Float32Array|Array} pt the point in local coordinates, if no dest provided, then pt will
 * be modified
 * @param {Float32Array|Array=} dest optional destination array
 * @return {Float32Array|Array}
 */
chesterGL.Block.prototype.toLocal = function (pt, dest) {
	dest = dest || pt;
	goog.vec.Mat4.invert(this.mvMatrix, chesterGL.Block.__tmpInv);
	goog.vec.Mat4.multVec3(chesterGL.Block.__tmpInv, pt, dest);
	dest[0] += this.contentSize.width * this.anchorPoint.x;
	dest[1] += this.contentSize.height * this.anchorPoint.y;
	return dest;
};

/**
 * returns the concatenated matrix from all the block's parents
 * @return {Float32Array|Array}
 */
chesterGL.Block.prototype.getAbsoluteTransform = function () {
	var m = goog.vec.Mat4.createFloat32Identity(),
		p = this.parent;
	while (p) {
		goog.vec.Mat4.multMat(p.mvMatrix, m, m);
		p = p.parent;
	}
	return m;
};

/**
 * returns the current bounding box as an Array [bottom, left, width, height]
 * @return {Array}
 */
chesterGL.Block.prototype.getBoundingBox = function () {
	var p = this.position,
		w = this.frame[2],
		h = this.frame[3];
	return [p[0] - w/2, p[1] - h/2, w, h];
};

/**
 * sets the texture of the block - the texture will be loaded if needed
 * @param {string} texturePath
 * @param {goog.vec.Vec3.Vec3Like=} frame
 */
chesterGL.Block.prototype.setTexture = function (texturePath, frame) {
	this.texture = texturePath;
	// force program to texture program
	this.program = chesterGL.Block.PROGRAM['TEXTURE'];
	chesterGL.loadAsset("texture", texturePath, null, function (t) {
		// set the default frame for all our blocks (if it's not set)
		var isHighDPI = chesterGL.highDPI && chesterGL.assets['texture'][this.texture].highDPI;
		this.setFrame(frame || [0, 0, t.width, t.height], isHighDPI);
	}.bind(this));
};

/**
 * gets the texture of the block
 * @return {string|null}
 */
chesterGL.Block.prototype.getTexture = function () {
	return this.texture;
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
 * gets the rotation of the block
 * @return {number} then current rotation angle in radians, CW
 */
chesterGL.Block.prototype.getRotation = function () {
	return this.rotation;
};

/**
 * sets the update function - to be called every frame for this block
 * @param {function (?number)} callback
 */
chesterGL.Block.prototype.setUpdate = function (callback) {
	this.update = callback;
};

/**
 * sets whether or not the block is visible
 * @param {boolean} visible
 */
chesterGL.Block.prototype.setVisible = function (visible) {
	this.visible = visible;
};

/**
 * returns whether or not the block is visible
 * @return {boolean}
 */
chesterGL.Block.prototype.isVisible = function () {
	return this.visible;
};

/**
 * Append a block as a child. If you add the block while in a visit of the parent block,
 * the child will be scheduled to be added after the visit.
 *
 * @param {...chesterGL.Block} blocks
 */
chesterGL.Block.prototype.append = function (blocks) {
	for (var i in arguments) {
		var block = arguments[i];
		if (block.parent) {
			throw "can't add a block twice!";
		}
		if (this._inVisit) {
			this._scheduledAdd.push(block);
		} else {
			this.children.push(block);
			block.parent = this;
		}
		if (this.isRunning) {
			block['onEnterScene']();
		}
	}
};

/**
 * removes a block from the children list. If you remove the child while in a visit of the parent block,
 * the child will be scheduled to be removed after the visit.
 *
 * @param {chesterGL.Block} block
 */
chesterGL.Block.prototype.remove = function (block) {
	if (!block.parent || block.parent != this) {
		throw "not our child!";
	}
	if (this._inVisit) {
		this._scheduledRemove.push(block);
	} else {
		var idx = this.children.indexOf(block);
		if (idx >= 0) {
			this.children.splice(idx,1);
			block.parent = null;
		}
	}
	if (this.isRunning) {
		block['onExitScene']();
	}
};

/**
 * detach block from parent
 */
chesterGL.Block.prototype.detach = function Block_detach() {
	if (this.parent) {
		this.parent.remove(this);
	}
};

chesterGL.Block.prototype.removeAll = function Block_removeAll() {
	if (this._inVisit) {
		this._scheduledRemove.push("all");
	} else {
		var i = 0;
		for (i=0; i < this.children.length; i++) {
			this.children[i].parent = null;
		}
		this.children.length = 0;
	}
};

// used as a replacement for tl, tr, bl, br
chesterGL.Block.__tmpBuffers = [
	new Float32Array(3),
	new Float32Array(3),
	new Float32Array(3),
	new Float32Array(3)
];
/**
 * actually performs the transformation
 * @ignore
 */
chesterGL.Block.prototype.transform = function () {
	var gl = chesterGL.gl,
		transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty)),
		_px, _py,
		inBlockGroup = this.parent && this.parent.type == chesterGL.Block.TYPE['BLOCKGROUP'];
	var anchorOffX = (this.contentSize ? (0.5 - this.anchorPoint.x) * this.contentSize.width : 0),
		anchorOffY = (this.contentSize ? (0.5 - this.anchorPoint.y) * this.contentSize.height : 0);
	if (transformDirty) {
		// flag this for our children
		this.isTransformDirty = true;
		_px = this.position[0];
		_py = this.position[1];
		goog.vec.Mat4.makeIdentity(this.mvMatrix);
		goog.vec.Mat4.translate(this.mvMatrix, _px, _py, this.position[2]);
		goog.vec.Mat4.rotate(this.mvMatrix, this.rotation * -1, 0, 0, 1);
		goog.vec.Mat4.scale(this.mvMatrix, this.scaleX, this.scaleY, 1);
		// concat with parent's transform
		var ptransform = (this.parent ? this.parent.mvMatrix : null);
		if (ptransform && !inBlockGroup) {
			goog.vec.Mat4.multMat(ptransform, this.mvMatrix, this.mvMatrix);
		}
	}

	// bail out if we're a block group or a primitive block
	if (this.type == chesterGL.Block.TYPE['BLOCKGROUP'] || this.type == chesterGL.Block.TYPE['PRIMITIVE']) {
		return;
	}

	var bufferData = this.glBufferData;

	if (chesterGL.webglMode) {
		var _idx, offset = 9;
		if (!inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
		}
		if (this.isFrameDirty || this.isTransformDirty) {
			var hw = this.contentSize.width * 0.5,
				hh = this.contentSize.height * 0.5,
				z = this.position[2];
			_idx = this.baseBufferIndex * chesterGL.Block.BUFFER_SIZE;

			if (inBlockGroup) {
				// NOTE
				// this is going to be slow :P
				// this is using the matrix to transform the vertex data
				var tr = goog.vec.Vec3.setFromValues(chesterGL.Block.__tmpBuffers[0], hw + anchorOffX,  hh + anchorOffY, z),
					tl = goog.vec.Vec3.setFromValues(chesterGL.Block.__tmpBuffers[1],-hw + anchorOffX,  hh + anchorOffY, z),
					br = goog.vec.Vec3.setFromValues(chesterGL.Block.__tmpBuffers[2], hw + anchorOffX, -hh + anchorOffY, z),
					bl = goog.vec.Vec3.setFromValues(chesterGL.Block.__tmpBuffers[3],-hw + anchorOffX, -hh + anchorOffY, z);
				goog.vec.Mat4.multVec3(this.mvMatrix, tr, tr);
				goog.vec.Mat4.multVec3(this.mvMatrix, tl, tl);
				goog.vec.Mat4.multVec3(this.mvMatrix, bl, bl);
				goog.vec.Mat4.multVec3(this.mvMatrix, br, br);

				bufferData[_idx           ] = bl[0]; bufferData[_idx + 1           ] = bl[1]; bufferData[_idx + 2           ] = z;
				bufferData[_idx +   offset] = tl[0]; bufferData[_idx + 1 +   offset] = tl[1]; bufferData[_idx + 2 +   offset] = z;
				bufferData[_idx + 2*offset] = br[0]; bufferData[_idx + 1 + 2*offset] = br[1]; bufferData[_idx + 2 + 2*offset] = z;
				bufferData[_idx + 3*offset] = tr[0]; bufferData[_idx + 1 + 3*offset] = tr[1]; bufferData[_idx + 2 + 3*offset] = z;
			} else {
				bufferData[_idx           ] = -hw + anchorOffX; bufferData[_idx + 1           ] = -hh + anchorOffY; bufferData[_idx + 2           ] = z;
				bufferData[_idx +   offset] = -hw + anchorOffX; bufferData[_idx + 1 +   offset] =  hh + anchorOffY; bufferData[_idx + 2 +   offset] = z;
				bufferData[_idx + 2*offset] =  hw + anchorOffX; bufferData[_idx + 1 + 2*offset] = -hh + anchorOffY; bufferData[_idx + 2 + 2*offset] = z;
				bufferData[_idx + 3*offset] =  hw + anchorOffX; bufferData[_idx + 1 + 3*offset] =  hh + anchorOffY; bufferData[_idx + 2 + 3*offset] = z;
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
				bufferData[_idx           ] = l  ; bufferData[_idx+1           ] = b+h; // tl
				bufferData[_idx +   offset] = l  ; bufferData[_idx+1 +   offset] = b;   // bl
				bufferData[_idx + 2*offset] = l+w; bufferData[_idx+1 + 2*offset] = b+h; // tr
				bufferData[_idx + 3*offset] = l+w; bufferData[_idx+1 + 3*offset] = b;   // br
			}
		}
		if (this.isColorDirty) {
			_idx = 5 + this.baseBufferIndex * chesterGL.Block.BUFFER_SIZE;
			var color = this.color;
			for (var i=0; i < 4; i++) {
				bufferData[_idx     + offset*i] = color[0];
				bufferData[_idx + 1 + offset*i] = color[1];
				bufferData[_idx + 2 + offset*i] = color[2];
				bufferData[_idx + 3 + offset*i] = color[3];
			}
		}
		if (chesterGL.webglMode && !inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
			gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
		}
	}
};

/**
 * prepares the block for the rendering (transforms if necessary)
 * @ignore
 */
chesterGL.Block.prototype.visit = function () {
	this._inVisit = true;
	if (chesterGL.debugSprite && !this.debugNodeAdded) { this.addDebugNode(); }
	if (this.update) {
		this.update(chesterGL.delta);
	}
	if (!this.visible) {
		this._inVisit = false;
		return;
	}
	this.transform();

	// render this block if not in a block group and if not orphan
	if (!this.parent || this.parent.type != chesterGL.Block.TYPE['BLOCKGROUP']) {
		this.render();
	}

	var children = this.children;
	var len = children.length;
	for (var i=0; i < len; i++) {
		children[i].visit();
	}

	// reset our dirty markers
	this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false;
	this._inVisit = false;

	// do we have blocks scheduled to be removed/added?
	var b;
	while ((b = this._scheduledAdd.shift())) {
		this.append(b);
	}
	while ((b = this._scheduledRemove.shift())) {
		if (b === "all") {
			this.removeAll();
		} else {
			this.remove(b);
		}
	}
};

/**
 * render (only will work for non-blockgroup blocks)
 * @ignore
 */
chesterGL.Block.prototype.render = function () {
	// dummy render for scene blocks
	if (this.type == chesterGL.Block.TYPE['SCENE']) {
		return;
	}
	var gl, texture;

	if (chesterGL.webglMode) {
		gl = chesterGL.gl;
		// select current shader
		var program = chesterGL.selectProgram(chesterGL.Block.PROGRAM_NAME[this.program]);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
		var texOff = 3 * 4,
			colorOff = texOff + 2 * 4,
			stride = chesterGL.Block.VERT_SIZE;

		gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
		gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, colorOff);

		if (this.program == chesterGL.Block.PROGRAM['DEFAULT']) {
			// no extra attributes for the shader
		} else if (this.program == chesterGL.Block.PROGRAM['TEXTURE']) {
			texture = chesterGL.getAsset('texture', this.texture);

			// pass the texture attributes
			gl.vertexAttribPointer(program.attribs['textureCoordAttribute'], 2, gl.FLOAT, false, stride, texOff);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture.tex);
			gl.uniform1i(program.samplerUniform, 0);
		}

		// set the matrix uniform (the multiplied model view projection matrix)
		var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
		if (transformDirty) {
			goog.vec.Mat4.multMat(chesterGL.pMatrix, this.mvMatrix, this.mvpMatrix);
		}
		gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	} else {
		gl = chesterGL.gl;
		// canvas drawing api - we only draw textures
		var m = this.mvMatrix;
		var w = 0,
			h= 0;
		if (this.contentSize) {
			w = this.contentSize.width;
			h = this.contentSize.height;
		}
		gl.globalAlpha = this.color[3];
		gl.setTransform(m[0], m[4], m[1], m[5],
			m[12] + (0.5 - this.anchorPoint.x) * w,
			gl.viewportHeight - (m[13] + (0.5 - this.anchorPoint.y) * h));
		if (this.program == chesterGL.Block.PROGRAM.TEXTURE) {
			texture = chesterGL.getAsset('texture', this.texture);
			var frame = this.frame;
			gl.drawImage(/** @type {HTMLImageElement} */(texture), frame[0], texture.height - (frame[1] + h), frame[2], frame[3], -w/2, -h/2, w, h);
		} else {
			// draw a rectangle, to simulate the quad being drawn
			var byteColor = [];
			for (var i=0; i < 4; i++) {
				byteColor[i] = this.color[i] * 255;
			}
			gl.fillStyle = "rgba(" + byteColor.join(",") + ")";
			gl.fillRect(-w/2, -h/2, w, h);
		}
	}
};

// export symbols
goog.exportSymbol('chesterGL.Block', chesterGL.Block);
// constants / enums
goog.exportSymbol('chesterGL.Block.FullFrame', chesterGL.Block.FullFrame);
goog.exportSymbol('chesterGL.Block.SizeZero', chesterGL.Block.SizeZero);
goog.exportSymbol('chesterGL.Block.TYPE', chesterGL.Block.TYPE);
goog.exportSymbol('chesterGL.Block.PROGRAM', chesterGL.Block.PROGRAM);
goog.exportSymbol('chesterGL.Block.PROGRAM_NAME', chesterGL.Block.PROGRAM_NAME);
goog.exportSymbol('chesterGL.Block.DEG_TO_RAD', chesterGL.Block.DEG_TO_RAD);
goog.exportSymbol('chesterGL.Block.RAD_TO_DEG', chesterGL.Block.RAD_TO_DEG);
goog.exportSymbol('chesterGL.Block.ONE_DEG', chesterGL.Block.ONE_DEG);
// properties
goog.exportProperty(chesterGL.Block.prototype, 'title', chesterGL.Block.prototype.title);
// instance methods
goog.exportProperty(chesterGL.Block.prototype, 'onEnterScene', chesterGL.Block.prototype.onEnterScene);
goog.exportProperty(chesterGL.Block.prototype, 'onExitScene', chesterGL.Block.prototype.onExitScene);
goog.exportProperty(chesterGL.Block.prototype, 'children', chesterGL.Block.prototype.children);
goog.exportProperty(chesterGL.Block.prototype, 'append', chesterGL.Block.prototype.append);
goog.exportProperty(chesterGL.Block.prototype, 'remove', chesterGL.Block.prototype.remove);
goog.exportProperty(chesterGL.Block.prototype, 'removeAll', chesterGL.Block.prototype.removeAll);
goog.exportProperty(chesterGL.Block.prototype, 'detach', chesterGL.Block.prototype.detach);
goog.exportProperty(chesterGL.Block.prototype, 'getBoundingBox', chesterGL.Block.prototype.getBoundingBox);
goog.exportProperty(chesterGL.Block.prototype, 'setPosition', chesterGL.Block.prototype.setPosition);
goog.exportProperty(chesterGL.Block.prototype, 'getPosition', chesterGL.Block.prototype.getPosition);
goog.exportProperty(chesterGL.Block.prototype, 'toLocal', chesterGL.Block.prototype.toLocal);
goog.exportProperty(chesterGL.Block.prototype, 'setAnchorPoint', chesterGL.Block.prototype.setAnchorPoint);
goog.exportProperty(chesterGL.Block.prototype, 'getAnchorPoint', chesterGL.Block.prototype.getAnchorPoint);
goog.exportProperty(chesterGL.Block.prototype, 'getAbsolutePosition', chesterGL.Block.prototype.getAbsolutePosition);
goog.exportProperty(chesterGL.Block.prototype, 'setRotation', chesterGL.Block.prototype.setRotation);
goog.exportProperty(chesterGL.Block.prototype, 'getRotation', chesterGL.Block.prototype.getRotation);
goog.exportProperty(chesterGL.Block.prototype, 'setColor', chesterGL.Block.prototype.setColor);
goog.exportProperty(chesterGL.Block.prototype, 'getColor', chesterGL.Block.prototype.getColor);
goog.exportProperty(chesterGL.Block.prototype, 'setFrame', chesterGL.Block.prototype.setFrame);
goog.exportProperty(chesterGL.Block.prototype, 'getFrame', chesterGL.Block.prototype.getFrame);
goog.exportProperty(chesterGL.Block.prototype, 'setContentSize', chesterGL.Block.prototype.setContentSize);
goog.exportProperty(chesterGL.Block.prototype, 'getContentSize', chesterGL.Block.prototype.getContentSize);
goog.exportProperty(chesterGL.Block.prototype, 'setTexture', chesterGL.Block.prototype.setTexture);
goog.exportProperty(chesterGL.Block.prototype, 'getTexture', chesterGL.Block.prototype.getTexture);
goog.exportProperty(chesterGL.Block.prototype, 'setScale', chesterGL.Block.prototype.setScale);
goog.exportProperty(chesterGL.Block.prototype, 'getScale', chesterGL.Block.prototype.getScale);
goog.exportProperty(chesterGL.Block.prototype, 'setUpdate', chesterGL.Block.prototype.setUpdate);
goog.exportProperty(chesterGL.Block.prototype, 'setVisible', chesterGL.Block.prototype.setVisible);
goog.exportProperty(chesterGL.Block.prototype, 'isVisible', chesterGL.Block.prototype.isVisible);
