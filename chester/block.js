/**
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

define(["require", "glmatrix"], function (require, glmatrix) {
	/**
	 * will be filled later, with the core object
	 */
	var core = null;

	/**
	 * creates a new block. Pass the rect if you want to set the frame at
	 * creation time.
	 *
	 * @constructor
	 * @param {goog.vec.Vec4.Vec4Like|string=} rect
	 * @param {number=} type
	 * @param {Block=} parent
	 */
	var Block = function (rect, type, parent) {
		this.type = type || Block.TYPE.STANDALONE;
		if (parent) {
			this.parent = parent;
		}

		this.children = [];
		this.program = Block.PROGRAM.DEFAULT;

		// set default color and content size
		this.setContentSize(0, 0);
		if (this.type == Block.TYPE.STANDALONE) {
			this.setColor([1, 1, 1, 1]);
		}
		if (rect) {
			if (typeof rect === "string" && core.hasAsset("texture", rect)) {
				this.setTexture(rect);
			} else {
				this.setFrame(rect);
			}
		}
		this.setPosition(0, 0, 0);
		// default anchor point
		this.setAnchorPoint(0.5, 0.5);

		if (core.settings.webglMode && (!parent || parent.type != Block.TYPE.BLOCKGROUP)) {
			var gl = core.gl;
			// just a single buffer for all data (a "quad")
			this.createBuffers();
			this.glBufferData = new Float32Array(Block.BUFFER_SIZE);
		}

		// always create the mvMatrix
		this.mvMatrix = glmatrix.mat4.create();
		this.mvpMatrix = glmatrix.mat4.create();

		// create the remove/add lists
		this._scheduledAdd = [];
		this._scheduledRemove = [];
	};

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
	 * @type {Array.<string>}
	 */
	Block.PROGRAM_NAME = [
		"default",
		"texture"
	];

	/**
	 * Different types of blocks
	 * @enum {number}
	 */
	Block.TYPE = {
		STANDALONE: 0,
		BLOCKGROUP: 1,
		SCENE:      2,
		TMXBLOCK:   3,
		PARTICLE:   4,
		PRIMITIVE:  5
	};

	/**
	 * This is the size of one "interleaved" vertex, in bytes
	 * 3 (position) + 2 (tex coord) + 4 (color) = 9 floats = 36 bytes
	 * @const
	 * @type {number}
	 * @ignore
	 */
	Block.VERT_SIZE = 36;

	/**
	 * This is how many items the buffer data must have.
	 * 3 (vert) + 2 (tex) + 4 (color) = 9; 9 * 4 (verts) = 36
	 * @const
	 * @type {number}
	 * @ignore
	 */
	Block.BUFFER_SIZE = 36;

	/**
	 * @const
	 * @type {number}
	 */
	Block.DEG_TO_RAD = Math.PI / 180.0;

	/**
	 * @const
	 * @type {number}
	 */
	Block.RAD_TO_DEG = 180.0 / Math.PI;

	/**
	 * One degree in radians
	 * @const
	 * @type {number}
	 */
	Block.ONE_DEG = 1 * Block.DEG_TO_RAD;

	/**
	 * the full frame
	 *
	 * @const
	 * @type {goog.vec.Vec4.Type}
	 */
	Block.FullFrame = glmatrix.vec4.fromValues(0.0, 0.0, 1.0, 1.0);

	/**
	 * the size zero constant
	 *
	 * @const
	 * @type {goog.math.Size}
	 */
	Block.SizeZero = glmatrix.vec2.create();

	/**
	 * Sets the title of this block, only used in the scenes right now (for analytics)
	 * @type {string}
	 */
	Block.prototype.title = "";

	/**
	 * @type {boolean}
	 * @ignore
	 */
	Block.prototype.debugNodeAdded = false;

	/**
	 * @type {?goog.vec.Mat4.Type}
	 * @ignore
	 */
	Block.prototype.mvMatrix = null;

	/**
	 * @type {?goog.vec.Mat4.Type}
	 * @ignore
	 */
	Block.prototype.mvpMatrix = null;

	/**
	 * Sets whether or not the block is visible
	 * @type {boolean}
	 */
	Block.prototype.visible = true;

	/**
	 * True if the node/scene is running
	 * @type {boolean}
	 */
	Block.prototype.isRunning = false;

	/**
	 * The z-order of the blocks inside the parent block
	 * @type {number}
	 */
	Block.prototype.zorder = 0;

	/**
	 * did the position, scale or rotation change?
	 * @type {boolean}
	 * @ignore
	 */
	Block.prototype.isTransformDirty = false;

	/**
	 * @type {boolean}
	 * @ignore
	 */
	Block.prototype.isColorDirty = false;

	/**
	 * @type {boolean}
	 * @ignore
	 */
	Block.prototype.isFrameDirty = false;

	/**
	 * @type {number}
	 * @ignore
	 */
	Block.prototype.baseBufferIndex = 0;

	/**
	 * @type {?WebGLBuffer}
	 * @ignore
	 */
	Block.prototype.glBuffer = null;

	/**
	 * @type {Float32Array}
	 * @ignore
	 */
	Block.prototype.glBufferData = null;

	/**
	 * the position of the anchor point of the block. Use the setter to modify this property
	 * @type {goog.vec.Vec3.Type}
	 */
	Block.prototype.position = null;

	/**
	 * the anchor point for the block. Use the setter to modify this property
	 * @type {goog.math.Vec2}
	 */
	Block.prototype.anchorPoint = null;

	/**
	 * the content size of the block. Use the setter to modify this property
	 * @type {?goog.math.Size}
	 */
	Block.prototype.contentSize = null;

	/**
	 * the color of the block. Use the setter to modify this property
	 * @type {goog.vec.Vec4.Type}
	 */
	Block.prototype.color = null;

	/**
	 * The name of the texture associated with this block. Use the setter to modify this property
	 * @type {?string}
	 */
	Block.prototype.texture = null;

	/**
	 * rotation of the box - in radians. Use the setter to modify this property
	 * @type {number}
	 */
	Block.prototype.rotation = 0;

	/**
	 * the scale in the X axis of the box. Use the setter to modify this property
	 * @type {number}
	 */
	Block.prototype.scaleX = 1.0;

	/**
	 * the scale in the Y axis of the box. Use the setter to modify this property
	 * @type {number}
	 */
	Block.prototype.scaleY = 1.0;

	/**
	 * update function - called every frame with the delta in milliseconds since last frame
	 * @type {?function(number)}
	 */
	Block.prototype.update = null;

	/**
	 * the texture frame. Use the setter to modify this property
	 * @type {?goog.vec.Vec4.Type}
	 */
	Block.prototype.frame = null;

	/**
	 * the block group this block belongs to. Read only
	 * @type {?Block}
	 */
	Block.prototype.parent = null;

	/**
	 * the array to hold children blocks. Read only, to modify use append or remove
	 * @type {?Array.<Block>}
	 */
	Block.prototype.children = null;

	/**
	 * The scheduled list of blocks to add/remove after a visit
	 * @ignore
	 * @type {?Array.<Block>}
	 */
	Block.prototype._scheduledAdd = null;

	/**
	 * @ignore
	 * @type {?Array.<Block>}
	 */
	Block.prototype._scheduledRemove = null;

	/**
	 * Are we visiting this node?
	 * @ignore
	 * @type {boolean}
	 */
	Block.prototype._inVisit = false;

	/**
	 * create (or recreate) buffers for this block
	 */
	Block.prototype.createBuffers = function () {
		if (core.settings.webglMode) {
			this.glBuffer = core.gl.createBuffer();
			this.isTransformDirty = this.isFrameDirty = true;
		}
	};

	/**
	 * executed when the node/scene is activated for the first time
	 * or when adding a new child to a running scene.
	 */
	Block.prototype.onEnterScene = function () {
		this.isRunning = true;
		for (var i in this.children) {
			this.children[i].onEnterScene();
		}
	};

	/**
	 * executed when the node/scene is removed
	 */
	Block.prototype.onExitScene = function () {
		this.isRunning = false;
		for (var i in this.children) {
			this.children[i].onExitScene();
		}
		this.removeAllActions();
	};

	/**
	 * sets the frame for this block
	 *
	 * @param {goog.vec.Vec3.Vec3Like|string} newFrame
	 * @param {boolean=} isHighDPI
	 * @returns {Block} The object itself
	 */
	Block.prototype.setFrame = function (newFrame, isHighDPI) {
		var BlockFrames = require("chester/blockFrames");
		if (typeof newFrame === "string") {
			// just get the cached frame
			var tmpFrame = BlockFrames.getFrame(newFrame);
			if (!tmpFrame) {
				throw "Invalid frame name: " + newFrame;
			}
			newFrame = tmpFrame.frame;
			// this will, in turn, call setFrame again
			this.setTexture(tmpFrame.texture, newFrame);
		} else {
			if (!this.frame) {
				this.frame = glmatrix.vec4.clone(newFrame);
			} else {
				glmatrix.vec4.copy(this.frame, newFrame);
			}
			// if on highDPI mode, and the texture is a highDPI texture, then set the content size to
			// the "real" content size.
			if (isHighDPI) {
				var pixelRatio = core.getDevicePixelRatio();
				this.setContentSize(newFrame[2] / pixelRatio, newFrame[3] / pixelRatio);
			} else {
				this.setContentSize(newFrame[2], newFrame[3]);
			}
		}
		this.isFrameDirty = true;
		return this;
	};

	/**
	 * gets the frame for this block
	 *
	 * @return {Float32Array}
	 */
	Block.prototype.getFrame = function () {
		return this.frame;
	};

	/**
	 * sets the size of the block in pixels
	 *
	 * @param {number} width
	 * @param {number} height
	 * @returns {Block} The object itself
	 * @example
	 * // sets the content size to 128 x 128px
	 * block.setContentSize(128, 128);
	 */
	Block.prototype.setContentSize = function (width, height) {
		this.contentSize = glmatrix.vec2.fromValues(width, height);
		this.isFrameDirty = true;
		if (DEBUG) {
			if (isNaN(this.contentSize[0]) || isNaN(this.contentSize[1])) {
				throw "Invalid content size!";
			}
		}
		return this;
	};

	Block.prototype.getContentSize = function () {
		return this.contentSize;
	};

	/**
	 * sets the scale of the block
	 *
	 * @param {number} newScaleX
	 * @param {number=} newScaleY optional: pass only newScaleX to set both
	 * @returns {block} The object itself
	 */
	Block.prototype.setScale = function (newScaleX, newScaleY) {
		this.scaleX = newScaleX;
		if (arguments.length == 2) {
			this.scaleY = /** @type {number} */(newScaleY);
		} else {
			this.scaleY = this.scaleX;
		}
		this.isTransformDirty = true;
		return this;
	};

	/**
	 * gets the scale of the block
	 *
	 * @return {number} the scaleX property
	 */
	Block.prototype.getScale = function () {
		return this.scaleX;
	};

	/**
	 * sets the color of the block
	 * the array should be created in the order RGBA
	 *
	 * @param {Array|Float32Array} color
	 * @returns {Block} The object itself
	 */
	Block.prototype.setColor = function (color) {
		if (!this.color) {
			this.color = glmatrix.vec4.clone(color);
		} else {
			glmatrix.vec4.copy(this.color, color);
		}
		this.isColorDirty = true;
		return this;
	};

	/**
	 * gets the color of the block
	 * @return {Float32Array} an array with the color [r, g, b, a]
	 */
	Block.prototype.getColor = function () {
		return this.color;
	};

	/**
	 * gets the alpha of the block (the fourth element of the color)
	 * @return {number} the alpha
	 */
	Block.prototype.getAlpha = function () {
		return this.color[3];
	};

	/**
	 * sets the alpha of the block (the fourth element of the color)
	 * @param {number} alpha the new alpha value
	 */
	Block.prototype.setAlpha = function (alpha) {
		if (!this.color) {
			throw "Need to set the color before alpha";
		}
		this.color[3] = alpha;
		this.isColorDirty = true;
		return this;
	};

	/**
	 * sets the position of the block (x, y, z). It accepts an array
	 * or three values (preferred in order to avoid GC)
	 *
	 * @param {Array|Float32Array|number} x
	 * @param {number=} y
	 * @param {number=} z
	 * @returns {Block} The object itself
	 */
	Block.prototype.setPosition = function (x, y, z) {
		if (!this.position) {
			if (arguments.length == 1)
				this.position = glmatrix.vec3.clone(x);
			else
				this.position = glmatrix.vec3.fromValues(x, y, z);
		} else {
			if (arguments.length == 1)
				glmatrix.vec3.copy(this.position, x);
			else
				glmatrix.vec3.set(this.position, x, y, z);
		}
		if (DEBUG) {
			if (isNaN(this.position[0]) || isNaN(this.position[1]) || isNaN(this.position[2])) {
				throw "Invalid position!";
			}
		}
		this.isTransformDirty = true;
		return this;
	};

	/**
	 * adjusts the position in a relative fashion (relative to the current position)
	 *
	 * @param {number} dx
	 * @param {number} dy
	 * @param {number} dz
	 */
	Block.prototype.adjustPosition = function (dx, dy, dz) {
		if (!this.position) {
			throw "call setPosition before adjusting it!";
		}
		this.position[0] += dx || 0;
		this.position[1] += dy || 0;
		this.position[2] += dz || 0;
		this.isTransformDirty = true;
	};

	/**
	 * sets the anchor point for the block. By default it's (0.5, 0.5)
	 * That means it's in the center of the block. (0,0) is the bottom left, (1,1) is the top right.
	 * You can specify numbers bigger than 1 and smaller than 0 if you want.
	 * @param {number} x
	 * @param {number} y
	 * @returns {Block} The object itself
	 */
	Block.prototype.setAnchorPoint = function(x, y) {
		this.anchorPoint = glmatrix.vec2.fromValues(x, y);
		if (DEBUG) {
			if (isNaN(this.anchorPoint[0]) || isNaN(this.anchorPoint[1])) {
				throw "Invalid anchor point!";
			}
		}
		return this;
	};

	/**
	 * @return {goog.math.Vec2}
	 */
	Block.prototype.getAnchorPoint = function() {
		return this.anchorPoint;
	};

	/**
	 * gets the position of the block (x, y, z)
	 * @return {Float32Array}
	 */
	Block.prototype.getPosition = function () {
		return this.position;
	};

	/**
	 * returns the absolute position of the block, basically the position of the block applying the
	 * transformations from all its parents.
	 * @return {Float32Array|Array}
	 */
	Block.prototype.getAbsolutePosition = function () {
		var p = this.parent,
			pos = glmatrix.vec3.clone(this.position),
			m = this.getAbsoluteTransform();
		glmatrix.vec3.transformMat4(pos, pos, m);
		return pos;
	};

	/**
	 * @type {Float32Array}
	 * @ignore
	 */
	var __tmpInv = new Float32Array(16);

	/**
	 * converts a global point to local coordinates
	 * @param {Float32Array|Array} pt the point in local coordinates, if no dest provided, then pt will
	 * be modified
	 * @param {Float32Array|Array=} dest optional destination array
	 * @return {Float32Array|Array}
	 */
	Block.prototype.toLocal = function (pt, dest) {
		dest = dest || pt;
		glmatrix.mat4.invert(__tmpInv, this.mvMatrix);
		glmatrix.vec3.transformMat4(dest, pt, __tmpInv);
		dest[0] += this.contentSize[0] * this.anchorPoint[0];
		dest[1] += this.contentSize[1] * this.anchorPoint[1];
		return dest;
	};

	/**
	 * returns the concatenated matrix from all the block's parents
	 * @return {Float32Array|Array}
	 */
	Block.prototype.getAbsoluteTransform = function () {
		var m = glmatrix.mat4.clone(this.mvMatrix),
			p = this.parent;
		while (p) {
			glmatrix.mat4.multiply(m, p.mvMatrix, m);
			p = p.parent;
		}
		return m;
	};

	/**
	 * returns the current bounding box as an Array [bottom, left, width, height]
	 * @return {Array}
	 */
	Block.prototype.getBoundingBox = function () {
		var p = this.position,
			w = this.contentSize[0],
			h = this.contentSize[1];
		return [p[0] - w/2, p[1] - h/2, w, h];
	};

	/**
	 * sets the texture of the block - the texture will be loaded if needed
	 * @param {string} texturePath
	 * @param {goog.vec.Vec3.Vec3Like=} frame
	 * @returns {Block} The object itself
	 */
	Block.prototype.setTexture = function (texturePath, frame) {
		if (texturePath == this.texture && (!frame || this.frame == frame)) {
			return this;
		}
		this.texture = texturePath;
		// force program to texture program
		this.program = Block.PROGRAM.TEXTURE;
		core.loadAsset("texture", texturePath, null, function (err, t) {
			// set the default frame for all our blocks (if it's not set)
			var isHighDPI = core.isHighDPI() && (core.getRawAsset('texture', this.texture) || {}).highDPI;
			this.setFrame(frame || [0, 0, t.width, t.height], isHighDPI);
		}.bind(this));
		return this;
	};

	/**
	 * gets the texture of the block
	 * @return {string|null}
	 */
	Block.prototype.getTexture = function () {
		return this.texture;
	};

	/**
	 * sets the rotation of the block to a specific angle
	 * @param {number} angle specified in radians, CW
	 * @returns {Block} The object itself
	 */
	Block.prototype.setRotation = function (angle) {
		this.rotation = angle;
		this.isTransformDirty = true;
		return this;
	};

	/**
	 * gets the rotation of the block
	 * @return {number} then current rotation angle in radians, CW
	 */
	Block.prototype.getRotation = function () {
		return this.rotation;
	};

	/**
	 * sets the update function - to be called every frame for this block
	 * @param {function (?number)} callback
	 * @returns {Block} The object itself
	 */
	Block.prototype.setUpdate = function (callback) {
		this.update = callback;
		return this;
	};

	/**
	 * @ignore
	 * @param {Block} b
	 */
	Block.prototype.reorder = function (b) {
		var idx = this.children.indexOf(b);
		if (idx >= 0) {
			this.children.splice(idx, 1);
			var added = false;
			for (var j in this.children) {
				if (this.children[j].zorder > b.zorder) {
					this.children.splice(j, 0, b);
					added = true;
					break;
				}
			}
			if (!added) {
				this.children.push(b);
			}
		}
	};

	/**
	 * @param {number} zorder
	 */
	Block.prototype.setZOrder = function (zorder) {
		if (zorder !== this.zorder) {
			this.zorder = zorder;
			if (this.parent) {
				this.parent.reorder(this);
			}
		}
		return this;
	};

	/**
	 * return {number} the zorder of this block
	 */
	Block.prototype.getZOrder = function () {
		return this.zorder;
	};

	/**
	 * sets whether or not the block is visible
	 * @param {boolean} visible
	 * @returns {Block} The object itself
	 */
	Block.prototype.setVisible = function (visible) {
		this.visible = visible;
		return this;
	};

	/**
	 * returns whether or not the block is visible
	 * @return {boolean}
	 */
	Block.prototype.isVisible = function () {
		return this.visible;
	};

	/**
	 * Append a block as a child. If you add the block while in a visit of the parent block,
	 * the child will be scheduled to be added after the visit.
	 *
	 * @param {...Block} blocks
	 * @returns {Block} The object itself
	 */
	Block.prototype.append = function (blocks) {
		for (var i in arguments) {
			var b = arguments[i];
			if (b.parent) {
				throw "can't add a block twice!";
			}
			if (this._inVisit) {
				this._scheduledAdd.push(b);
			} else {
				var added = false;
				for (var j in this.children) {
					if (this.children[j].zorder > b.zorder) {
						this.children.splice(j, 0, b);
						added = true;
						break;
					}
				}
				if (!added) {
					this.children.push(b);
				}
				b.parent = this;
			}
			if (this.isRunning) {
				b.onEnterScene();
			}
		}
		return this;
	};

	/**
	 * removes a block from the children list. If you remove the child while in a visit of the parent block,
	 * the child will be scheduled to be removed after the visit.
	 *
	 * @param {Block} block
	 * @returns {Block} The object itself
	 */
	Block.prototype.remove = function (b) {
		if (!b.parent || b.parent != this) {
			throw "not our child!";
		}
		if (this._inVisit) {
			this._scheduledRemove.push(b);
		} else {
			var idx = this.children.indexOf(b);
			if (idx >= 0) {
				this.children.splice(idx,1);
				b.parent = null;
			}
		}
		if (this.isRunning) {
			b.onExitScene();
		}
		return this;
	};

	/**
	 * detach block from parent
	 */
	Block.prototype.detach = function Block_detach() {
		if (this.parent) {
			this.parent.remove(this);
		}
	};

	Block.prototype.removeAll = function Block_removeAll() {
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
	var __tmpBuffers = [
		new Float32Array(3),
		new Float32Array(3),
		new Float32Array(3),
		new Float32Array(3)
	];

	/**
	 * actually performs the transformation
	 * @ignore
	 */
	Block.prototype.transform = function () {
		var gl = core.gl,
			transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty)),
			_px, _py,
			inBlockGroup = this.parent && this.parent.type == Block.TYPE.BLOCKGROUP;
		var anchorOffX = (this.contentSize ? (0.5 - this.anchorPoint[0]) * this.contentSize[0] : 0),
			anchorOffY = (this.contentSize ? (0.5 - this.anchorPoint[1]) * this.contentSize[1] : 0);
		if (transformDirty) {
			// flag this for our children
			this.isTransformDirty = true;
			_px = this.position[0];
			_py = this.position[1];

			if (core.settings.webglMode && core.settings.canvasOriginTopLeft) _py = (gl.viewportHeight / 2) - _py;
			
			glmatrix.mat4.identity(this.mvMatrix);
			glmatrix.mat4.translate(this.mvMatrix, this.mvMatrix, [_px, _py, this.position[2]]);
			glmatrix.mat4.rotate(this.mvMatrix, this.mvMatrix, this.rotation * -1, [0, 0, 1]);
			glmatrix.mat4.scale(this.mvMatrix, this.mvMatrix, [this.scaleX, this.scaleY, 1]);
			// concat with parent's transform
			var ptransform = (this.parent ? this.parent.mvMatrix : null);
			if (ptransform && !inBlockGroup) {
				glmatrix.mat4.multiply(this.mvMatrix, ptransform, this.mvMatrix);
			}
		}

		// bail out if we're a block group or a primitive block
		if (this.type == Block.TYPE.BLOCKGROUP || this.type == Block.TYPE.PRIMITIVE) {
			return;
		}

		var bufferData = this.glBufferData;

		if (core.settings.webglMode) {
			var _idx, offset = 9;
			if (!inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
			}
			if (this.isFrameDirty || this.isTransformDirty) {
				var hw = this.contentSize[0] * 0.5,
					hh = this.contentSize[1] * 0.5,
					z = this.position[2];
				_idx = this.baseBufferIndex * Block.BUFFER_SIZE;

				if (inBlockGroup) {
					// NOTE
					// this is going to be slow :P
					// this is using the matrix to transform the vertex data
					var tr = glmatrix.vec3.set(__tmpBuffers[0], hw + anchorOffX,  hh + anchorOffY, z),
						tl = glmatrix.vec3.set(__tmpBuffers[1],-hw + anchorOffX,  hh + anchorOffY, z),
						br = glmatrix.vec3.set(__tmpBuffers[2], hw + anchorOffX, -hh + anchorOffY, z),
						bl = glmatrix.vec3.set(__tmpBuffers[3],-hw + anchorOffX, -hh + anchorOffY, z);
					glmatrix.vec3.transformMat4(tr, tr, this.mvMatrix);
					glmatrix.vec3.transformMat4(tl, tl, this.mvMatrix);
					glmatrix.vec3.transformMat4(bl, bl, this.mvMatrix);
					glmatrix.vec3.transformMat4(br, br, this.mvMatrix);

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

				if (this.isFrameDirty && this.program == Block.PROGRAM.TEXTURE) {
					var tex = core.getAsset("texture", this.texture);
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
				_idx = 5 + this.baseBufferIndex * Block.BUFFER_SIZE;
				var color = this.color;
				for (var i=0; i < 4; i++) {
					bufferData[_idx     + offset*i] = color[0];
					bufferData[_idx + 1 + offset*i] = color[1];
					bufferData[_idx + 2 + offset*i] = color[2];
					bufferData[_idx + 3 + offset*i] = color[3];
				}
			}
			if (core.settings.webglMode && !inBlockGroup && (this.isFrameDirty || this.isColorDirty)) {
				gl.bufferData(gl.ARRAY_BUFFER, this.glBufferData, gl.STATIC_DRAW);
			}
		}
	};

	/**
	 * prepares the block for the rendering (transforms if necessary)
	 * @ignore
	 */
	Block.prototype.visit = function () {
		this._inVisit = true;
		if (this.update) {
			this.update(core.delta);
		}
		if (!this.visible) {
			this._inVisit = false;
			return;
		}
		this.transform();

		// render this block if not in a block group and if not orphan
		if (this.parent && this.parent.type != Block.TYPE.BLOCKGROUP) {
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
	Block.prototype.render = function () {
		// dummy render for scene blocks
		if (this.type == Block.TYPE.SCENE) {
			return;
		}
		var gl, texture;

		if (core.settings.webglMode) {
			gl = core.gl;
			// select current shader
			var program = core.selectProgram(Block.PROGRAM_NAME[this.program]);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
			var texOff = 3 * 4,
				colorOff = texOff + 2 * 4,
				stride = Block.VERT_SIZE;

			gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
			gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, colorOff);

			if (this.program == Block.PROGRAM.DEFAULT) {
				// no extra attributes for the shader
			} else if (this.program == Block.PROGRAM.TEXTURE) {
				texture = core.getAsset('texture', this.texture);

				// pass the texture attributes
				gl.vertexAttribPointer(program.attribs['textureCoordAttribute'], 2, gl.FLOAT, false, stride, texOff);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture.tex);
				gl.uniform1i(program.samplerUniform, 0);
			}

			// set the matrix uniform (the multiplied model view projection matrix)
			var transformDirty = (this.isTransformDirty || (this.parent && this.parent.isTransformDirty));
			if (transformDirty) {
				glmatrix.mat4.multiply(this.mvpMatrix, core.pMatrix, this.mvMatrix);
			}
			gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		} else {
			gl = core.gl;
			// canvas drawing api - we only draw textures
			var m = this.mvMatrix;
			var w = 0,
				h= 0;
			if (this.contentSize) {
				w = this.contentSize[0];
				h = this.contentSize[1];
			}
			gl.globalAlpha = this.color[3];
			if (core.settings.canvasOriginTopLeft) {
				gl.setTransform(m[0], m[4], m[1], m[5],
								m[12] + (0.5 - this.anchorPoint[0]) * w,
								(m[13] + (0.5 - this.anchorPoint[1]) * h));
			} else {
				gl.setTransform(m[0], m[4], m[1], m[5],
								m[12] + (0.5 - this.anchorPoint[0]) * w,
								gl.viewportHeight - (m[13] + (0.5 - this.anchorPoint[1]) * h));
			}
			if (this.program == Block.PROGRAM.TEXTURE) {
				texture = core.getAsset('texture', this.texture);
				var frame = this.frame;
				gl.drawImage(/** @type {HTMLImageElement} */(texture), frame[0], frame[1], frame[2], frame[3], -w/2, -h/2, w, h);
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

	Block.setup = function Block_setup(c) {
		core = c;
	};

	return Block;

});
