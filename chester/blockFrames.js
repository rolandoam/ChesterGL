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

define(["require", "glmatrix"], function (require, glmatrix) {
	/**
	 * The namespace for BlockFrame related functions
	 *
	 * @const
	 */
	var blockFrames = {};

	/**
	 * @type {Object.<string,chesterGL.Block.frameType>}
	 */
	var frames = {};

	/**
	 * loads the json data (callback for the ajax call)
	 *
	 * @param {Object|string} data
	 */
	blockFrames.parseFrameData = function (data) {
		// first, get the meta data
		if (typeof data === 'string') {
			data = JSON.parse(data);
		}
		if (data['meta'] && data['meta']['version'] == '1.0') {
			var texName = data['meta']['image'];
			require("chester/core").loadAsset('texture', texName, null, function (err, img) {
				var imgHeight = img.height;
				var dataFrames = data['frames'];
				for (var frameName in dataFrames) {
					var f = dataFrames[frameName];
					var realFrame = {frame: {}, texture: ""};
					realFrame.frame = [
						f['frame']['x'],
						f['frame']['y'],
						f['frame']['w'],
						f['frame']['h']
					];
					if (f['sourceSize']) {
						realFrame['sourceSize'] = {
							'width': f['sourceSize']['w'],
							'height': f['sourceSize']['h']
						};
					}
					realFrame.texture = texName;
					frames[frameName] = realFrame;
				}
			});
		} else {
			throw "Unkown json data";
		}
	};

	/**
	 * @param {Object} params
	 * @param {string|Object} data
	 * @return {boolean}
	 * @ignore
	 */
	blockFrames.framesLoadHandler = function (params, data) {
		var frameset = require("chester/core").getRawAsset('frameset', params.name);
		frameset.data = data;
		return true;
	};

	/**
	 * Returns a named frame.
	 *
	 * @param {string} frameName
	 * @return {chesterGL.Block.frameType}
	 */
	blockFrames.getFrame = function (frameName) {
		return frames[frameName];
	};

	/**
	 * @param {string} path The path for the json file (TexturePacker format)
	 * @param {function()=} callback The callback to be called after everything is ready
	 */
	blockFrames.loadFrames = function (path, callback) {
		require("chester/core").loadAsset("frameset", {url: path, dataType: 'json'}, null, function (err, data) {
			blockFrames.parseFrameData(data);
		});
	};

	require("chester/core").registerAssetHandler('frameset', blockFrames.framesLoadHandler);
	return blockFrames;
});
