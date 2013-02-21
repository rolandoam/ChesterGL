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

goog.provide("chesterGL.TMXBlock");

goog.require("goog.crypt.base64");
goog.require("goog.vec.Vec4");
goog.require("goog.math.Size");
goog.require("chesterGL.Block");

/**
 * Creates a new TMXBlock (from a TMX file)
 * The first line of children are the layers of the tmx map and they're all BlockGroups
 *
 * @constructor
 * @param {string} tmxFile
 * @extends chesterGL.Block
 */
chesterGL.TMXBlock = function (tmxFile) {
	// first, get the map from the map list
	var map = chesterGL.TMXBlock.maps[tmxFile];
	if (!map) {
		throw "Invalid map - make sure you call loadTMX first";
	}
	chesterGL.Block.call(this, null, chesterGL.Block.TYPE['TMXBLOCK']);
	// create the map from the metadata
	for (var i=0; i < map['layers'].length; i++) {
		var layer = map['layers'][i];
		// this is while block group is not supported on canvas fallback
		var l = (chesterGL.webglMode ? new chesterGL.BlockGroup(null, layer['blocks'].length) : new chesterGL.Block());
		var tileset = null;
		for (var n=0; n < layer['blocks'].length; n++) {
			// meta block
			var mblock = layer['blocks'][n];
			// set the texture for the block group
			if (!tileset) {
				tileset = chesterGL.TMXBlock.findTilesetForGid(map['tilesets'], mblock['gid']);
				l.setTexture(tileset['texture']);
			}
			var b;
			if (chesterGL.webglMode) {
				b = l.createBlock(mblock['frame']);
			} else {
				b = new chesterGL.Block(mblock['frame']);
				b.setTexture(tileset['texture']);
			}
			b.setPosition(mblock['position']);
			l.append(b);
		}
		this.append(l);
	}
};
goog.inherits(chesterGL.TMXBlock, chesterGL.Block);

/**
 * empty rendering function
 * @ignore
 */
chesterGL.TMXBlock.prototype.render = function () {};

/**
 * The size (in pixels) of the tiles (in the texture)
 *
 * @type {?goog.math.Size}
 * @ignore
 */
chesterGL.TMXBlock.prototype.tileSize = null;

/**
 * The tile size in the map
 * @type {?goog.math.Size}
 * @ignore
 */
chesterGL.TMXBlock.prototype.mapTileSize = null;

/**
 * @type {number}
 * @ignore
 */
chesterGL.TMXBlock.prototype.totalTiles = 0;

/**
 * @type {number}
 * @ignore
 */
chesterGL.TMXBlock.prototype.spacing = 0;

/**
 * @type {number}
 * @ignore
 */
chesterGL.TMXBlock.prototype.margin = 0;

/**
 * @type {Object.<string,Object>}
 * @ignore
 */
chesterGL.TMXBlock.maps = {};

/**
 * unpacks a UInt32 from a string
 * @param {Array} buffer
 * @param {number} offset
 * @ignore
 */
chesterGL.TMXBlock.unpackUInt32 = function (buffer, offset) {
	return (buffer[offset + 3] << 24) |
		   (buffer[offset + 2] << 16) |
		   (buffer[offset + 1] <<  8) |
		    buffer[offset + 0] >>> 0;
};

/**
 * @param {Object} params
 * @param {string} data
 * @ignore
 */
chesterGL.TMXBlock.handleLoadTMX = function (params, data) {
	var map = chesterGL.assets['tmx'][params.name];
	map.data = data;
	return true;
};

/**
 * finds the right texture for the given gid
 * @param {Array.<Object>} tilesets
 * @param {number} gid
 * @return {Object}
 */
chesterGL.TMXBlock.findTilesetForGid = function (tilesets, gid) {
	var tex = tilesets[0];
	for (var i=1; i < tilesets.length; i++) {
		var ts = tilesets[i];
		if (gid >= ts['firstgid']) {
			tex = ts;
		}
	}
	return tex;
};

/**
 * Will load a TMX file, parse it when loaded and add the metadata to create
 * the TMX block later
 *
 * @param {string} path
 */
chesterGL.TMXBlock.loadTMX = function (path) {
	chesterGL.loadAsset('tmx', {url:path, dataType: 'xml'}, null, function (err, data) {
		var tmx = {};

		var map = $(data).find("map");
		var orientation = map.attr("orientation");
		tmx['tilesets'] = [];
		map.find("tileset").each(function (i, xtileset) {
			var ts = $(xtileset);
			if (ts.attr('name') != "obstruction") {
				var tileset = {};
				tileset['tileSize'] = new goog.math.Size(
					parseInt(ts.attr("tilewidth"), 10),
					parseInt(ts.attr("tileheight"), 10)
				);
				if (ts.attr("spacing")) {
					tileset['spacing'] = parseInt(ts.attr("spacing"), 10);
				}
				if (ts.attr("margin")) {
					tileset['margin'] = parseInt(ts.attr("margin"), 10);
				}
				var image = ts.find("image").first();
				tileset['imgSize'] = new goog.math.Size(
					parseInt(image.attr("width"), 10),
					parseInt(image.attr("height"), 10)
				);
				tileset['texture'] = image.attr('source');
				tileset['firstgid'] = parseInt(ts.attr('firstgid'), 10);
				tmx['tilesets'].push(tileset);
			}
		});
		tmx['mapTileSize'] = new goog.math.Size(
			parseInt(map.attr("tilewidth"), 10),
			parseInt(map.attr("tileheight"), 10)
		);
		// parse the layers
		tmx['layers'] = [];
		map.find("layer").each(function (i, layer) {
			if ($(layer).attr("visible") != "0") {
				var blockLayer = {};
				blockLayer['blocks'] = [];

				var layerSize = new goog.math.Size(
					parseInt($(layer).attr("width"), 10),
					parseInt($(layer).attr("height"), 10)
				);
				var data = $(layer).find("data").first();
				if (data) {
					if (data.attr("encoding") != "base64" || data.attr("compression")) {
						throw "Invalid TMX Data";
					}
					var str = data.text().trim();
					var decodedData = goog.crypt.base64.decodeStringToByteArray(str);
					// fun begins here
					var offset = 0;
					var tileset = null;
					for (var row = 0; row < layerSize.height; row++) {
						for (var col = 0; col < layerSize.width; col++) {
							var gid = chesterGL.TMXBlock.unpackUInt32(decodedData, offset);
							if (gid === 0) {
								offset += 4;
								continue;
							}
							if (!tileset) {
								tileset = chesterGL.TMXBlock.findTilesetForGid(tmx['tilesets'], gid);
							}
							var b = {};
							b['gid'] = gid;
							var margin = tileset['margin'] || 0;
							var spacing = tileset['spacing'] || 0;
							var tileSize = tileset['tileSize'];
							var imageSize = tileset['imgSize'];
							var mapTileSize = tmx['mapTileSize'];

							var max_x = parseInt((imageSize.width - margin * 2 + spacing) / (tileSize.width + spacing), 10);
							gid = gid - tileset['firstgid'];
							var frame = goog.vec.Vec4.createFloat32FromValues(
								(gid % max_x) * (tileSize.width + spacing) + margin,
								(imageSize.height - tileSize.height - margin - spacing) - parseInt(gid / max_x, 10) * (tileSize.height + spacing) + margin,
								tileSize.width,
								tileSize.height
							);
							// console.log("gid " + col + "," + row + ": " + gid + "; frame: " + frame.l + "," + frame.t);
							b['frame'] = frame;
							var bx, by;
							if (orientation == "orthogonal") {
								bx = col * mapTileSize.width                           + tileSize.width/2;
								by = (layerSize.height - row - 1) * mapTileSize.height + tileSize.height/2;
							} else if (orientation == "isometric") {
								bx = mapTileSize.width/2  * (layerSize.width + col - row - 1)        + tileSize.width/2;
								by = mapTileSize.height/2 * ((layerSize.height * 2 - col - row) - 2) + tileSize.height/2;
							} else {
								throw "Invalid orientation";
							}
							b['position'] = [bx, by, 0];
							blockLayer['blocks'].push(b);
							offset += 4;
						}
					}
				} else {
					throw "No data for layer!";
				}
				tmx['layers'].push(blockLayer);
			}
		}); // each layer
		chesterGL.TMXBlock.maps[path] = tmx;
	});
};

// just register a dummy handler
chesterGL.registerAssetHandler('tmx', chesterGL.TMXBlock.handleLoadTMX);

// export symbols
goog.exportSymbol('chesterGL.TMXBlock', chesterGL.TMXBlock);
// static methods
goog.exportProperty(chesterGL.TMXBlock, 'loadTMX', chesterGL.TMXBlock.loadTMX);
