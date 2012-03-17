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

goog.provide("chesterGL.actions");

goog.require("chesterGL.core");
goog.require("chesterGL.Block");

/**
 * @constructor
 * @param {number} totalTime in seconds
 * @param {chesterGL.Block=} block The target block
 */
chesterGL.Action = function (totalTime, block) {
	this.totalTime = totalTime * 1000;
	this.block = block;
	this.elapsed = 0;
};

/**
 * The block to which this action will be applied
 * 
 * @type {chesterGL.Block|null|undefined}
 */
chesterGL.Action.prototype.block = null;

/**
 * The total time in seconds this action should take
 * (might not be relevant for all actions)
 * 
 * @type {number}
 */
chesterGL.Action.prototype.totalTime = 0;

/**
 * Current time in seconds of the action
 * (might not be relevant for all actions)
 * 
 * @type {number}
 */
chesterGL.Action.prototype.elapsed = 0;

/**
 * The current time of the action
 * @type {number}
 */
chesterGL.Action.prototype.currentTime = 0;

/**
 * The current time of the action
 * @type {boolean}
 */
chesterGL.Action.prototype.finished = false;

/**
 * is the action running?
 * @type {boolean}
 */
chesterGL.Action.prototype.running = false;

/**
 * This is the default update function (does nothing)
 * @param {number} delta
 */
chesterGL.Action.prototype.update = function (delta) {
	if (!this.running) {
		this.begin();
		this.running = true;
	}
	this.elapsed += delta;
	if (this.totalTime > 0 && this.elapsed >= this.totalTime) {
		this.finished = true;
	}
};

/**
 * will be called the first time - usually overriden by subclasses
 */
chesterGL.Action.prototype.begin = function () {
};

/**
 * @constructor
 * @param {Array|Float32Array} finalPosition The final position (the initial position is the current one of the block)
 * @param {number} totalTime The total time in seconds that this action should take
 * @param {chesterGL.Block=} block The block that will execute this action
 * @extends {chesterGL.Action}
 */
chesterGL.MoveToAction = function (finalPosition, totalTime, block) {
	chesterGL.Action.call(this, totalTime, block);
	this.finalPosition = goog.vec.Vec3.createFloat32FromArray(finalPosition);
};
goog.inherits(chesterGL.MoveToAction, chesterGL.Action);

/**
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.MoveToAction.prototype.finalPosition = null;

/**
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.MoveToAction.prototype.startPosition = null;

/**
 * @type {goog.vec.Vec3.Type}
 * @ignore
 */
chesterGL.MoveToAction__tmp_pos = goog.vec.Vec3.createFloat32();

/**
 * @param {number} delta miliseconds from last time we updated
 * @ignore
 */
chesterGL.MoveToAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	var block = this.block;
	if (this.finished) {
		block.setPosition(this.finalPosition);
	} else {
		var t = Math.min(1, this.elapsed / this.totalTime);
		// console.log("t: " + t + "\t(" + dx + ")");
		goog.vec.Vec3.lerp(this.startPosition, this.finalPosition, t, chesterGL.MoveToAction__tmp_pos);
		block.setPosition(chesterGL.MoveToAction__tmp_pos);
	}
};

/**
 * just set the initial position
 * @ignore
 */
chesterGL.MoveToAction.prototype.begin = function () {
	if (!this.block) {
		throw "invalid move action! - now block";
	}
	this.startPosition = this.block.position;
};

/**
 * @constructor
 * @param {number} delay in seconds between frames
 * @param {Array.<Object>} frames The frames of the animation
 * @param {boolean=} loop Whether or not this animation should loop
 * @param {chesterGL.Block=} block The block that will receive this action
 * @extends {chesterGL.Action}
 */
chesterGL.AnimateAction = function (delay, frames, loop, block) {
	this.delay = delay * 1000.0;
	var totalTime = this.delay * frames.length;
	if (loop === true) totalTime = -1;
	chesterGL.Action.call(this, totalTime, block);
	this.shouldLoop = (loop === true);
	this.frames = frames.slice(0);
};
goog.inherits(chesterGL.AnimateAction, chesterGL.Action);

/**
 * the current frame
 * @type {number}
 * @ignore
 */
chesterGL.AnimateAction.prototype.currentFrame = 0;

/**
 * The delay between frames
 * @type {number}
 * @ignore
 */
chesterGL.AnimateAction.prototype.delay = 0.0;

/**
 * The total frames of the animation
 * @type {Array.<goog.vec.Vec4.Type>}
 * @ignore
 */
chesterGL.AnimateAction.prototype.frames = null;

/**
 * Whether or not the animation should loop
 * @type {boolean}
 */
chesterGL.AnimateAction.prototype.shouldLoop = false;

/**
 * @param {number} delta
 * @ignore
 */
chesterGL.AnimateAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	var block = this.block;
	if (this.finished) {
		this.currentFrame = this.frames.length - 1;
		this.finished = true;
		// set last frame
		block.setFrame(this.frames[this.currentFrame]);
	} else {
		if (this.elapsed >= this.delay * this.currentFrame) {
			block.setFrame(this.frames[this.currentFrame++]);
			if (this.currentFrame == this.frames.length) {
				if (this.shouldLoop) { this.currentFrame = 0; this.elapsed = 0; }
				else this.finished = true;
			}
		}
	}
};

/**
 * global action manager
 * @namespace
 */
chesterGL.ActionManager = {};

/**
 * the list of scheduled actions
 * @ignore
 * @type {Array.<chesterGL.Action>}
 * @private
 */
chesterGL.ActionManager.scheduledActions_ = [];

/**
 * adds an action to the scheduler
 * 
 * @param {chesterGL.Action} action
 */
chesterGL.ActionManager.scheduleAction = function (action) {
	chesterGL.ActionManager.scheduledActions_.push(action);
};

/**
 * Iterate over all scheduled actions
 * @param {number} delta number of miliseconds to run in all actions
 * @ignore
 */
chesterGL.ActionManager.tick = function (delta) {
	var i = 0, len = chesterGL.ActionManager.scheduledActions_.length;
	for (i=0; i < len; i++) {
		var a = chesterGL.ActionManager.scheduledActions_[i];
		!a.finished && a.update(delta);
	}
};

/**
 * schedules an action to be run over this block
 * @param {chesterGL.Action} action
 */
chesterGL.Block.prototype.runAction = function (action) {
	action.block = this;
	chesterGL.ActionManager.scheduleAction(action);
};

goog.exportSymbol('chesterGL.ActionManager', chesterGL.ActionManager);
goog.exportSymbol('chesterGL.MoveToAction', chesterGL.MoveToAction);
goog.exportSymbol('chesterGL.AnimateAction', chesterGL.AnimateAction);
goog.exportProperty(chesterGL.ActionManager, 'scheduleAction', chesterGL.ActionManager.scheduleAction);
goog.exportProperty(chesterGL.Block.prototype, 'runAction', chesterGL.Block.prototype.runAction);
