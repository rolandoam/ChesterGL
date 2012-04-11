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
 * @param {string=} font the name/family of the font, defaults to "20pt sans-serif"
 * @param {string=} fillStyle the style of the font, defaults to 'white'
 * @extends {chesterGL.Block}
 */
chesterGL.LabelBlock = function (text, font, fillStyle) {
	font = font || "20pt sans-serif";
	fillStyle = fillStyle || "White";
	var canvas = document.createElement("canvas");
	this.canvas = canvas;
	var context = canvas.getContext('2d');
	this.context = context;
	this.font = font;
	this.fillStyle = fillStyle;

	this.texture = Date.now() + ".canvas";
	if (!chesterGL.assets['texture']) chesterGL.assets['texture'] = {};
	chesterGL.assets['texture'][this.texture] = canvas;

	chesterGL.Block.call(this, this.resetCanvas(text));
	this.setText(text, true);
	this.program = chesterGL.Block.PROGRAM['TEXTURE'];
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

/**
 * the actual string to draw
 * @ignore
 * @type {string}
 */
chesterGL.LabelBlock.prototype.text = "";

/**
 * the height of the text (aprox.)
 * @ignore
 * @type {number}
 */
chesterGL.LabelBlock.prototype.textHeight = 0;

/**
 * the font that will be used to render the text
 * @type {string}
 */
chesterGL.LabelBlock.prototype.font = "";

/**
 * the style used to render the text. Need to set the text again
 * to actually change the style
 * @type {string}
 */
chesterGL.LabelBlock.prototype.fillStyle = "";

/**
 * sets the text to be displayed. This will reset the underlying canvas and resize it to the size of the text
 * @param {string} text
 * @param {boolean=} onlyDraw if true, then just draw the text on the canvas
 */
chesterGL.LabelBlock.prototype.setText = function (text, onlyDraw) {
	this.text = text;
	if (onlyDraw) {
		this.drawText();
	} else {
		this.setFrame(this.resetCanvas());
		this.needsTextUpdate = true;
	}
};

/**
 * redraws the text on the offscreen canvas (clearing it first)
 * @ignore
 */
chesterGL.LabelBlock.prototype.drawText = function () {
	var cx = this.context;
	var canvas = this.canvas;
	cx.clearRect(0, 0, canvas.width, canvas.height);
	cx.fillText(this.text, 0, canvas.height * 0.8);
	chesterGL.defaultTextureHandler(/** @type {string} */(this.texture), canvas);
	this.needsTextUpdate = false;
};

/**
 * resets the canvas: sets the style, measures the text, changes the canvas size.
 * Returns an array that can be passed to setFrame().
 * @ignore
 * @param {string=} text optional text to set
 * @returns {Array}
 */
chesterGL.LabelBlock.prototype.resetCanvas = function (text) {
	var cx = this.context;
	var canvas = this.canvas;
	cx.font = this.font;
	cx.fillStyle = this.fillStyle;
	if (text) {
		this.text = text;
	}

	if (this.textHeight == 0) {
		cx.save();
		cx.rotate(90);
		this.textHeight = cx.measureText("M").width * 1.25;
		cx.restore();
	}
	var width = cx.measureText(this.text).width;

	canvas.width = width;
	canvas.height = this.textHeight;
	cx.font = this.font;
	cx.fillStyle = this.fillStyle;
	return [0, 0, width, this.textHeight];
};

/**
 * override visit, update offscreen canvas if needed
 * @ignore
 */
chesterGL.LabelBlock.prototype.visit = function () {
	if (this.needsTextUpdate) {
		this.drawText();
	}
	chesterGL.Block.prototype.visit.call(this);
};

goog.exportSymbol('chesterGL.LabelBlock', chesterGL.LabelBlock);
goog.exportProperty(chesterGL.LabelBlock.prototype, 'setText', chesterGL.LabelBlock.prototype.setText);
