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

define(["require", "glmatrix", "chester/util"], function (require, glmatrix, util) {
	/**
	 * @constructor
	 * @param {number} totalTime in milliseconds
	 * @param {Block=} block The target block
	 */
	var Action = function (totalTime, block) {
		this.totalTime = totalTime;
		this.block = block;
		this.elapsed = 0;
	};

	/**
	 * The internal action id, useful to unschedule an action. It's only
	 * valid after scheduling an action.
	 * @type {number}
	 */
	Action.prototype.actionId = 0;

	/**
	 * The block to which this action will be applied
	 *
	 * @type {Block|null|undefined}
	 */
	Action.prototype.block = null;

	/**
	 * The total time in seconds this action should take
	 * (might not be relevant for all actions)
	 *
	 * @type {number}
	 */
	Action.prototype.totalTime = 0;

	/**
	 * Current time in seconds of the action
	 * (might not be relevant for all actions)
	 *
	 * @type {number}
	 */
	Action.prototype.elapsed = 0;

	/**
	 * true if the action has ended
	 * @type {boolean}
	 */
	Action.prototype.finished = false;

	/**
	 * is the action running?
	 * @type {boolean}
	 */
	Action.prototype.running = false;

	/**
	 * is there a next action?
	 * @type {Action?}
	 */
	Action.prototype.next = null;

	/**
	 * This is the default update function (does nothing)
	 * @param {number} delta
	 * @ignore
	 */
	Action.prototype.update = function (delta) {
		if (this.running) {
			this.elapsed += delta;
			if (this.totalTime >= 0 && this.elapsed >= this.totalTime) {
				this.stop();
				if (this.next) {
					this.block.runAction(this.next);
				}
			}
		}
	};

	/**
	 * sets the next action. Returns that action (chainable methods)
	 * @param {Action} action
	 * @return {Action}
	 */
	Action.prototype.setNext = function (action) {
		this.next = action;
		return action;
	};

	/**
	 * sets the time for the action
	 * @param {number} time
	 */
	Action.prototype.setTotalTime = function (time) {
		if (!this.running) {
			this.totalTime = time;
		}
	};

	/**
	 * will be called the first time - usually overriden by subclasses
	 * @ignore
	 */
	Action.prototype.begin = function () {
		this.running = true;
	};

	/**
	 * will be called at the end of the function (or to stop it)
	 */
	Action.prototype.stop = function () {
		this.finished = true;
		this.running = false;
	};

	/**
	 * pause the action
	 */
	Action.prototype.pause = function () {
		this.running = false;
	};

	/**
	 * resume the action
	 */
	Action.prototype.resume = function () {
		this.running = true;
	};

	/**
	 * is running?
	 * @return {boolean}
	 */
	Action.prototype.isRunning = function () {
		return this.running === true;
	};

	/**
	 * reset - prepare the action in order to use it again
	 * @ignore
	 */
	Action.prototype.reset = function () {
		this.running = false;
		this.finished = false;
		this.elapsed = 0;
		// reset in chain
		if (this.next) {
			this.next.reset();
		}
	};

	/**
	 * @constructor
	 * @param {Array|Float32Array} delta The final position (the initial position is the current one of the block)
	 * @param {number} totalTime The total time in seconds that this action should take
	 * @param {boolean=} relative whether or not the movement is relative (defaults: true)
	 * @param {Block=} block The block that will execute this action
	 * @extends {Action}
	 */
	var MoveAction = function (delta, totalTime, relative, block) {
		Action.call(this, totalTime, block);
		this.delta = glmatrix.vec3.clone(delta);
		if (relative !== undefined) {
			this.isRelative = (relative === true);
		} else {
			this.isRelative = true;
		}
		this.startPosition = glmatrix.vec3.create();
		this.finalPosition = glmatrix.vec3.create();
	};
	util.inherits(MoveAction, Action);

	/**
	 * @type {?glmatrix.vec3}
	 */
	MoveAction.prototype.delta = null;

	/**
	 * @type {?glmatrix.vec3}
	 */
	MoveAction.prototype.finalPosition = null;

	/**
	 * @type {boolean}
	 */
	MoveAction.prototype.isRelative = true;

	/**
	 * @type {?glmatrix.vec3}
	 */
	MoveAction.prototype.startPosition = null;

	/**
	 * @type {glmatrix.vec3}
	 * @ignore
	 */
	MoveAction.__tmp_pos = glmatrix.vec3.create();

	/**
	 * @param {number} delta miliseconds from last time we updated
	 * @ignore
	 */
	MoveAction.prototype.update = function (delta) {
		Action.prototype.update.call(this, delta);
		var block = this.block,
			t = Math.min(1, this.elapsed / this.totalTime),
			pos = MoveAction.__tmp_pos;
		glmatrix.vec3.lerp(pos, this.startPosition, this.finalPosition, t);
		// console.log([this.startPosition[2], pos[2], t, this.elapsed, this.totalTime].join('\t'));
		block.setPosition(pos[0], pos[1], pos[2]);
	};

	/**
	 * just set the initial position
	 * @ignore
	 */
	MoveAction.prototype.begin = function () {
		Action.prototype.begin.call(this);
		if (!this.block) {
			throw "invalid move action! - no block";
		}
		if (this.isRelative) {
			glmatrix.vec3.add(this.finalPosition, this.delta, this.block.position);
		} else {
			glmatrix.vec3.copy(this.finalPosition, this.delta);
		}
		glmatrix.vec3.copy(this.startPosition, this.block.position);
	};

	/**
	 * @ignore
	 */
	MoveAction.prototype.stop = function () {
		Action.prototype.stop.call(this);
		if (this.elapsed >= this.totalTime) {
			this.block.setPosition(this.finalPosition);
		}
	};

	/**
	 * Return a new action with the reverse move action
	 * @return {MoveAction}
	 */
	MoveAction.prototype.reverse = function () {
		if (!this.isRelative) {
			throw "This only works on relative movements";
		}
		var revDelta = [];
		glmatrix.vec3.negate(revDelta, this.delta);
		return new MoveAction(revDelta, this.totalTime, true);
	};


	/**
	 * @constructor
	 * @param {number} scaleX The final scale in the X axis
	 * @param {number} scaleY The final scale in the Y axis
	 * @param {number} totalTime The total time in seconds that this action should take
	 * @param {boolean=} relative whether or not the scaling is relative (defaults: true)
	 * @param {Block=} block The block that will execute this action
	 * @extends {Action}
	 */
	ScaleAction = function (scaleX, scaleY, totalTime, relative, block) {
		Action.call(this, totalTime, block);
		this.isRelative = relative;
		this.dx = scaleX;
		this.dy = scaleY;
		this.finalScaleX = 0;
		this.finalScaleY = 0;
		this.startScaleX = 0;
		this.startScaleY = 0;
	};
	util.inherits(ScaleAction, Action);

	/**
	 * @ignore
	 */
	ScaleAction.prototype.begin = function() {
		Action.prototype.begin.call(this);
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
	ScaleAction.prototype.update = function (delta) {
		Action.prototype.update.call(this, delta);
		var block = this.block,
			t = Math.min(1, this.elapsed / this.totalTime),
			scaleX = this.startScaleX + t * (this.finalScaleX - this.startScaleX),
			scaleY = this.startScaleY + t * (this.finalScaleY - this.startScaleY);
		block.setScale(scaleX, scaleY);
	};

	/**
	 * @ignore
	 */
	ScaleAction.prototype.stop = function () {
		Action.prototype.stop.call(this);
		if (this.elapsed >= this.totalTime) {
			this.block.setScale(this.finalScaleX, this.finalScaleY);
		}
	};

	/**
	 * Return a new action with the reverse scale action
	 * @return {ScaleAction}
	 */
	ScaleAction.prototype.reverse = function () {
		if (!this.isRelative) {
			throw "This only works on relative movements";
		}
		return new ScaleAction(-this.dx, -this.dy, this.totalTime, true);
	};


	/**
	 * A simple action that will execute the callback, useful for
	 * sequences, e.g.: move, then execute some callback.
	 * @constructor
	 * @extends {Action}
	 * @param {function (Object=)} callback the callback to be executed
	 * @param {number=} delay Do not call inmediately, but after delay milliseconds. Pass zero for calling immediately.
	 * @param {Object=} arg the object to be passed as argument to the
	 * callback.
	 * @example
	 * // move 100 points up in 0.5 seconds (500 milliseconds)
	 * var move = new MoveAction([0, 100, 0], 500);
	 * var remove = new CallbackAction(function () {
	 *	this.remove();
	 * }, 0, someBlock);
	 */
	CallbackAction = function (callback, delay, arg) {
		this.callback = callback;
		this.arg = arg;
		Action.call(this, delay || 0);
	};
	util.inherits(CallbackAction, Action);

	/**
	 * The callback
	 * @type {?function (Object=)}
	 */
	CallbackAction.prototype.callback = null;

	/**
	 * The object that can be used as `this` inside the callback.
	 * @type {Object|undefined}
	 */
	CallbackAction.prototype.arg = null;

	CallbackAction.prototype.update = function (delta) {
		Action.prototype.update.call(this, delta);
		if (this.finished) {
			this.callback.call(null, this.arg);
		}
	};

	/**
	 * @constructor
	 * @param {Action} action
	 * @param {number=} maxTimes The number of times an action should be repeated (-1 for infinity). Defaults to 1
	 * @extends {Action}
	 */
	RepeatAction = function (action, maxTimes) {
		this.maxTimes = maxTimes || 1;
		this.times = 0;
		this.action = action;
		var totalTime = action.totalTime;
		var nextAction = action.next;
		var counter = 1;
		while (nextAction) {
			totalTime += nextAction.totalTime;
			nextAction = nextAction.next;
			counter++;
			if (counter > 100) {
				console.log("**** too many sequencial actions");
				totalTime = 0;
				nextAction = null;
			}
		}
		Action.call(this, -1);
	};
	util.inherits(RepeatAction, Action);

	/**
	 * the total number of times the action needs to be executed
	 * @type {number}
	 * @ignore
	 */
	RepeatAction.prototype.maxTimes = 0;

	/**
	 * the current number of times the action has been executed
	 * @type {number}
	 * @ignore
	 */
	RepeatAction.prototype.times = 0;

	/**
	 * The action to be repeated
	 * @type {Action}
	 * @ignore
	 */
	RepeatAction.prototype.action = null;

	/**
	 * @ignore
	 */
	RepeatAction.prototype.begin = function () {
		Action.prototype.begin.call(this);
		// just start our action
		this.block.runAction(this.action);
	};

	/**
	 * @ignore
	 * @param {number} delta
	 */
	RepeatAction.prototype.update = function (delta) {
		Action.prototype.update.call(this, delta);
		// test whether this and all the chained actions are done
		var actionFinished = this.action.finished;
		var nextAction = this.action.next;
		while (nextAction && actionFinished) {
			actionFinished = actionFinished && nextAction.finished;
			nextAction = nextAction.next;
		}
		// if so, then reset them all and start this again
		if (actionFinished) {
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
	 * @param {Block=} block the block on which to run the action
	 * @extends {Action}
	 */
	ParametricAction = function (param, targetValue, totalTime, block) {
		Action.call(this, totalTime, block);
		this.param = param;
		this.targetValue = targetValue;
		this.hasGetterAndSetter = (typeof param === "object");
	};
	util.inherits(ParametricAction, Action);

	/** @ignore */
	ParametricAction.prototype.begin = function ParametricAction_begin() {
		Action.prototype.begin.call(this);
		if (this.hasGetterAndSetter) {
			if (typeof this.param['getter'] === "string") {
				this.initialValue = this.block[this.param['getter']]();
			} else {
				// assume it's a function
				this.initialValue = this.param['getter'].call(this.block);
			}
		} else {
			var iv = this.block[this.param];
			if (!iv) {
				throw "Invalid ElasticAction param!";
			}
			this.initialValue = iv;
		}
	};

	/** @ignore */
	ParametricAction.prototype.update = function ParametricAction_update(delta) {
		Action.prototype.update.call(this, delta);
		var t = Math.min(1, this.elapsed / this.totalTime),
			b = this.block;
		var newv = this.initialValue + t * (this.targetValue - this.initialValue);
		if (this.hasGetterAndSetter) {
			if (typeof this.param['setter'] === "string") {
				b[this.param['setter']].call(b, newv);
			} else {
				this.param['setter'].call(b, newv);
			}
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
	 * @param {Block=} block the block on which to run the action
	 * @extends {Action}
	 */
	ElasticAction = function (param, targetValue, totalTime, block) {
		Action.call(this, totalTime, block);
		this.param = param;
		this.targetValue = targetValue;
		this.hasGetterAndSetter = (typeof param === "object");
	};
	util.inherits(ElasticAction, Action);

	/** @ignore */
	ElasticAction.prototype.begin = function ElasticAction_begin() {
		Action.prototype.begin.call(this);
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
	ElasticAction.prototype.update = function ElasticAction_update(delta) {
		Action.prototype.update.call(this, delta);
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
	 * @param {Block=} block The block that will receive this action
	 * @extends {Action}
	 */
	AnimateAction = function (delay, frames, loop, block) {
		this.delay = delay;
		var totalTime = delay * frames.length;
		if (loop === true) totalTime = -1;
		Action.call(this, totalTime, block);
		this.shouldLoop = (loop === true);
		this.frames = frames.slice(0);
	};
	util.inherits(AnimateAction, Action);

	/**
	 * the current frame
	 * @type {number}
	 * @ignore
	 */
	AnimateAction.prototype.currentFrame = 0;

	/**
	 * The delay between frames
	 * @type {number}
	 * @ignore
	 */
	AnimateAction.prototype.delay = 0.0;

	/**
	 * The total frames of the animation
	 * @type {Array.<glmatrix.vec4>}
	 * @ignore
	 */
	AnimateAction.prototype.frames = null;

	/**
	 * Whether or not the animation should loop
	 * @type {boolean}
	 */
	AnimateAction.prototype.shouldLoop = false;

	/**
	 * @param {number} delta
	 * @ignore
	 */
	AnimateAction.prototype.update = function (delta) {
		Action.prototype.update.call(this, delta);
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
	 * @param {Block=} block The block that will receive this action
	 * @extends {Action}
	 */
	WiggleAction = function (amplitude, cycles, totalTime, block) {
		this.amplitude = amplitude;
		this.cycles = cycles;
		Action.call(this, totalTime, block);
	};
	util.inherits(WiggleAction, Action);

	/**
	 * @type {number} the amplitude of the wiggle
	 */
	WiggleAction.prototype.amplitude = 0;

	/**
	 * @type {number} the number of cycles of the wiggle
	 */
	WiggleAction.prototype.cycles = 0;

	/**
	 * @param {number} delta
	 * @ignore
	 */
	WiggleAction.prototype.update = function (delta) {
		Action.prototype.update.call(this, delta);
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
	var ActionManager = {};

	/**
	 * the list of scheduled actions
	 * @ignore
	 * @type {Object.<number, Action>}
	 * @private
	 */
	ActionManager.scheduledActions_ = {};

	/**
	 * @type {number}
	 * @ignore
	 */
	var _internalIdCounter = 0;

	/**
	 * adds an action to the scheduler
	 *
	 * @param {Action} action
	 * @return {number} the actionId of the recently scheduled action
	 */
	ActionManager.scheduleAction = function (action) {
		if (!action.actionId || !ActionManager.scheduledActions_.hasOwnProperty(action.actionId)) {
			action.actionId = _internalIdCounter++;
			ActionManager.scheduledActions_[action.actionId] = action;
		}
		action.begin();
		return action.actionId;
	};

	/**
	 * removes an action of the manager
	 * @param {number} actionId
	 */
	ActionManager.unscheduleAction = function (actionId) {
		if (ActionManager.scheduledActions_.hasOwnProperty(actionId)) {
			delete ActionManager.scheduledActions_[actionId];
		}
	};

	/**
	 * Iterate over all scheduled actions
	 * @param {number} delta number of miliseconds to run in all actions
	 * @ignore
	 */
	ActionManager.tick = function (delta) {
		if (ActionManager.paused) {
			return;
		}
		for (var i in ActionManager.scheduledActions_) {
			var a = ActionManager.scheduledActions_[i];
			if (a.running) a.update(delta);
			if (a.finished) {
				delete ActionManager.scheduledActions_[i];
			}
		}
	};

	/**
	 * pauses all actions (basically just skip the tick)
	 */
	ActionManager.pause = function ActionManager_pause() {
		ActionManager.paused = true;
	};

	/**
	 * resumes all actions
	 */
	ActionManager.resume = function ActionManager_resume() {
		ActionManager.paused = false;
	};

	var setup = function actions_setup(c) {
		var Block = require("chester/block");

		/**
		 * schedules an action to be run over this block
		 * @param {Action} action
		 * @return {number} the action id (to unschedule it if you want)
		 */
		Block.prototype.runAction = function (action) {
			action.block = this;
			return ActionManager.scheduleAction(action);
		};

		/**
		 * removes all actions associated with this block
		 */
		Block.prototype.removeAllActions = function Block_removeAllActions() {
			for (var i in ActionManager.scheduledActions_) {
				var a = ActionManager.scheduledActions_[/** @type{number} */(i)];
				if (a.block == this) {
					ActionManager.unscheduleAction(/** @type{number} */(i));
				}
			}
		};
	};


	return {
		"Base": Action,
		"Move": MoveAction,
		"Scale": ScaleAction,
		"Callback": CallbackAction,
		"Repeat": RepeatAction,
		"Parametric": ParametricAction,
		"Elastic": ElasticAction,
		"Animate": AnimateAction,
		"Wiggle": WiggleAction,
		"Manager": ActionManager,
		"setup": setup
	};
});
