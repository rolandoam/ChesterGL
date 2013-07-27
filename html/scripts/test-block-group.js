requirejs.config({
	shim: {
		'glmatrix': {
			exports: 'glmatrix'
		}
	}
});

require(["chester/core", "chester/block", "chester/blockGroup"], function (core, Block, BlockGroup) {
	core.settings.useGoogleAnalytics = true;
	core.setup("demo-canvas");
	var size = core.getViewportSize();
	var totalBlocks = 1000;

	core.loadAsset("texture", "images/star.png");
	core.assetsLoaded("all", function () {
		// finish with the setup and run the game
		core.setupPerspective();

		var sceneBlock = new Block(null, Block.TYPE.SCENE);
		sceneBlock.title = "Test::BlockGroup";
		core.setRunningScene(sceneBlock);

		var group = new BlockGroup("images/star.png", totalBlocks);

		// add lots of blocks
		for (var i=0; i < totalBlocks; i++) {
			var b = group.createBlock();
			b.setPosition(Math.random() * size.width, Math.random() * size.height, 0);
			b.speed = [Math.random() * 10 - 5, Math.random() * 10 - 5, 0];
			b.setUpdate(function () {
				this.setPosition(this.position[0] + this.speed[0], this.position[1] + this.speed[1], this.position[2] + this.speed[2]);
				if (this.position[0] >= size.width  || this.position[0] <= 0) { this.speed[0] = -this.speed[0]; }
				if (this.position[1] >= size.height || this.position[1] <= 0) { this.speed[1] = -this.speed[1]; }
			});
			group.append(b);
		}

		sceneBlock.append(group);
		core.run();
		// draw a single frame (for debug purposes)
		// chesterGL.drawScene();
	});
});
