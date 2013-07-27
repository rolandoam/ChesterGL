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
 */

/**
 * @fileoverview Externs for ChesterGL
 *
 * @see https://github.com/funkaster/ChesterGL
 * @externs
 */

// external - request animation frame for different browsers and window.WebGLDebugUtils

/**
 * @namespace
 */
var WebGLDebugUtils;

/**
 * Stats.js
 * @constructor
 */
var Stats = function () {};

/**
 * runScript
 */
var runScript = function () {};

/**
 * @type {number}
 */
var innerWidth;

/**
 * @type {number}
 */
var innerHeight;

/**
 * @param {number} w
 * @param {number} h
 * @constructor
 * @extends {HTMLElement}
 */
var ChesterCanvas = function (w,h) {};

/**
 * @param {function(Object)} callback
 */
var _touchBeganListeners = function (callback) {};

/**
 * @param {function(Object)} callback
 */
var _touchMovedListeners = function (callback) {};

/**
 * @param {function(Object)} callback
 */
var _touchEndedListeners = function (callback) {};

// these are native implementations of the goog.vec.mat4 functions

/**
 * @param {goog.vec.Mat4.AnyType} mat0
 * @param {goog.vec.Mat4.AnyType} mat1
 * @param {goog.vec.Mat4.AnyType=} out
 * @return {goog.vec.Mat4.AnyType}
 */
var _mat4mul = function (mat0, mat1, out) {};

/**
 * @param {goog.vec.Mat4.AnyType} mat
 * @param {goog.vec.Vec3.AnyType} vec
 * @param {goog.vec.Vec3.AnyType=} out
 * @return {goog.vec.Vec3.AnyType}
 */
var _mat4mulvec3 = function (mat, vec, out) {};

/**
 * @param {goog.vec.Mat4.AnyType} mat
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @return {goog.vec.Mat4.AnyType}
 */
var _mat4translate = function (mat, x, y, z) {};

/**
 * @param {goog.vec.Mat4.AnyType} mat
 * @param {number} angle
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @return {goog.vec.Mat4.AnyType}
 */
var _mat4rotate = function (mat, angle, x, y, z) {};

/**
 * @param {goog.vec.Mat4.AnyType} mat
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @return {goog.vec.Mat4.AnyType}
 */
var _mat4scale = function (mat, x, y, z) {};

/**
 * @param {WebGLRenderingContext} ctx
 * @param {function(Object, string, Object)=} callback
 * @return {WebGLRenderingContext}
 */
WebGLDebugUtils.makeDebugContext = function (ctx, callback) {};

/**
 * @param {number} err
 * @return {string}
 */
WebGLDebugUtils.glEnumToString = function (err) {};

/**
 * @param {number} width
 * @param {number} height
 * @constructor
 */
var FakeCanvas = function (width, height) {};

/**
 * @param {number} requestId
 */
var cancelAnimationFrame = function (requestId) {};
