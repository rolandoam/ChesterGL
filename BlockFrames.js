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
	var BlockFrames = {};
	
	/**
	 * @name BlockFrames
	 * @namespace
	 * @type {Object.<string,Object>}
	 */
	BlockFrames.frames = {};
	
	/**
	 * loads the json data
	 */
	BlockFrames.loadJSON = function (data) {
		// first, get the meta data
		if (data['meta'] && data['meta']['version'] == '1.0') {
			var texture = data['meta']['image'];
			ChesterGL.loadAsset('texture', texture, function (img) {
				var imgHeight = img.height;
				var frames = data['frames'];
				for (var frameName in frames) {
					var f = frames[frameName];
					BlockFrames.frames[frameName] = {
						't': imgHeight - (f['frame']['y'] + f['frame']['h']),
						'l': f['frame']['x'],
						'w': f['frame']['w'],
						'h': f['frame']['h']
					};
					BlockFrames.frames[frameName]['texture'] = texture;
				}
			});
		} else {
			throw "Unkown json data";
		}
	}
	
	BlockFrames.getFrame = function (frameName) {
		return BlockFrames.frames[frameName];
	}
	
	/**
	 * @param {string} path The path for the json file (TexturePacker format)
	 * @param {function()=} callback The callback to be called after everything is ready
	 */
	BlockFrames.loadFrames = function (path, callback) {
		$.ajax({
			url: path,
			async: false,
			dataType: 'json',
			success: function (data, textStatus) {
				if (textStatus == "success") {
					BlockFrames.loadJSON(data);
				}
			}
		})
	};
	
	// export symbols
	BlockFrames['getFrame'] = BlockFrames.getFrame;
	BlockFrames['loadFrames'] = BlockFrames.loadFrames;
	
	window['ChesterGL']['BlockFrames'] = BlockFrames;
})(window);
