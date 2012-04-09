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

goog.provide("chesterGL.LabelBlock");

goog.require("chesterGL.core");
goog.require("chesterGL.Block");

/**
 * creates a new Label Block. Label blocks internally use a canvas to render the text.
 * These blocks should not be used for high-frecuency updated labels, for that you
 * should use bitmap fonts (not yet supported) or an off-screen DOM element.
 * Use this for static elements, like dialogues, menus, etc.
 * 
 * @constructor
 * @param {string} text the string to render
 * @param {string=} font the name/family of the font, defaults to "sans-serif"
 * @param {string=} fontSize the size of the font, defaults to '20pt'
 * @param {goog.math.Size=} size the size of the container for the text. Defaults to the width of the text,
 * the height is approximage (rotating the letter m and measuring the width)
 * @extends {chesterGL.Block}
 */
chesterGL.LabelBlock = function (text, font, fontSize, size) {
	font = font || "sans-serif";
	fontSize = fontSize || "12pt";
	var canvas = document.createElement("canvas");
	this.canvas = canvas;
	var context = canvas.getContext('2d');
	this.context = context;
	context.font = fontSize + " " + font;

	// measure the height of the text (assume one line always)
	if (!size) {
		context.save();
		context.rotate(90);
		var height = context.measureText("m").width * 1.15;
		context.restore();
		var width = context.measureText(text).width;
		size = new goog.math.Size(width, height);
	}
	chesterGL.Block.call(this, [0, 0, size.width, size.height]);

	canvas.width = size.width;
	canvas.height = size.height;
	context.fillStyle = "Red";
	context.fillText(text, 0, size.height / 2.0);
	this.program = chesterGL.Block.PROGRAM['TEXTURE'];
	this.texture = "" + Math.random() + ".canvas";
	if (!chesterGL.assets['texture']) chesterGL.assets['texture'] = {};
	chesterGL.assets['texture'][this.texture] = canvas;
	chesterGL.defaultTextureHandler(this.texture, canvas);
};
goog.inherits(chesterGL.LabelBlock, chesterGL.Block);

/**
 * The canvas where we will draw
 * @type {?Element}
 * @ignore
 */
chesterGL.LabelBlock.prototype.canvas = null;

/**
 * Our 2d context for drawing the text
 * @type {?CanvasRenderingContext2D}
 * @ignore
 */
chesterGL.LabelBlock.prototype.context = null;

/**
 * Whether or not we need to redraw the text
 * @type {boolean}
 */
chesterGL.LabelBlock.prototype.needsTextUpdate = false;

goog.exportSymbol('chesterGL.LabelBlock', chesterGL.LabelBlock);
