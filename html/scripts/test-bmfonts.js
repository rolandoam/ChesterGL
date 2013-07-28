requirejs.config({
	shim: {
		'glmatrix': {
			exports: 'glmatrix'
		}
	}
});

require(["chester/core", "chester/block", "chester/bmFontLabelBlock"], function (core, Block, BMFont) {
	core.settings.useGoogleAnalytics = true;
	core.setup("demo-canvas");
	var oneDeg = Math.PI / 180.0;

	BMFont.loadFont("fonts/arial");
	BMFont.loadFont("fonts/alte_haas");
	BMFont.loadFont("fonts/alte_haas_nr");
	core.loadAsset("texture", "images/star.png");
	core.assetsLoaded("all", function () {
		var size = core.getViewportSize();
		// finish with the setup and run the game
		core.setupPerspective();

		var sceneBlock = new Block(null, Block.TYPE.SCENE);
		sceneBlock.title = "Test::BMFonts";
		core.setRunningScene(sceneBlock);

		// create a label
        var txt = "This is a\n" +
            "BitMap Font\n" +
            "with lines of very different length\n" +
            "and also lots of text\n" +
            "but also with lots of lines\n" +
            "this is the last one, also longer than the other ones\n" +
            "abcdefghijklmnopqrstuvwxyz 01234567890\n" +
            "abcdefghijklmnopqrstuvwxyz 01234567890\n" +
            "abcdefghijklmnopqrstuvwxyz 01234567890\n" +
            "áéíóúñ ÁÉÍÓÚÑ\n" +
            "abcdefghijklmnopqrstuvwxyz 01234567890";

		var label = new BMFont(txt, "fonts/arial");
		label.setAnchorPoint(0, 0);
		label.setPosition(size.width/2 - 150, size.height/2 - 30, 0);
		label.setColor([1, 0, 0, 1]);

        var otherLabel = new BMFont("120", "fonts/alte_haas");
        otherLabel.setAnchorPoint(1, 0.5);
        otherLabel.setPosition(size.width - 5, 100, 0);

        var otherLabelNR = new BMFont("120", "fonts/alte_haas_nr");
        otherLabelNR.setAnchorPoint(1, 0.5);
        otherLabelNR.setPosition(size.width - 5, 50, 0);

		sceneBlock.append(label, otherLabel, otherLabelNR);
		core.run();
	});
});
