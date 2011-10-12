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
	var Block = ChesterGL['Block'];
	
	/**
	 * @name Action
	 * @class
	 * @constructor
	 */
	var Action = function () {};
	
	/**
	 * The block to which this action will be applied
	 * 
	 * @type {?Block}
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
	 * The current time of the action
	 * @type {number}
	 */
	Action.prototype.currentTime = 0;
	
	/**
	 * This is the default delta function (does nothing)
	 * @param {number} delta
	 */
	Action.prototype.update = function (delta) {
	};
	
	/**
	 * Creates an action with a block
	 *
	 * @param {Block} block
	 * @param {number=} totalTime
	 */
	Action.create = function (block, totalTime) {
		var a = new Action();
		a.block = block;
		a.totalTime = totalTime;
		
		return a;
	}
	
	/**
	 * @name MoveAction
	 * @class
	 * @constructor
	 */
	var MoveAction = function () {};
	
	/**
	 * @type {Object.<string,number>}
	 */
	MoveAction.prototype.finalPosition = null;
	
	MoveAction.prototype.update = function (delta) {
		
	}
	
	MoveAction.create = Action.create;
	ChesterGL.extend(MoveAction.prototype, Action.prototype);
	
	/**
	 * @name ActionManager
	 * @class
	 * @constructor
	 */
	var ActionManager = function () {};
})(window);
