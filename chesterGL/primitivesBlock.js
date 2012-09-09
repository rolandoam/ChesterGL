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

goog.provide("chesterGL.PrimitiveBlock");

goog.require("goog.math.Vec2");
goog.require("goog.math.Size");
goog.require("chesterGL.Block");

/**
 * creates a new PrimitiveBlock. All draw functions should be placed in the update
 * method of the primitive block. Every frame, all draw calls are reset.
 * @constructor
 * @param {number=} maxPoints the max number of points, by default it's set to 500
 * @param {number=} maxLines the max number of lines, by default it's set to 500
 * @extends {chesterGL.Block}
 * @example
 * var block = new PrimitiveBlock();
 * block.setUpdate(function () {
 *	var sz = this.contentSize;
 *	this.drawPoint(sz.width * 0.5, sz.height * 0.5);
 * });
 */
chesterGL.PrimitiveBlock = function (maxPoints, maxLines) {
	if (!chesterGL.webglMode) {
		throw "PrimitiveBlock only works on WebGL mode";
	}
	this.maxPoints = maxPoints || 500;
	this.maxLines = maxLines || 500;
	chesterGL.Block.call(this, null, chesterGL.Block.TYPE['PRIMITIVE']);
	var gl = chesterGL.gl;
	this.glBufferPoints = gl.createBuffer();
	this.glBufferPointsData = new Float32Array(this.maxPoints * 7);
	this.glBufferLines = gl.createBuffer();
	this.glBufferLinesData = new Float32Array(this.maxLines * 14);
	this.program = chesterGL.Block.PROGRAM['DEFAULT'];
};
goog.inherits(chesterGL.PrimitiveBlock, chesterGL.Block);


/**
 * @type {?WebGLBuffer}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.glBufferPoints = null;

/**
 * @type {Float32Array}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.glBufferPointsData = null;

/**
 * @type {?WebGLBuffer}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.glBufferLines = null;

/**
 * @type {Float32Array}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.glBufferLinesData = null;

/**
 * max number of lines
 * @type {number}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.maxLines = 0;

/**
 * @type {number}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.currentIndexLine = 0;

/**
 * max number of points
 * @type {number}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.maxPoints = 0;

/**
 * @type {number}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.currentIndexPoint = 0;

/**
 * the array of polygons
 * @type {Array.<Float32Array>}
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.polygons = [];

/**
 * draws a point of a specified color (white by default)
 * @param {number} x
 * @param {number} y
 * @param {Array|Float32Array=} color An array containing the RGBA color, in floats from 0 to 1
 */
chesterGL.PrimitiveBlock.prototype.drawPoint = function (x, y, color) {
	if (this.currentIndexPoint < this.maxPoints) {
		var idx = this.currentIndexPoint * 7;
		color = color || [1, 1, 1, 1];
		this.glBufferPointsData[idx + 0] = x;
		this.glBufferPointsData[idx + 1] = y;
		this.glBufferPointsData[idx + 2] = 0;
		this.glBufferPointsData[idx + 3] = color[0];
		this.glBufferPointsData[idx + 4] = color[1];
		this.glBufferPointsData[idx + 5] = color[2];
		this.glBufferPointsData[idx + 6] = color[3];
		this.currentIndexPoint++;
	} else {
		throw "too many points!";
	}
};

/**
 * draws a line between (x0, y0) and (x1, y1), of the specified color (defaults to white)
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {Array|Float32Array=} color An array containing the RGBA color, in floats from 0 to 1
 */
chesterGL.PrimitiveBlock.prototype.drawLine = function (x0, y0, x1, y1, color) {
	if (this.currentIndexLine < this.maxLines) {
		var idx = this.currentIndexLine * 14;
		color = color || [1, 1, 1, 1];
		this.glBufferLinesData[idx +  0] = x0;
		this.glBufferLinesData[idx +  1] = y0;
		this.glBufferLinesData[idx +  2] = 0;
		this.glBufferLinesData[idx +  3] = color[0];
		this.glBufferLinesData[idx +  4] = color[1];
		this.glBufferLinesData[idx +  5] = color[2];
		this.glBufferLinesData[idx +  6] = color[3];
		this.glBufferLinesData[idx +  7] = x1;
		this.glBufferLinesData[idx +  8] = y1;
		this.glBufferLinesData[idx +  9] = 0;
		this.glBufferLinesData[idx + 10] = color[0];
		this.glBufferLinesData[idx + 11] = color[1];
		this.glBufferLinesData[idx + 12] = color[2];
		this.glBufferLinesData[idx + 13] = color[3];
		this.currentIndexLine++;
	} else {
		throw "too many lines!";
	}
};

/**
 * draws a polygon given an array of points
 * @param {Array} points The array of points. A point is represented by an array of 3 elements: x, y and z.
 * @param {Array|Float32Array=} color An array containing the RGBA color, in floats from 0 to 1
 * @param {boolean=} closePolygon should the polygon be closed? (link the last element with the first). Defaults to false
 * @param {boolean=} fillPolygon set to true to fill the polygon
 * @example
 * // will draw a red 50px wide square on (0, 0)
 * var points = [[0, 0, 0], [0, 50, 0], [50, 50, 0], [50, 0, 0]];
 * primitive.drawPolygon(points, [1, 0, 0, 1], true);
 */
chesterGL.PrimitiveBlock.prototype.drawPolygon = function (points, color, closePolygon, fillPolygon) {
	color = color || [1, 1, 1, 1];
	closePolygon = closePolygon || false;
	fillPolygon = fillPolygon || false;
	var len = points.length;
	var gl = chesterGL.gl;
	var buffer = new Float32Array(points.length * 7);
	var glbuffer = gl.createBuffer();
	for (var i=0; i < len; i++) {
		var pt = points[i];
		buffer[i*7 + 0] = pt[0];
		buffer[i*7 + 1] = pt[1];
		buffer[i*7 + 2] = pt[2];
		buffer[i*7 + 3] = color[0];
		buffer[i*7 + 4] = color[1];
		buffer[i*7 + 5] = color[2];
		buffer[i*7 + 6] = color[3];
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
	this.polygons.unshift([buffer, glbuffer, closePolygon, fillPolygon]);
};

/**
 * draws a rectangle
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Array=} color
 * @param {boolean=} fill
 */
chesterGL.PrimitiveBlock.prototype.drawRectangle = function (x, y, width, height, color, fill) {
	var hw = width / 2,
		hh = height / 2;
	var pts = [
		[x - hw, y - hh, 0],
		[x - hw, y + hh, 0],
		[x + hw, y + hh, 0],
		[x + hw, y - hh, 0]
	];
	this.drawPolygon(pts, color, true, fill);
};

/**
 * recreates the point buffer
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.recreatePointBuffer = function () {
	var gl = chesterGL.gl;
	var endIndex = (this.currentIndexPoint) * 7;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glBufferPoints);
	gl.bufferData(gl.ARRAY_BUFFER, this.glBufferPointsData.subarray(0, endIndex), gl.STATIC_DRAW);
};

/**
 * recreates the line buffer
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.recreateLineBuffer = function () {
	var gl = chesterGL.gl;
	var endIndex = (this.currentIndexLine) * 14;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glBufferLines);
	gl.bufferData(gl.ARRAY_BUFFER, this.glBufferLinesData.subarray(0, endIndex), gl.STATIC_DRAW);
};

/**
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.visit = function () {
	this.currentIndexPoint = 0;
	this.currentIndexLine = 0;
	// only reset if we need to
	if (this.polygons.length > 0)
		this.polygons = [];
	chesterGL.Block.prototype.visit.call(this);
};

/**
 * the actual render function
 * @ignore
 */
chesterGL.PrimitiveBlock.prototype.render = function () {
	var gl = chesterGL.gl;
	var program = chesterGL.selectProgram(chesterGL.Block.PROGRAM_NAME[this.program]);
	
	if (this.currentIndexPoint > 0 || this.currentIndexLine > 0 || this.polygons.length > 0) {
		// set the matrix uniform (the multiplied model view projection matrix)
		goog.vec.Mat4.multMat(chesterGL.pMatrix, this.mvMatrix, this.mvpMatrix);
		gl.uniformMatrix4fv(program.mvpMatrixUniform, false, this.mvpMatrix);
	}
	var pointSize = 3 + 4;
	var stride = pointSize * 4;

	// render all points
	if (this.currentIndexPoint > 0) {
		this.recreatePointBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBufferPoints);
		gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
		gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, 12);

		// draw the points
		gl.drawArrays(gl.POINTS, 0, this.currentIndexPoint);
	}

	// render all lines
	if (this.currentIndexLine > 0) {
		this.recreateLineBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBufferLines);
		gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
		gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, 12);

		// draw the lines
		gl.drawArrays(gl.LINES, 0, this.currentIndexLine * 2);
	}

	// render all polygons
	var len = this.polygons.length;
	if (len > 0) {
		for (var i=0; i < len; i++) {
			var poly = this.polygons[i];
			gl.bindBuffer(gl.ARRAY_BUFFER, poly[1]);
			gl.vertexAttribPointer(program.attribs['vertexPositionAttribute'], 3, gl.FLOAT, false, stride, 0);
			gl.vertexAttribPointer(program.attribs['vertexColorAttribute'], 4, gl.FLOAT, false, stride, 12);
			if (poly[2]) {
				gl.drawArrays(gl.LINE_LOOP, 0, poly[0].length / 7);
			} else {
				gl.drawArrays(gl.LINE_STRIP, 0, poly[0].length / 7);
			}
		}
	}
};

goog.exportSymbol('chesterGL.PrimitiveBlock', chesterGL.PrimitiveBlock);
goog.exportProperty(chesterGL.PrimitiveBlock.prototype, 'drawPoint', chesterGL.PrimitiveBlock.prototype.drawPoint);
goog.exportProperty(chesterGL.PrimitiveBlock.prototype, 'drawLine', chesterGL.PrimitiveBlock.prototype.drawLine);
goog.exportProperty(chesterGL.PrimitiveBlock.prototype, 'drawPolygon', chesterGL.PrimitiveBlock.prototype.drawPolygon);
goog.exportProperty(chesterGL.PrimitiveBlock.prototype, 'drawRectangle', chesterGL.PrimitiveBlock.prototype.drawRectangle);
