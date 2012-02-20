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
	 * @constructor
	 * @param {ChesterGL.Block} block
	 * @param {number=} totalTime
	 * @return ChesterGL.Action
	 */
	ChesterGL.Action = function (block, totalTime) {
		this.block = block;
		this.totalTime = totalTime * 1000;
		this.elapsed = 0;
	};
	
	/**
	 * The block to which this action will be applied
	 * 
	 * @type {?ChesterGL.Block}
	 */
	ChesterGL.Action.prototype.block = null;
	
	/**
	 * The total time in seconds this action should take
	 * (might not be relevant for all actions)
	 * 
	 * @type {number}
	 */
	ChesterGL.Action.prototype.totalTime = 0;

	/**
	 * Current time in seconds of the action
	 * (might not be relevant for all actions)
	 * 
	 * @type {number}
	 */
	ChesterGL.Action.prototype.elapsed = 0;
	
	/**
	 * The current time of the action
	 * @type {number}
	 */
	ChesterGL.Action.prototype.currentTime = 0;

	/**
	 * The current time of the action
	 * @type {boolean}
	 */
	ChesterGL.Action.prototype.finished = false;
	
	/**
	 * This is the default delta function (does nothing)
	 * @param {number} delta
	 */
	ChesterGL.Action.prototype.update = function (delta) {
		this.elapsed += delta;
		if (this.totalTime > 0 && this.elapsed >= this.totalTime) {
			this.finished = true;
		}
	};
	
	/**
	 * @constructor
	 * @extends ChesterGL.Action
	 * @param {ChesterGL.Block} block
	 * @param {number} totalTime
	 * @param {vec3} finalPosition
	 * @return ChesterGL.MoveAction
	 */
	ChesterGL.MoveToAction = function (block, totalTime, finalPosition) {
		ChesterGL.Action.call(this, block, totalTime);
		this.finalPosition = vec3.create(finalPosition);
		this.startPosition = vec3.create(block.position);
	};
	
	/**
	 * extend from Action
	 * @ignore
	 */
	ChesterGL.MoveToAction.prototype = Object.create(ChesterGL.Action.prototype);
		
	/**
	 * @type {?Object}
	 */
	ChesterGL.MoveToAction.prototype.finalPosition = null;

	/**
	 * @type {?Object}
	 */
	ChesterGL.MoveToAction.prototype.startPosition = null;
	
	/**
	 * @type {vec3}
	 * @ignore
	 */
	var __tmp_pos = vec3.create();

	/**
	 * @param {number} delta miliseconds from last time we updated
	 */
	ChesterGL.MoveToAction.prototype.update = function (delta) {
		ChesterGL.Action.prototype.update.call(this, delta);
		var block = this.block;
		if (this.finished) {
			block.moveTo(this.finalPosition);
		} else {		
			var t = Math.min(1, this.elapsed / this.totalTime);
			// console.log("t: " + t + "\t(" + dx + ")");
			vec3.lerp(this.startPosition, this.finalPosition, t, __tmp_pos);
			block.moveTo(__tmp_pos);
		}
	};

	/**
	 * @constructor
	 * @extends ChesterGL.Action
	 * @param {ChesterGL.Block} block
	 * @param {number} delay in seconds
	 * @param {Array.<Object>} frames
	 * @param {boolean?} loop
	 * @return ChesterGL.AnimateAction
	 */
	ChesterGL.AnimateAction = function (block, delay, frames, loop) {
		this.delay = delay * 1000.0;
		var totalTime = this.delay * frames.length;
		if (loop == true) totalTime = -1;
		ChesterGL.Action.call(this, block, totalTime);
		this.shouldLoop = (loop == true);
		this.frames = frames.slice(0);
	};

	/**
	 * extend from Action
	 * @ignore
	 */
	ChesterGL.AnimateAction.prototype = Object.create(ChesterGL.Action.prototype);

	/**
	 * the current frame
	 * @type {number}
	 */
	ChesterGL.AnimateAction.prototype.currentFrame = 0;

	/**
	 * The delay between frames
	 * @type {number}
	 */
	ChesterGL.AnimateAction.prototype.delay = 0.0;

	/**
	 * The total frames of the animation
	 * @type {Array.<Object>}
	 */
	ChesterGL.AnimateAction.prototype.frames = null;

	/**
	 * Whether or not the animation should loop
	 * @type {boolean}
	 */
	ChesterGL.AnimateAction.prototype.shouldLoop = false;

	/**
	 * @param {number} delta
	 */
	ChesterGL.AnimateAction.prototype.update = function (delta) {
		ChesterGL.Action.prototype.update.call(this, delta);
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
	 * @type {Object.<string,Object>}
	 */
	ChesterGL.ActionManager = {};

	/**
	 * the list of scheduled actions
	 * @ignore
	 * @type {Array.<ChesterGL.Action>}
	 */
	ChesterGL.ActionManager.scheduledActions_ = [];

	/**
	 * adds an action to the scheduler
	 * 
	 * @param {ChesterGL.Action} action
	 */
	ChesterGL.ActionManager.scheduleAction = function (action) {
		this.scheduledActions_.push(action);
	}

	/**
	 * Iterate over all scheduled actions
	 * @param {number} delta number of miliseconds to run in all actions
	 */
	ChesterGL.ActionManager.tick = function (delta) {
		var i = 0, len = this.scheduledActions_.length;
		for (i=0; i < len; i++) {
			var a = this.scheduledActions_[i];
			!a.finished && a.update(delta);
		}
	}

	ChesterGL.exportProperty(ChesterGL, 'ActionManager', ChesterGL.ActionManager);
	ChesterGL.exportProperty(ChesterGL.ActionManager, 'scheduleAction', ChesterGL.ActionManager.scheduleAction);
	ChesterGL.exportProperty(ChesterGL.ActionManager, 'tick', ChesterGL.ActionManager.tick);
	ChesterGL.exportProperty(ChesterGL, 'MoveToAction', ChesterGL.MoveToAction);
	ChesterGL.exportProperty(ChesterGL, 'AnimateAction', ChesterGL.AnimateAction);
})(window);
