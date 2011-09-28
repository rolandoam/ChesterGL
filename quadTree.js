(function (window) {
	/**
	 * @constructor QuadTree
	 */
	var QuadTree = function () {};
	
	var QuadTree__prototype = {
		/**
		 * the current depth for this node
		 * @type {number}
		 */
		depth: 0,
		
		/**
		 * the max depth for all children
		 *
		 * @type {number}
		 */
		maxDepth: 0,
		
		/**
		 * the rect for this node
		 * @type {Object.<string,number>}
		 */
		rect: {
			x: 0,
			y: 0,
			w: 0,
			h: 0
		},
		
		/**
		 * the four children for each node
		 *
		 * @type {QuadTree}
		 */
		tl: null,

		/**
		 * @type {QuadTree}
		 */
		tr: null,

		/**
		 * @type {QuadTree}
		 */
		bl: null,

		/**
		 * @type {QuadTree}
		 */
		br: null,
		
		/**
		 * the list of objects inside this node
		 * @type {Array.<Object>}
		 */
		objects: null,
		
		// methods
		
		createChildren: function () {
			if (this.depth < this.maxDepth) {
				var rect = this.rect;
				var hw = rect.w/2,
					hh = rect.h/2;
				var hx = rect.x + hw;
				var hy = rect.y + hh;

				this.tl = QuadTree.create({x: rect.x, y: hy    , w: hw, h: hh}, this.depth + 1, this.maxDepth);
				this.tr = QuadTree.create({x: hx    , y: hy    , w: hw, h: hh}, this.depth + 1, this.maxDepth);
				this.bl = QuadTree.create({x: rect.x, y: rect.y, w: hw, h: hh}, this.depth + 1, this.maxDepth);
				this.br = QuadTree.create({x: hx    , y: rect.y, w: hw, h: hh}, this.depth + 1, this.maxDepth);
			}
		},
		
		/**
		 * inserts an object in the lowest level node
		 * 
		 * @param {Object} obj
		 * @param {Object.<string,number>} position
		 */
		insertObject: function (obj, position) {
			var rect = this.rect;
			if (position.x < rect.x || position.x > rect.x + rect.w || position.y < rect.y || position.y > rect.y + rect.h) {
				throw "Invalid position for this node (" + position.x + "," + position.y + ") " + this.nodeCoords();
			}
			if (this.depth == this.maxDepth) {
				this.objects.push(obj);
				// console.log("objects.id = " + this.objects.id);
				// console.log("adding object at coord " + this.nodeCoords() + " " + this.objects.length);
			} else {
				// check what quadrant the object should go into
				var hx = rect.x + rect.w/2;
				var hy = rect.y + rect.h/2;
				if (position.x < hx) {
					if (position.y > hy) {
						this.tl.insertObject(obj, position);
					} else {
						this.bl.insertObject(obj, position);
					}
				} else {
					if (position.y > hy) {
						this.tr.insertObject(obj, position);
					} else {
						this.br.insertObject(obj, position);
					}
				}
			}
		},
		
		/**
		 * returns the first object in a certain point
		 * this is the same logic as insertObject
		 * 
		 * @param {Object<string.number>} position
		 */
		objectForPoint: function (position) {
			var rect = this.rect;
			if (position.x < rect.x || position.x > rect.x + rect.w || position.y < rect.y || position.y > rect.y + rect.h) {
				throw "Invalid point for this node";
			}
			if (this.depth == this.maxDepth) {
				// console.log("objects.id = " + this.objects.id + "; " + this.objects.length);
				// console.log("found object for point " + position.x + "," + position.y + " node coords " + this.nodeCoords());
				return this.objects[0];
			} else {
				// check what quadrant the object should go into
				var hx = rect.x + rect.w/2;
				var hy = rect.y + rect.h/2;
				if (position.x < hx) {
					if (position.y > hy) {
						return this.tl.objectForPoint(position);
					} else {
						return this.bl.objectForPoint(position);
					}
				} else {
					if (position.y > hy) {
						return this.tr.objectForPoint(position);
					} else {
						return this.br.objectForPoint(position);
					}
				}
			}
			return null;
		},
		
		/**
		 * just for debug
		 */
		nodeCoords: function () {
			var rect = this.rect;
			return "(" + rect.x + "," + rect.y + "," + rect.w + "," + rect.h + " - " + this.depth + ")";
		}
	};
	
	QuadTree.prototype = QuadTree__prototype;
	
	/**
	 * creates a new quad tree
	 *
	 * @param {Object.<string,number>} rect
	 * @param {number} depth
	 * @param {number} maxDepth
	 */
	var serialId = 0;
	QuadTree.create = function (rect, depth, maxDepth) {
		var qt = new QuadTree();
		
		qt.rect = {
			x: rect.x,
			y: rect.y,
			w: rect.w,
			h: rect.h
		};
		qt.objects = new Array();
		qt.objects.id = serialId ++;
		qt.depth = depth;
		qt.maxDepth = maxDepth;
		qt.createChildren();
		return qt;
	}
	
	var ChesterGL = (window.ChesterGL || {});
	ChesterGL.QuadTree = QuadTree;
})(window);
