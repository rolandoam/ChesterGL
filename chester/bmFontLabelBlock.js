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

define(["require", "glmatrix", "chester/util", "chester/blockGroup"], function (require, glmatrix, util, BlockGroup) {
	/**
	 * this will be filled later
	 */
	var core = null;

	/**
	 * This is an implementation of the BMFont from angel code:
	 *
	 * http://www.angelcode.com/products/bmfont/
	 *
	 * @constructor
	 * @param {string} text the initial text for the label
	 * @param {string} name This is the name of the fnt file. There should be an existing .fnt and .png
	 * file for the texture.
	 * @param {number=} maxWidth the max width for the label. If the text is larger than this, it will scale
	 * down the content to match that width.
	 * @extends {BlockGroup}
	 */
	var BMFontLabelBlock = function (text, name, maxWidth) {
		text = text || "";
		BlockGroup.call(this, name + ".png", Math.max(255, text.length));
		this.maxWidth = maxWidth || 0;
		this.setColor([0, 0, 0, 0]);
		var fntFile = core.getAsset("txt", name + ".fnt"),
			tex = core.getRawAsset("texture", name + ".png"),
			totalChars = 0,
			md,
			lines = fntFile.split(/\n|\r/),
			i, j, tmp;
		this.chars = {};
		this.kernings = {};
		this.isHighDPI = tex.highDPI;
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
	util.inherits(BMFontLabelBlock, BlockGroup);

	/**
	 * sets the anchor point
	 * @param {number} x
	 * @param {number} y
	 */
	BMFontLabelBlock.prototype.setAnchorPoint = function BMFontLabelBlock_setAnchorPoint(x, y) {
		BlockGroup.prototype.setAnchorPoint.call(this, x, y);
		this.setText(this.text);
		return this;
	};

	/**
	 * Calculates the size for the given text, in width and lines
	 * @param {string} text
	 * @return {Object} the size of the text {width: w, lines: l}
	 * @ignore
	 */
	BMFontLabelBlock.prototype.calculateTextSize = function BMFontLabelBlock_calculateTextWidth(text) {
		var curWidth = 0,
			lineWidth = 0,
			lines = 1,
			i, last = 0,
			pixelRatio = core.getDevicePixelRatio();
		for (i=0; i < text.length; i++) {
			var ch = text.charCodeAt(i);
			if (ch == 10 || ch == 13) {
				curWidth = Math.max(curWidth, lineWidth);
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
				var dx = frameInfo['xadvance'] + kern;
				lineWidth += (this.isHighDPI ? dx / pixelRatio : dx);
				last = ch;
			}
		}
		curWidth = Math.max(curWidth, lineWidth);
		// console.log("line width: " + lineWidth);
		return {width: curWidth, lines: lines};
	};

	BMFontLabelBlock.prototype.getFrameForChar = function BMFontLabelBlock_frameForChar(ch) {
		if (typeof ch === "string") {
			ch = ch.charCodeAt(0);
		}
		var fi = this.chars[ch];
		if (fi) {
			return [fi['x'], fi['y'], fi['width'], fi['height']];
		} else {
			throw "Invalid character '" + ch + "' for BMFont";
		}
	};

	/**
	 * sets the text of the label
	 * @param {string} text
	 */
	BMFontLabelBlock.prototype.setText = function BMFontLabelBlock_setText(text) {
		// bail out early if no text
		if (text === null || text === undefined) {
			return;
		}
		this.text = text;
		this.removeAll();
		var sz = this.calculateTextSize(text),
			lineHeight = this.params['lineHeight'],
			i,
			last = 0,
			pixelRatio = core.getDevicePixelRatio(),
			curX = -sz.width * this.anchorPoint[0] * (this.isHighDPI ? pixelRatio : 1),
			curY = -(sz.lines * lineHeight * this.anchorPoint[1]);

		if (this.maxWidth > 0 && sz.width > this.maxWidth) {
			var scale = this.maxWidth / sz.width;
			this.setScale(scale);
		} else {
			this.setScale(1.0);
		}
		text = text.split(/\n|\r/).reverse().join("\n");
		for (i=0; i < text.length; i++) {
			var ch = text.charCodeAt(i);
			if (ch == 10 || ch == 13) {
				curX = -sz.width * this.anchorPoint[0];
				curY += lineHeight;
				continue;
			}
			if (this.chars[ch]) {
				var kern = 0;
				if (last > 0 && this.kernings[last]) {
					kern = (this.kernings[last][ch] || 0);
					// console.log("  kerning: " + kern);
				}
				var frame = this.getFrameForChar(ch),
					frameInfo = this.chars[ch],
					b = this.createBlock(frame),
					posY = curY + (lineHeight - frameInfo['yoffset']) - frameInfo['height'] * 0.5,
					posX = curX + frameInfo['xoffset'] + frameInfo['width'] * 0.5 + kern;
				// set the text to pixel-perfect position
				if (this.isHighDPI)
					b.setPosition(~~(posX / pixelRatio), ~~(posY / pixelRatio), 0);
				else
					b.setPosition(~~posX, ~~posY, 0);
				curX += frameInfo['xadvance'] + kern;
				this.append(b);
			} else {
				throw "Invalid charcode " + ch + " for text " + text + " (" + text.length + ")";
			}
			last = ch;
		}
		if (this.isHighDPI) {
			this.setContentSize(sz.width, sz.lines * lineHeight / pixelRatio);
		} else {
			this.setContentSize(sz.width, sz.lines * lineHeight);
		}
	};

	/**
	 * Just a shortcut to the asset loader, to load the specified font
	 * @param {string} prefix
	 */
	BMFontLabelBlock.loadFont = function (prefix) {
		core.loadAsset("txt", prefix + ".fnt");
		core.loadAsset("texture", prefix + ".png");
	};

	BMFontLabelBlock.setup = function BMFontLabelBlock_setup(c) {
		core = c;
	};

	return BMFontLabelBlock;
});

