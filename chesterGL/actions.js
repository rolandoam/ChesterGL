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
 * true if the action has ended
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
	if (this.totalTime >= 0 && this.elapsed >= this.totalTime) {
		this.stop();
	}
};

/**
 * sets the time for the action
 * @param {number} time
 */
chesterGL.Action.prototype.setTotalTime = function (time) {
	if (!this.running) {
		this.totalTime = time;
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
 * pause the action
 */
chesterGL.Action.prototype.pause = function () {
	this.running = false;
};

/**
 * resume the action
 */
chesterGL.Action.prototype.resume = function () {
	this.running = true;
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
 * @constructor
 * @param {number} scaleX The final scale in the X axis
 * @param {number} scaleY The final scale in the Y axis
 * @param {number} totalTime The total time in seconds that this action should take
 * @param {boolean=} relative whether or not the scaling is relative (defaults: true)
 * @param {chesterGL.Block=} block The block that will execute this action
 * @extends {chesterGL.Action}
 */
chesterGL.ScaleAction = function (scaleX, scaleY, totalTime, relative, block) {
	chesterGL.Action.call(this, totalTime, block);
	this.isRelative = relative;
	this.dx = scaleX;
	this.dy = scaleY;
	this.finalScaleX = 0;
	this.finalScaleY = 0;
	this.startScaleX = 0;
	this.startScaleY = 0;
};
goog.inherits(chesterGL.ScaleAction, chesterGL.Action);

/**
 * @ignore
 */
chesterGL.ScaleAction.prototype.begin = function() {
	goog.base(this, "begin");
	if (!this.block) {
		throw "invalid scale action - no block provided";
	}
	if (this.isRelative) {
		this.finalScaleX = this.block.scaleX + this.dx;
		this.finalScaleY = this.block.scaleY + this.dy;
	} else {
		this.finalScaleX = this.dx;
		this.finalScaleY = this.dy;
	}
	this.startScaleX = this.block.scaleX;
	this.startScaleY = this.block.scaleY;
};

/**
 * @param {number} delta miliseconds from last time we updated
 * @ignore
 */
chesterGL.ScaleAction.prototype.update = function (delta) {
	goog.base(this, "update", delta);
	var block = this.block,
		t = Math.min(1, this.elapsed / this.totalTime),
		scaleX = this.startScaleX + t * (this.finalScaleX - this.startScaleX),
		scaleY = this.startScaleY + t * (this.finalScaleY - this.startScaleY);
	block.setScale(scaleX, scaleY);
};

/**
 * @ignore
 */
chesterGL.ScaleAction.prototype.stop = function () {
	goog.base(this, "stop");
	if (this.elapsed >= this.totalTime) {
		this.block.setScale(this.finalScaleX, this.finalScaleY);
	}
};

chesterGL.ScaleAction.prototype.reset = function() {
	goog.base(this, "reset");
};

/**
 * Return a new action with the reverse scale action
 * @return {chesterGL.ScaleAction}
 */
chesterGL.ScaleAction.prototype.reverse = function () {
	if (!this.isRelative) {
		throw "This only works on relative movements";
	}
	return new chesterGL.ScaleAction(-this.dx, -this.dy, this.totalTime, true);
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
	chesterGL.Action.call(this, delay || 0);
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
 * @param {...chesterGL.Action} actions an array of actions
 * @extends {chesterGL.Action}
 * @example
 * var a1 = new chesterGL.MoveAction([100, 100, 0], 5000);
 * var a2 = a1.reverse();
 * var seq = new chesterGL.SequenceAction(a1, a2);
 * block.runAction(seq);
 */
chesterGL.SequenceAction = function (actions) {
	if (arguments.length < 1) {
		throw "you need at least one action to create a sequence";
	}
	var totalTime = 0;
	this.actions = [];
	for (var i in arguments) {
		totalTime += arguments[i].totalTime;
		this.actions.push(arguments[i]);
	}
	this.nextStop = this.actions[0].totalTime;
	goog.base(this, totalTime);
};
goog.inherits(chesterGL.SequenceAction, chesterGL.Action);

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
 * just mark the split time (the duration of the first action)
 * @ignore
 */
chesterGL.SequenceAction.prototype.begin = function () {
	goog.base(this, "begin");
	this.nextStop = this.actions[0].totalTime;
	this.actions[0].block = this.block;
	this.actions[0].begin();
	// console.log("[seq begin] setting split time: " + this.splitTime);
};

/**
 * resets the sequence action (will also reset and unschedule its internal actions)
 */
chesterGL.SequenceAction.prototype.reset = function () {
	goog.base(this, "reset");
	this.currentAction = 0;
	this.nextStop = this.actions[0].totalTime;
	this.totalTime = 0;
	for (var i=0; i < this.actions.length; i++) {
		this.actions[i].reset();
		this.totalTime += this.actions[i].totalTime;
	}
};

/**
 * propagate update to the corresponding action
 * @ignore
 */
chesterGL.SequenceAction.prototype.update = function (delta) {
	goog.base(this, "update", delta);
	var current = this.actions[this.currentAction];
	current.update(delta);
	if (this.elapsed >= this.nextStop) {
		if (!current.finished) {
			// force the action to finish
			current.update(1000);
		}
		/**
		 * execute the next action:
		 * 1) increment currentAction
		 * 2) while there are any actions left, pick the next
		 * 3) init the new current action (set block & begin)
		 * 4) increment the nextStop pointer
		 * 5) if the current action is not instant (totalTime != 0), then break the loop
		 * 6) execute the current action (update(1), any delta will do since totalTime == 0)
		 * 6.5) if the currentAction == 0 then break: the update might've reset the sequence
		 * 7) repeat the loop (2)
		 */
		this.currentAction++;
		while (this.currentAction < this.actions.length) {
			current = this.actions[this.currentAction];
			current.block = this.block;
			current.begin();
			this.nextStop += current.totalTime;
			if (current.totalTime > 0) {
				break;
			}
			current.update(1);
			if (this.currentAction === 0) {
				break;
			}
			this.currentAction += 1;
		}
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
	this.action.block = this.block;
	this.action.begin();
};

/**
 * @ignore
 * @param {number} delta
 */
chesterGL.RepeatAction.prototype.update = function (delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	this.action.update(delta);
	if (this.finished && this.action.finished) {
		if (this.maxTimes < 0 || this.times < this.maxTimes) {
			this.times++;
			this.reset();
			this.action.reset();
			this.begin();
		}
	}
};

/**
 * @constructor
 * Flexible action, that will change linearly in time a numeric property
 * @param {string|Object} param the paramenter to modify in the block. You can also pass an object
 * to specify a getter/setter instead.
 * @param {number} targetValue
 * @param {number} totalTime the total time of the action, in milliseconds
 * @param {chesterGL.Block=} block the block on which to run the action
 * @extends {chesterGL.Action}
 */
chesterGL.ParametricAction = function (param, targetValue, totalTime, block) {
	chesterGL.Action.call(this, totalTime, block);
	this.param = param;
	this.targetValue = targetValue;
	this.hasGetterAndSetter = (typeof param === "object");
};
goog.inherits(chesterGL.ParametricAction, chesterGL.Action);

/** @ignore */
chesterGL.ParametricAction.prototype.begin = function ParametricAction_begin() {
	chesterGL.Action.prototype.begin.call(this);
	if (this.hasGetterAndSetter) {
		this.initialValue = this.block[this.param['getter']]();
	} else {
		var iv = this.block[this.param];
		if (!iv) {
			throw "Invalid ElasticAction param!";
		}
		this.initialValue = iv;
	}
};

/** @ignore */
chesterGL.ParametricAction.prototype.update = function ParametricAction_update(delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	var t = Math.min(1, this.elapsed / this.totalTime),
		b = this.block;
	var newv = this.initialValue + t * (this.targetValue - this.initialValue);
	if (this.hasGetterAndSetter) {
		b[this.param['setter']].call(b, newv);
	} else {
		b[this.param] = newv;
	}
};

/**
 * @constructor
 * This is not really "elastic", It's applying a bezier-curve to transform the parameter in an
 * elastic-like curve. The current curve is:
 *
 * y(t)=(1-t)^3*0.5+3(1-t)^2*t*0.06+3*(1-t)*t^2*2.2+t^3*1.5 - 0.5
 *
 * Q0 = 0.5; Q1 = 0.06; Q2 = 2.2; Q3 = 1.5
 * Google graph: http://goo.gl/p0DKc
 *
 * The function is shifted in 0.5 to simulate a bounce at the beginning as well. This will only
 * work if the parameter to modify is either an array or a number.
 *
 * @param {string|Object} param the paramenter to modify in the block. You can also pass an object
 * to specify a getter/setter instead.
 * @param {Array|number} targetValue the target value of the parameter
 * @param {number} totalTime the totalTime of the action, in milliseconds
 * @param {chesterGL.Block=} block the block on which to run the action
 * @extends {chesterGL.Action}
 */
chesterGL.ElasticAction = function (param, targetValue, totalTime, block) {
	chesterGL.Action.call(this, totalTime, block);
	this.param = param;
	this.targetValue = targetValue;
	this.hasGetterAndSetter = (typeof param === "object");
};
goog.inherits(chesterGL.ElasticAction, chesterGL.Action);

/** @ignore */
chesterGL.ElasticAction.prototype.begin = function ElasticAction_begin() {
	chesterGL.Action.prototype.begin.call(this);
	var iv;
	if (this.hasGetterAndSetter) {
		iv = this.block[this.param['getter']]();
	} else {
		iv = this.block[this.param];
		if (!iv) {
			throw "Invalid ElasticAction param!";
		}
	}
	this.arrayLike = false;
	if (iv instanceof Array) {
		this.initialValue = iv.slice(0);
		this.arrayLike = true;
	} else if (iv instanceof Float32Array) {
		this.initialValue = new Float32Array(iv);
		this.arrayLike = true;
	} else {
		// assume number
		this.initialValue = iv;
	}
};

// TODO:
// make the f(t) an argument, so we can update f(t) any way we want
/** @ignore */
chesterGL.ElasticAction.prototype.update = function ElasticAction_update(delta) {
	chesterGL.Action.prototype.update.call(this, delta);
	var t = Math.min(1, this.elapsed / this.totalTime),
		fakeT = Math.pow(1-t,3)*0.5+3*Math.pow(1-t,2)*t*0.06+3*(1-t)*Math.pow(t,2)*2.2+Math.pow(t,3)*1.5 - 0.5,
		b = this.block;
	// now simply interpolate using the new `t`
	if (this.arrayLike) {
		var tmp = [],
			tpLen = this.initialValue.length;
		for (var i=0; i < tpLen; i++) {
			tmp[i] = this.initialValue[i] + fakeT * (this.targetValue[i] - this.initialValue[i]);
		}
		if (this.hasGetterAndSetter) {
			b[this.param['setter']].apply(b, tmp);
		} else {
			b[this.param] = tmp;
		}
	} else {
		var newv = this.initialValue + fakeT * (this.targetValue - this.initialValue);
		if (this.hasGetterAndSetter) {
			b[this.param['setter']].call(b, newv);
		} else {
			b[this.param] = newv;
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
 * @type {Object.<number, chesterGL.Action>}
 * @private
 */
chesterGL.ActionManager.scheduledActions_ = {};

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
	if (!action.actionId || !chesterGL.ActionManager.scheduledActions_.hasOwnProperty(action.actionId)) {
		action.actionId = chesterGL.ActionManager.internalIdCounter_++;
		chesterGL.ActionManager.scheduledActions_[action.actionId] = action;
	}
	action.begin();
	return action.actionId;
};

/**
 * removes an action of the manager
 * @param {number} actionId
 */
chesterGL.ActionManager.unscheduleAction = function (actionId) {
	if (chesterGL.ActionManager.scheduledActions_.hasOwnProperty(actionId)) {
		delete chesterGL.ActionManager.scheduledActions_[actionId];
	}
};

/**
 * Iterate over all scheduled actions
 * @param {number} delta number of miliseconds to run in all actions
 * @ignore
 */
chesterGL.ActionManager.tick = function (delta) {
	if (chesterGL.ActionManager.paused) {
		return;
	}
	for (var i in chesterGL.ActionManager.scheduledActions_) {
		var a = chesterGL.ActionManager.scheduledActions_[/** @type{number} */(i)];
		if (a.running) a.update(delta);
		if (a.finished) {
			delete chesterGL.ActionManager.scheduledActions_[a.actionId];
		}
	}
};

/**
 * pauses all actions (basically just skip the tick)
 */
chesterGL.ActionManager.pause = function ActionManager_pause() {
	chesterGL.ActionManager.paused = true;
};

/**
 * resumes all actions
 */
chesterGL.ActionManager.resume = function ActionManager_resume() {
	chesterGL.ActionManager.paused = false;
};

/**
 * schedules an action to be run over this block
 * @param {chesterGL.Action} action
 * @return {number} the action id (to unschedule it if you want)
 */
chesterGL.Block.prototype.runAction = function (action) {
	action.block = this;
	return chesterGL.ActionManager.scheduleAction(action);
};

/**
 * removes all actions associated with this block
 */
chesterGL.Block.prototype.removeAllActions = function Block_removeAllActions() {
	for (var i in chesterGL.ActionManager.scheduledActions_) {
		var a = chesterGL.ActionManager.scheduledActions_[/** @type{number} */(i)];
		if (a.block == this) {
			chesterGL.ActionManager.unscheduleAction(a.actionId);
		}
	}
};

goog.exportSymbol('chesterGL.ActionManager', chesterGL.ActionManager);
goog.exportSymbol('chesterGL.MoveAction', chesterGL.MoveAction);
goog.exportSymbol('chesterGL.ScaleAction', chesterGL.ScaleAction);
goog.exportSymbol('chesterGL.CallbackAction', chesterGL.CallbackAction);
goog.exportSymbol('chesterGL.SequenceAction', chesterGL.SequenceAction);
goog.exportSymbol('chesterGL.RepeatAction', chesterGL.RepeatAction);
goog.exportSymbol('chesterGL.AnimateAction', chesterGL.AnimateAction);
goog.exportSymbol('chesterGL.WiggleAction', chesterGL.WiggleAction);
goog.exportSymbol('chesterGL.ElasticAction', chesterGL.ElasticAction);
goog.exportSymbol('chesterGL.ParametricAction', chesterGL.ParametricAction);
goog.exportProperty(chesterGL.ActionManager, 'scheduleAction', chesterGL.ActionManager.scheduleAction);
goog.exportProperty(chesterGL.ActionManager, 'unscheduleAction', chesterGL.ActionManager.unscheduleAction);
goog.exportProperty(chesterGL.ActionManager, 'pause', chesterGL.ActionManager.pause);
goog.exportProperty(chesterGL.ActionManager, 'resume', chesterGL.ActionManager.resume);
goog.exportProperty(chesterGL.Block.prototype, 'runAction', chesterGL.Block.prototype.runAction);
goog.exportProperty(chesterGL.Action.prototype, 'stop', chesterGL.Action.prototype.stop);
goog.exportProperty(chesterGL.Action.prototype, 'reset', chesterGL.Action.prototype.reset);
goog.exportProperty(chesterGL.Action.prototype, 'begin', chesterGL.Action.prototype.begin);
goog.exportProperty(chesterGL.Action.prototype, 'pause', chesterGL.Action.prototype.pause);
goog.exportProperty(chesterGL.Action.prototype, 'resume', chesterGL.Action.prototype.resume);
goog.exportProperty(chesterGL.Action.prototype, 'setTotalTime', chesterGL.Action.prototype.setTotalTime);
goog.exportProperty(chesterGL.MoveAction.prototype, 'reverse', chesterGL.MoveAction.prototype.reverse);
goog.exportProperty(chesterGL.ScaleAction.prototype, 'reverse', chesterGL.ScaleAction.prototype.reverse);
