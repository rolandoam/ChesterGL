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
 * @param {number} totalTime in milliseconds
 * @param {chesterGL.Block=} block The target block
 */
chesterGL.Action = function (totalTime, block) {
	this.totalTime = totalTime;
	this.block = block;
	this.elapsed = 0;
};

/**
 * The internal action id, useful to unschedule an action. It's only
 * valid after scheduling an action.
 * @type {number}
 */
chesterGL.Action.prototype.actionId = 0;

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
 * @ignore
 */
chesterGL.Action.prototype.update = function (delta) {
	this.elapsed += delta;
	if (this.totalTime > 0 && this.elapsed >= this.totalTime) {
		this.stop();
	}
};

/**
 * will be called the first time - usually overriden by subclasses
 * @ignore
 */
chesterGL.Action.prototype.begin = function () {
	this.running = true;
};

/**
 * will be called at the end of the function (or to stop it)
 */
chesterGL.Action.prototype.stop = function () {
	this.finished = true;
	this.running = false;
};

/**
 * reset - prepare the action in order to use it again
 * @ignore
 */
chesterGL.Action.prototype.reset = function () {
	this.running = false;
	this.finished = false;
	this.elapsed = 0;
};

/**
 * @constructor
 * @param {Array|Float32Array} delta The final position (the initial position is the current one of the block)
 * @param {number} totalTime The total time in seconds that this action should take
 * @param {boolean=} relative whether or not the movement is relative (defaults: true)
 * @param {chesterGL.Block=} block The block that will execute this action
 * @extends {chesterGL.Action}
 */
chesterGL.MoveAction = function (delta, totalTime, relative, block) {
	chesterGL.Action.call(this, totalTime, block);
	this.delta = goog.vec.Vec3.createFloat32FromArray(delta);
	if (relative !== undefined) {
		this.isRelative = (relative === true);
	} else {
		this.isRelative = true;
	}
	this.startPosition = goog.vec.Vec3.createFloat32();
	this.finalPosition = goog.vec.Vec3.createFloat32();
};
goog.inherits(chesterGL.MoveAction, chesterGL.Action);

/**
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.MoveAction.prototype.delta = null;

/**
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.MoveAction.prototype.finalPosition = null;

/**
 * @type {boolean}
 */
chesterGL.MoveAction.prototype.isRelative = true;

/**
 * @type {?goog.vec.Vec3.Type}
 */
chesterGL.MoveAction.prototype.startPosition = null;

/**
 * @type {goog.vec.Vec3.Type}
 * @ignore
 */
chesterGL.MoveAction.__tmp_pos = goog.vec.Vec3.createFloat32();

/**
 * @param {number} delta miliseconds from last time we updated
 * @ignore
 */
chesterGL.MoveAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	var block = this.block,
		t = Math.min(1, this.elapsed / this.totalTime),
		pos = chesterGL.MoveAction.__tmp_pos;
	goog.vec.Vec3.lerp(this.startPosition, this.finalPosition, t, pos);
	// console.log([this.startPosition[2], pos[2], t, this.elapsed, this.totalTime].join('\t'));
	block.setPosition(pos[0], pos[1], pos[2]);
};

/**
 * just set the initial position
 * @ignore
 */
chesterGL.MoveAction.prototype.begin = function () {
	chesterGL.Action.prototype.begin.call(this);
	if (!this.block) {
		throw "invalid move action! - no block";
	}
	if (this.isRelative) {
		goog.vec.Vec3.add(this.delta, this.block.position, this.finalPosition);
	} else {
		goog.vec.Vec3.setFromArray(this.finalPosition, this.delta);
	}
	goog.vec.Vec3.setFromArray(this.startPosition, this.block.position);
};

/**
 * @ignore
 */
chesterGL.MoveAction.prototype.stop = function () {
	chesterGL.Action.prototype.stop.call(this);
	if (this.elapsed >= this.totalTime) {
		this.block.setPosition(this.finalPosition);
	}
};

/**
 * Return a new action with the reverse move action
 * @return {chesterGL.MoveAction}
 */
chesterGL.MoveAction.prototype.reverse = function () {
	if (!this.isRelative) {
		throw "This only works on relative movements";
	}
	var revDelta = [];
	goog.vec.Vec3.negate(this.delta, revDelta);
	return new chesterGL.MoveAction(revDelta, this.totalTime, true);
};

/**
 * A simple action that will execute the callback, useful for
 * sequences, e.g.: move, then execute some callback.
 * @constructor
 * @extends {chesterGL.Action}
 * @param {function (Object=)} callback the callback to be executed
 * @param {number=} delay Do not call inmediately, but after delay milliseconds. Pass zero for calling immediately.
 * @param {Object=} arg the object to be passed as argument to the
 * callback.
 * @example
 * // move 100 points up in 0.5 seconds (500 milliseconds)
 * var move = new chesterGL.MoveAction([0, 100, 0], 500);
 * var remove = new chesterGL.CallbackAction(function () {
 *	this.remove();
 * }, 0, someBlock);
 */
chesterGL.CallbackAction = function (callback, delay, arg) {
	this.callback = callback;
	this.arg = arg;
	chesterGL.Action.call(this, delay || 1);
};
goog.inherits(chesterGL.CallbackAction, chesterGL.Action);

/**
 * The callback
 * @type {?function (Object=)}
 */
chesterGL.CallbackAction.prototype.callback = null;

/**
 * The object that can be used as `this` inside the callback.
 * @type {Object|undefined}
 */
chesterGL.CallbackAction.prototype.arg = null;

chesterGL.CallbackAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	if (this.finished) {
		this.callback.call(null, this.arg);
	}
};

/**
 * @constructor
 * @param {chesterGL.Action} action1 the first action
 * @param {chesterGL.Action} action2 the second action
 * @extends {chesterGL.Action}
 * @example
 * var a1 = new chesterGL.MoveAction([100, 100, 0], 5000);
 * var a2 = a1.reverse();
 * var seq = new chesterGL.SequenceAction(a1, a2);
 * block.runAction(seq);
 */
chesterGL.SequenceAction = function (action1, action2) {
	var totalTime = (action1.totalTime + action2.totalTime);
	chesterGL.Action.call(this, totalTime);
	this.actions = [action1, action2];
};
goog.inherits(chesterGL.SequenceAction, chesterGL.Action);

/**
 * @param {...chesterGL.Action} actions The list of actions to use in order to create the sequence
 * @return {chesterGL.Action}
 */
chesterGL.SequenceAction.createSequence = function (actions) {
	if (arguments.length === 0) {
		throw "Needs at least one action to create a sequence!";
	}
	var prev = arguments[0];
	for (var i=1; i < arguments.length; i++) {
		prev = new chesterGL.SequenceAction(prev, arguments[i]);
	}
	return prev;
};

/**
 * @type {Array.<chesterGL.Action>}
 * @ignore
 */
chesterGL.SequenceAction.prototype.actions = null;

/**
 * What action are we running
 * @type {number}
 */
chesterGL.SequenceAction.prototype.currentAction = 0;

/**
 * where to start executing the next action
 * @type {number}
 * @ignore
 */
chesterGL.SequenceAction.prototype.splitTime = 0.0;

/**
 * just mark the split time (the duration of the first action)
 * @ignore
 */
chesterGL.SequenceAction.prototype.begin = function () {
	chesterGL.Action.prototype.begin.call(this);
	this.splitTime = this.actions[0].totalTime;
	this.block.runAction(this.actions[0]);
	// console.log("[seq begin] setting split time: " + this.splitTime);
};

/**
 * resets the sequence action (will also reset and unschedule its internal actions)
 */
chesterGL.SequenceAction.prototype.reset = function () {
	chesterGL.Action.prototype.reset.call(this);
	this.currentAction = 0;
	this.actions[0].reset();
	this.actions[1].reset();
	chesterGL.ActionManager.unscheduleAction(this.actions[0].actionId);
	chesterGL.ActionManager.unscheduleAction(this.actions[1].actionId);
};

/**
 * propagate update to the corresponding action
 * @ignore
 */
chesterGL.SequenceAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	if (this.currentAction === 0 && this.elapsed >= this.splitTime) {
		// console.log("switching actions (" + this.actions[1].totalTime + "," + this.actions[1].elapsed + ")");
		this.actions[0].stop();
		this.currentAction = 1;
		this.block.runAction(this.actions[1]);
	}
};

/**
 * @constructor
 * @param {chesterGL.Action} action
 * @param {number=} maxTimes The number of times an action should be repeated (-1 for infinity). Defaults to 1
 * @extends {chesterGL.Action}
 */
chesterGL.RepeatAction = function (action, maxTimes) {
	this.maxTimes = maxTimes || 1;
	this.times = 0;
	this.action = action;
	chesterGL.Action.call(this, action.totalTime);
};
goog.inherits(chesterGL.RepeatAction, chesterGL.Action);

/**
 * the total number of times the action needs to be executed
 * @type {number}
 * @ignore
 */
chesterGL.RepeatAction.prototype.maxTimes = 0;

/**
 * the current number of times the action has been executed
 * @type {number}
 * @ignore
 */
chesterGL.RepeatAction.prototype.times = 0;

/**
 * The action to be repeated
 * @type {chesterGL.Action}
 * @ignore
 */
chesterGL.RepeatAction.prototype.action = null;

/**
 * @ignore
 */
chesterGL.RepeatAction.prototype.begin = function () {
	chesterGL.Action.prototype.begin.call(this);
	chesterGL.ActionManager.scheduleAction(this.action);
};

/**
 * @ignore
 * @param {number} delta
 */
chesterGL.RepeatAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	if (this.finished) {
		// console.log("repeat finished");
		if (this.maxTimes < 0 || this.times < this.maxTimes) {
			// console.log("repeating action");
			this.times++;
			this.reset();
			chesterGL.ActionManager.unscheduleAction(this.action.actionId);
			this.action.reset();
			this.begin();
		}
	}
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
	this.delay = delay;
	var totalTime = delay * frames.length;
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
 * @constructor
 * Will rotate the block using a sin(t) function with the given
 * Amplitude.
 *
 * @param {number} amplitude in radians of the wiggle
 * @param {number} cycles the total number of cycles
 * @param {number} totalTime the total duration (in milliseconds)
 * @param {chesterGL.Block=} block The block that will receive this action
 * @extends {chesterGL.Action}
 */
chesterGL.WiggleAction = function (amplitude, cycles, totalTime, block) {
	this.amplitude = amplitude;
	this.cycles = cycles;
	chesterGL.Action.call(this, totalTime, block);
};
goog.inherits(chesterGL.WiggleAction, chesterGL.Action);

/**
 * @type {number} the amplitude of the wiggle
 */
chesterGL.WiggleAction.prototype.amplitude = 0;

/**
 * @type {number} the number of cycles of the wiggle
 */
chesterGL.WiggleAction.prototype.cycles = 0;

/**
 * @param {number} delta
 * @ignore
 */
chesterGL.WiggleAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	if (!this.finished) {
		// t' = t * cycles * 2 * PI / duration
		var _t = this.elapsed / 1000.0 * this.cycles * 2 * Math.PI / (this.totalTime / 1000.0);
		var sin = Math.sin(_t);
		// console.log("sin: " + sin + " - " + this.elapsed + " - " + t);
		this.block.setRotation(this.amplitude * sin);
	} else {
		// reset rotation
		this.block.setRotation(0);
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
 * @type {Array.<chesterGL.Action>}
 * @ignore
 */
chesterGL.ActionManager.scheduledActionsToBeRemoved_ = [];

/**
 * @type {number}
 * @ignore
 */
chesterGL.ActionManager.internalIdCounter_ = 0;

/**
 * adds an action to the scheduler
 *
 * @param {chesterGL.Action} action
 * @return {number} the actionId of the recently scheduled action
 */
chesterGL.ActionManager.scheduleAction = function (action) {
	chesterGL.ActionManager.scheduledActions_.push(action);
	action.actionId = chesterGL.ActionManager.internalIdCounter_++;
	action.begin();
	return action.actionId;
};

/**
 * removes an action of the manager
 * @param {number} actionId
 */
chesterGL.ActionManager.unscheduleAction = function (actionId) {
	var len = chesterGL.ActionManager.scheduledActions_.length;
	for (var i=0; i < len; i++) {
		var a = chesterGL.ActionManager.scheduledActions_[i];
		if (a.actionId == actionId) {
			chesterGL.ActionManager.scheduledActionsToBeRemoved_.push(a);
			return;
		}
	}
};

/**
 * Iterate over all scheduled actions
 * @param {number} delta number of miliseconds to run in all actions
 * @ignore
 */
chesterGL.ActionManager.tick = function (delta) {
	var i = 0,
		len = chesterGL.ActionManager.scheduledActions_.length,
		a = null;
	for (i=0; i < len; i++) {
		a = chesterGL.ActionManager.scheduledActions_[i];
		if (a.running) a.update(delta);
		if (a.finished) {
			chesterGL.ActionManager.scheduledActionsToBeRemoved_.push(a);
		}
	}
	// remove finished actions
	while((a = chesterGL.ActionManager.scheduledActionsToBeRemoved_.pop())) {
		var idx = chesterGL.ActionManager.scheduledActions_.indexOf(a);
		if (idx >= 0) {
			chesterGL.ActionManager.scheduledActions_.splice(idx, 1);
		}
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
goog.exportSymbol('chesterGL.MoveAction', chesterGL.MoveAction);
goog.exportSymbol('chesterGL.CallbackAction', chesterGL.CallbackAction);
goog.exportSymbol('chesterGL.SequenceAction', chesterGL.SequenceAction);
goog.exportSymbol('chesterGL.RepeatAction', chesterGL.RepeatAction);
goog.exportSymbol('chesterGL.AnimateAction', chesterGL.AnimateAction);
goog.exportSymbol('chesterGL.WiggleAction', chesterGL.WiggleAction);
goog.exportProperty(chesterGL.ActionManager, 'scheduleAction', chesterGL.ActionManager.scheduleAction);
goog.exportProperty(chesterGL.ActionManager, 'unscheduleAction', chesterGL.ActionManager.unscheduleAction);
goog.exportProperty(chesterGL.SequenceAction, 'createSequence', chesterGL.SequenceAction.createSequence);
goog.exportProperty(chesterGL.Block.prototype, 'runAction', chesterGL.Block.prototype.runAction);
goog.exportProperty(chesterGL.Action.prototype, 'stop', chesterGL.Action.prototype.stop);
goog.exportProperty(chesterGL.MoveAction.prototype, 'stop', chesterGL.MoveAction.prototype.stop);
goog.exportProperty(chesterGL.SequenceAction.prototype, 'stop', chesterGL.SequenceAction.prototype.stop);
goog.exportProperty(chesterGL.RepeatAction.prototype, 'stop', chesterGL.RepeatAction.prototype.stop);
goog.exportProperty(chesterGL.MoveAction.prototype, 'reverse', chesterGL.MoveAction.prototype.reverse);
