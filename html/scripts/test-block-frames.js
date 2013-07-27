requirejs.config({
	shim: {
		'glmatrix': {
			exports: 'glmatrix'
		}
	}
});

require(["chester/core", "chester/block", "chester/blockFrames"], function (core, Block, BlockFrames) {
	core.settings.useGoogleAnalytics = true;
	core.setup("demo-canvas");
	var size = core.getViewportSize();
	var oneDeg = Math.PI / 180.0;

	BlockFrames.loadFrames("images/1945.json");
	core.assetsLoaded('all', function () {
		// finish with the setup and run the game
		core.setupPerspective();

		var sceneBlock = new Block(null, Block.TYPE.SCENE);
		sceneBlock.title = "Test::Block Frames";
		core.setRunningScene(sceneBlock);

		// create a block with a block frame
		var b1 = new Block("1945-4-0.png");
		b1.setPosition(size.width * 0.5, size.height * 0.5, 0);

		var b2 = new Block("1945-4-1.png");
		b2.setPosition(size.width *0.5 - 50, size.height * 0.5, 0);

		sceneBlock.append(b1, b2);

		b1.setUpdate(function () {
			this.setRotation(this.rotation + oneDeg);
		});

		core.run();
	});
});
