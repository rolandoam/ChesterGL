define([], function () {
	var util = {};

	/**
	 * based on goog.inherits:
	 * http://docs.closure-library.googlecode.com/git/closure_goog_base.js.source.html
	 */
	util.inherits = function util_inherits(childCtor, parentCtor) {
		/** @constructor */
		function tempCtor() {};
		tempCtor.prototype = parentCtor.prototype;
		childCtor.superClass_ = parentCtor.prototype;
		childCtor.prototype = new tempCtor();
		/** @override */
		childCtor.prototype.constructor = childCtor;
	};

	return util;
});
