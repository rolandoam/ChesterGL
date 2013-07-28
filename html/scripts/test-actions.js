requirejs.config({
	shim: {
		'glmatrix': {
			exports: 'glmatrix'
		}
	}
});

require(["chester/core", "chester/block", "chester/blockFrames", "chester/actions"], function (core, Block, BlockFrames, actions) {
	var wiggle = null;
	var oneDeg = Math.PI / 180.0;
	core.settings.useGoogleAnalytics = true;
	core.setup("demo-canvas");

	BlockFrames.loadFrames("images/1945.json");
	core.assetsLoaded("all", function () {
		var size = core.getViewportSize();

		// finish with the setup and run the game
		core.setupPerspective();

		var sceneBlock = new Block(null, Block.TYPE.SCENE);
		sceneBlock.title = "Test::Actions";
		core.setRunningScene(sceneBlock);

		// create a block with a block frame
		var b1 = new Block("1945-4-0.png");
		b1.setPosition([size.width * 0.5, size.height * 0.5, 0]);

		// test actions: two way of scheduling actions
		// 1.- directly using the action manager
		// for block b1, 0.2 seconds, [frames...], shouldLoop
		var animation = new actions.Animate(500, ["1945-4-0.png", "1945-4-1.png", "1945-4-2.png", "1945-4-3.png", "1945-4-4.png"], true, b1);
		actions.Manager.scheduleAction(animation);

		// 2.- testing repeat (forever)
		var b2 = new Block("1945-4-1.png"),
			moveAction = new actions.Move([size.width/2, size.height/2, 0], 2500),
			faceDirection1 = new actions.Callback(function () {
				this.setRotation(225 * oneDeg);
			}.bind(b2)),
			faceDirection2 = new actions.Callback(function () {
				this.setRotation(45 * oneDeg);
			}.bind(b2));
		moveAction.setNext(faceDirection1).setNext(moveAction.reverse()).setNext(faceDirection2);
		var repeat = new actions.Repeat(moveAction, -1);
		b2.setRotation(oneDeg * 45);
		b2.runAction(repeat);

		// 3.- sequence testing
		var a1 = new actions.Move([50, 50, 0], 1000);
		var a2 = a1.reverse();
		var a3 = new actions.Move([0, 100, 0], 1000);
		var a4 = a3.reverse();
		var a5 = new actions.Callback(function () {
			console.log("will wiggle");
			$("#wiggle").click();
		});
		a1.setNext(a2).setNext(a3).setNext(a4).setNext(a5);
		b1.runAction(a1);

		// 4.- wiggle sprite
		wiggle = new Block("1945-4-2.png");
		wiggle.setPosition(50, 150, 0);

		sceneBlock.append(b1);
		sceneBlock.append(b2);
		sceneBlock.append(wiggle);

		// 5.- elastic zoom
		var elasticSprite = new Block("1945-3-1.png"),
			// elastic scale to normal scale, in 2 seconds
			ea1 = new actions.Elastic({
				getter: 'getScale',
				setter: 'setScale'
			}, 1.0, 500);
		elasticSprite.setScale(0.3);
		elasticSprite.setPosition(180, 50, 0);
		elasticSprite.runAction(ea1);

		// 5.1.- elastic position
		var elasticSprite2 = new Block("1945-3-0.png"),
			ea2 = new actions.Elastic({
				getter: 'getPosition',
				setter: 'setPosition'
			}, [500, 100, 0], 1500);
		elasticSprite2.setPosition(100, 100, 0);
		elasticSprite2.runAction(ea2);

		sceneBlock.append(elasticSprite);
		sceneBlock.append(elasticSprite2);

		// 6.- parametric action, simulating a fade-in
		var fadeInSprite = new Block("1945-3-0.png"),
			// fade-in in 2 seconds
			fadeIn = new actions.Parametric({
				getter: 'getAlpha',
				setter: 'setAlpha'
			}, 1.0, 1000);
		fadeInSprite.setAlpha(0); // new shortcut
		fadeInSprite.setPosition(500, 320, 0);
		fadeInSprite.runAction(fadeIn);
		sceneBlock.append(fadeInSprite);

		// add a label so the user can know that he needs to unpause the scene
		//var label = new LabelBlock("Click Play to Start");
		//label.setPosition(320, 460, 0);
		//sceneBlock.append(label);

		core.togglePause();
		core.run();
	});

	$("#pause").click(function () {
		core.togglePause();
		$(this).val(core.isPaused() ? "Play" : "Pause");
	});
	$("#wiggle").click(function () {
		// two cycles of 15 degrees each, in one 300 milliseconds
		var action = new actions.Wiggle(oneDeg * 15, 2, 300);
		wiggle.runAction(action);
	});
});
