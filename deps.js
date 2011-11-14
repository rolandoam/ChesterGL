/**
 * @preserve ChesterGL - Simple 2D WebGL demo/library
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
 */

/**
 * @fileoverview Externs for ChesterGL
 *
 * @see https://github.com/funkaster/ChesterGL
 * @externs
 */

/** @type {Object} */
var ChesterGL = {};

/**
 * creates a new block. Pass the rect if you want to set the frame at
 * creation time.
 * 
 * @constructor
 * @param {Object.<string,number>|string=} rect
 * @param {number=} type
 * @param {ChesterGL.Block=} parent
 */
ChesterGL.Block = function (rect, type, parent) {};

/**
 * creates a new block group
 * 
 * @constructor
 * @extends ChesterGL.Block
 * @param {string} texture An optional texture that will be shared with all children
 * @param {number=} noChildren The optional initial number of maxChidlren. Defaults to 10
 */
ChesterGL.BlockGroup = function (texture, noChildren) {};

/**
 * @namespace
 */
ChesterGL.BlockFrames;

/**
 * @typedef {{frame, texture}}
 */
ChesterGL.BlockFrames.frameType;

/**
 * @constructor
 * @extends ChesterGL.Block
 * @param {string} tmxFile
 */
ChesterGL.TMXBlock = function (tmxFile) {};

/**
 * @constructor
 * @param {ChesterGL.Block} block
 * @param {number=} totalTime
 */
ChesterGL.Action = function (block, totalTime) {};

/**
 * @constructor
 * @extends ChesterGL.Action
 * @param {ChesterGL.Block} block
 * @param {number} totalTime
 * @param {vec3} finalPosition
 */
ChesterGL.MoveToAction = function (block, totalTime, finalPosition) {};



// external - request animation frame for different browsers and base64

/**
 * @param {function()} callback
 * @param {Element=} element
 */
window.requestAnimationFrame = function (callback, element) {};

/**
 * @param {function()} callback
 * @param {Element=} element
 */
window.webkitRequestAnimationFrame = function (callback, element) {};

/**
 * @param {function()} callback
 * @param {Element=} element
 */
window.mozRequestAnimationFrame = function (callback, element) {};

/**
 * @param {function()} callback
 * @param {Element=} element
 */
window.oRequestAnimationFrame = function (callback, element) {};

/**
 * @param {function()} callback
 * @param {Element=} element
 */
window.msRequestAnimationFrame = function (callback, element) {};
