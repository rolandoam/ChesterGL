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

/*jslint sub: true */

goog.provide("chesterGL.BMFontLabelBlock");

goog.require("goog.vec.Mat4");
goog.require("goog.math.Size");
goog.require("chesterGL.BlockGroup");

/**
 * This is an implementation of the BMFont from angel code:
 *
 * http://www.angelcode.com/products/bmfont/
 *
 * @constructor
 * @param {string} name This is the name of the fnt file. There should be an existing .fnt and .png
 * file for the texture.
 * @param {string} text the initial text for the label
 * @extends {chesterGL.BlockGroup}
 */
chesterGL.BMFontLabelBlock = function (name, text) {
	goog.base(this, name + ".png", Math.max(100, text.length));
	// this._sharedTexture = name + ".png";
	this.setColor([0, 0, 0, 0]);
	var fntFile = chesterGL.getAsset('txt', name + ".fnt"),
		totalChars = 0,
		md,
		lines = fntFile.split(/\n|\r/),
		i, j, tmp;
	this.chars = {};
	this.kernings = {};
	for (i in lines) {
		md = lines[i].match(/chars count=(\d+)/);
		if (md) {
			totalChars = parseInt(md[1], 10);
			continue;
		}
		md = lines[i].split(/\s+/);
		if (md[0] === "common") {
			var obj = {};
			for (j=1; j < md.length; j++) {
				tmp = md[j].split("=");
				if (tmp.length == 2) {
					obj[tmp[0]] = parseInt(tmp[1], 10);
				}
			}
			this.params = obj;
		} else if (md[0] === "char") {
			var ch = {};
			for (j=1; j < md.length; j++) {
				tmp = md[j].split("=");
				if (tmp.length == 2) {
					ch[tmp[0]] = parseInt(tmp[1], 10);
				}
			}
			if (ch['id']) {
				this.chars[ch['id']] = ch;
			} else {
				console.log("BMFontLabel: invalid char at line " + (i+1));
			}
		} else if (md[0] === "kerning") {
			var kern = {};
			for (j=1; j < md.length; j++) {
				tmp = md[j].split("=");
				if (tmp.length == 2) {
					kern[tmp[0]] = parseInt(tmp[1], 10);
				}
			}
			// console.log("adding kerning for first " + kern['first'] + "~>" + kern['second']);
			this.kernings[kern['first']] = this.kernings[kern['first']] || {};
			this.kernings[kern['first']][kern['second']] = kern['amount'];
		}
	}
	this.setText(text);
};
goog.inherits(chesterGL.BMFontLabelBlock, chesterGL.BlockGroup);

/**
 * sets the anchor point
 * @param {number} x
 * @param {number} y
 */
chesterGL.BMFontLabelBlock.prototype.setAnchorPoint = function BMFontLabelBlock_setAnchorPoint(x, y) {
	goog.base(this, "setAnchorPoint", x, y);
	this.setText(this.text);
};

/**
 * Calculates the size for the given text, in width and lines
 * @param {string} text
 * @returns {Object} the size of the text {width: w, lines: l}
 * @ignore
 */
chesterGL.BMFontLabelBlock.prototype.calculateTextSize = function BMFontLabelBlock_calculateTextWidth(text) {
	var maxWidth = 0,
		lineWidth = 0,
		lines = 0,
		i, last = 0;
	for (i=0; i < text.length; i++) {
		var ch = text.charCodeAt(i);
		if (ch == 10 || ch == 13) {
			// console.log("line width: " + lineWidth);
			maxWidth = Math.max(maxWidth, lineWidth);
			lineWidth = 0;
			lines++;
			continue;
		}
		if (this.chars[ch]) {
			var frameInfo = this.chars[ch],
				kern = 0;
			if (last > 0 && this.kernings[last]) {
				kern = (this.kernings[last][ch] || 0);
				// console.log("  kerning: " + kern);
			}
			lineWidth += frameInfo['xadvance'] + kern;
			last = ch;
		}
	}
	maxWidth = Math.max(maxWidth, lineWidth);
	// console.log("line width: " + lineWidth);
	return {width: maxWidth, lines: lines};
};

/**
 * sets the text of the label
 * @param {string} text
 */
chesterGL.BMFontLabelBlock.prototype.setText = function BMFontLabelBlock_setText(text) {
	// bail early if no text
	if (text === null || text === undefined) {
		return;
	}
	this.text = text;
	this.removeAllChildren();
	var sz = this.calculateTextSize(text),
		lineHeight = this.params['lineHeight'],
		i,
		last = 0,
		curX = -sz.width * this.anchorPoint.x,
		curY = -(sz.lines * lineHeight * this.anchorPoint.y);
	// console.log("width: " + width + "; height: " + height + "; offX: " + offX);
	text = text.split(/\n|\r/).reverse().join("\n");
	for (i=0; i < text.length; i++) {
		var ch = text.charCodeAt(i);
		if (ch == 10 || ch == 13) {
			curX = -sz.width * this.anchorPoint.x;
			curY += lineHeight;
			continue;
		}
		if (this.chars[ch]) {
			var kern = 0;
			if (last > 0 && this.kernings[last]) {
				kern = (this.kernings[last][ch] || 0);
				// console.log("  kerning: " + kern);
			}
			var frameInfo = this.chars[ch],
				frame = [
					frameInfo['x'],
					frameInfo['y'],
					frameInfo['width'],
					frameInfo['height']
				],
				b = this.createBlock(frame),
				posY = curY + (lineHeight - frameInfo['yoffset']) - frameInfo['height'] * 0.5,
				posX = curX + frameInfo['xoffset'] + frameInfo['width'] * 0.5 + kern;
			// set the text to pixel-perfect position
			b.setPosition(~~posX, ~~posY, 0);
			// console.log(text.charAt(i) + ": " + posX + "," + posY);
			curX += frameInfo['xadvance'] + kern;
			this.addChild(b);
		} else {
			throw "Invalid charcode " + ch + " for text " + text;
		}
		last = ch;
	}
	this.setContentSize(sz.width, sz.lines * lineHeight);
};

/**
 * Just a shortcut to the asset loader, to load the specified font
 * @param {string} prefix
 */
chesterGL.BMFontLabelBlock.loadFont = function (prefix) {
	chesterGL.loadAsset("texture", prefix + ".png");
	chesterGL.loadAsset("txt", prefix + ".fnt");
};

// export the symbol & static methods
goog.exportSymbol('chesterGL.BMFontLabelBlock', chesterGL.BMFontLabelBlock);
goog.exportSymbol('chesterGL.BMFontLabelBlock.loadFont', chesterGL.BMFontLabelBlock.loadFont);
// instance methods
goog.exportProperty(chesterGL.BMFontLabelBlock.prototype, 'setText', chesterGL.BMFontLabelBlock.prototype.setText);
goog.exportProperty(chesterGL.BMFontLabelBlock.prototype, 'setAnchorPoint', chesterGL.BMFontLabelBlock.prototype.setAnchorPoint);
