requirejs.config({
	shim: {
		'glmatrix': {
			exports: 'glmatrix'
		}
	}
});

require(["chester/core", "chester/block", "chester/blockFrames"], function (core, block) {
	core.settings.useGoogleAnalytics = true;
	core.setup("demo-canvas");
	var size = core.getViewportSize();
	var oneDeg = Math.PI / 180.0;

	core.loadAsset("texture", "images/test.png");
	core.loadAsset("texture", "images/star.png");
	core.assetsLoaded("all", function () {
		core.setupPerspective();
		var sceneBlock = new block(null, block.TYPE.SCENE);
		sceneBlock.title = "Test::Single Block";
		core.setRunningScene(sceneBlock);

		// create a block
		var someBlock = new block();
		someBlock.setTexture("images/test.png")
		// someBlock.rotateBy(-45);
		someBlock.setPosition([size.width/2, size.height/2, 0]);

		var someBlock2 = new block();
		someBlock2.setTexture("images/star.png");
		someBlock2.setColor([1, 1, 1, 0.5]);
		someBlock2.setPosition([60, 0, 0]);
		someBlock.append(someBlock2);

		var pt = someBlock.getAbsolutePosition([size.width/2, size.height/2, 0]);
		console.log("point: " + pt[0] + "," + pt[1]);

		sceneBlock.append(someBlock);

		// add some action
		var dz = 10;
		someBlock.setUpdate(function () {
			this.setRotation(this.rotation + oneDeg);
			this.setPosition([this.position[0], this.position[1], this.position[2] + dz]);
			if (this.position[2] >=  200) { dz = -dz; }
			if (this.position[2] <= -200) { dz = -dz; }
		});
		someBlock2.setUpdate(function () {
			this.setRotation(this.rotation - oneDeg);
		});

		// start the fun
		core.run();
	});
});
