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

goog.provide("chesterGL.BlockFrames");

goog.require("goog.vec.Vec4");
goog.require("chesterGL.Block");

/**
 * The namespace for BlockFrame related functions
 *
 * @const
 */
chesterGL.BlockFrames = {};

/**
 * @type {Object.<string,chesterGL.Block.frameType>}
 */
chesterGL.BlockFrames.frames = {};

/**
 * loads the json data (callback for the ajax call)
 *
 * @param {Object|string} data
 */
chesterGL.BlockFrames.parseFrameData = function (data) {
	// first, get the meta data
	if (typeof data === 'string') {
		data = /** @type {Object} */(JSON.parse(data));
	}
	if (data['meta'] && data['meta']['version'] == '1.0') {
		var texName = data['meta']['image'];
		chesterGL.loadAsset('texture', texName, null, function (img) {
			var imgHeight = img.height;
			var frames = data['frames'];
			for (var frameName in frames) {
				var f = frames[frameName];
				/** @type {chesterGL.Block.frameType} */ var realFrame = {frame: {}, texture: ""};
				realFrame.frame = [
					f['frame']['x'],
					f['frame']['y'],
					f['frame']['w'],
					f['frame']['h']
				];
				realFrame.texture = texName;
				chesterGL.BlockFrames.frames[frameName] = realFrame;
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
chesterGL.BlockFrames.framesLoadHandler = function (params, data) {
	var frameset = chesterGL.assets['frameset'][params.name];
	frameset.data = data;
	return true;
};

/**
 * Returns a named frame.
 *
 * @param {string} frameName
 * @return {chesterGL.Block.frameType}
 */
chesterGL.BlockFrames.getFrame = function (frameName) {
	return chesterGL.BlockFrames.frames[frameName];
};

/**
 * @param {string} path The path for the json file (TexturePacker format)
 * @param {function()=} callback The callback to be called after everything is ready
 */
chesterGL.BlockFrames.loadFrames = function (path, callback) {
	console.log("loadFrames: will fetch " + path);
	chesterGL.loadAsset("frameset", {url: path, dataType: 'json'}, null, function (data) {
		chesterGL.BlockFrames.parseFrameData(data);
	});
};

chesterGL.registerAssetHandler('frameset', chesterGL.BlockFrames.framesLoadHandler);

// export symbols
goog.exportSymbol('chesterGL.BlockFrames', chesterGL.BlockFrames);
// static methods
goog.exportProperty(chesterGL.BlockFrames, 'getFrame', chesterGL.BlockFrames.getFrame);
goog.exportProperty(chesterGL.BlockFrames, 'loadFrames', chesterGL.BlockFrames.loadFrames);
