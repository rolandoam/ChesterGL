/**
 * simplest quad-tree ever :)
 */

goog.provide("chesterGL.QuadTree");


/**
 * Creates and empty quadtree, by default the size of the area is 5 times the area of the viewport
 * and the smallest grid size is 32x32
 * @constructor
 * @param {goog.math.Size=} size the size of the QuadTree
 * @param {number=} cellSize the size for a quadrant in the QuadTree
 */
chesterGL.QuadTree = function (size, cellSize) {
	size = size || chesterGL.viewportSize();
	cellSize = cellSize || 32;
	if (size.width > cellSize) {
		var halfSize = new goog.math.Size(size.width >> 1, size.height >> 1);
		this.q1 = new QuadTree(halfSize, cellSize);
		this.q2 = new QuadTree(halfSize, cellSize);
		this.q3 = new QuadTree(halfSize, cellSize);
		this.q4 = new QuadTree(halfSize, cellSize);
	}
	this.objects = [];
};

/**
 * first quadrant (top left)
 * @type {chesterGL.QuadTree}
 */
chesterGL.QuadTree.prototype.q1 = null;

/**
 * second quadrant (top right)
 * @type {chesterGL.QuadTree}
 */
chesterGL.QuadTree.prototype.q1 = null;

/**
 * third quadrant (bottom left)
 * @type {chesterGL.QuadTree}
 */
chesterGL.QuadTree.prototype.q3 = null;

/**
 * fourth quadrant (bottom right)
 * @type {chesterGL.QuadTree}
 */
chesterGL.QuadTree.prototype.q4 = null;

/**
 * The list of objects inside this level
 * @type {?Array}
 */
chesterGL.QuadTree.prototype.objects = null;

/**
 * add all children of `block`, and in turn all of their children
 * @param {chesterGL.Block} block
 */
chesterGL.QuadTree.prototype.appendFromBlock = function QuadTree_appendFromBlock(block) {
};

/**
 * adds a single block to the quadtree
 * @param {chesterGL.Block} block
 */
chesterGL.QuadTree.prototype.addBlock = function QuadTree_addBlock(block) {
	var pos = block.getAbsolutePosition(),
		size = block.getContentSize();
};

/**
 * Returns the list of blocks at the specified point. The test is made agains the block's bounding
 * box. If no block is found, then this method returns an empty array.
 * @return {Array.<chesterGL.Block>}
 */
chesterGL.QuadTree.prototype.pickBlockAtPoint = function QuadTree_pickBlockAtPoint(pt) {
	return [];
};
