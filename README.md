# ChesterGL

## What is this?

ChesterGL (Chester Game Library) is a WebGL/canvas 2d game library that focuses on ease of use and performance. It supports a simple scene graph and provides a minimal interface for you to create games, and extend the library if you need. Current features: time based actions, simple scene graph, Tiled (tmx) map support, different shaders (webgl only), batched sprites.

The API is somewhat inspired in [cocos2d-iphone](https://github.com/cocos2d/cocos2d-iphone), but just inspired. It's not intended to be a port of cocos2d for WebGL.

## How to have fun

Get the latest "stable" release from here:

[http://funkaster.github.com/ChesterGL/chesterGL-latest.zip](http://funkaster.github.com/ChesterGL/chester-latest.zip)

Unzip, create your html webpage, add chester.min.js to the scripts, have fun :)
If you need help on how to do everything, the best idea would be to check the [online tests](http://funkaster.github.com/ChesterGL/test/)

Or look at the (not always updated) [online documentation](http://funkaster.github.com/ChesterGL/)

Sorry, the docs are not yet complete, but they will at some point :)
Just look at the examples and figure your way out from there. It shouldn't be too hard

Or wait until I write my "how to make an HTML5 game using chesterGL" (should be soon)

## How to join the fun

	 # clone the repo
	 git clone git://github.com/funkaster/ChesterGL.git
	 cd ChesterGL
     make debug

## How to just check this working

Point your browser (even your mobile browser!) to: [http://funkaster.github.com/ChesterGL/test/](http://funkaster.github.com/ChesterGL/test/)

## How to compile

You will need to modify the Makefile and change the location of closure compiler, as well as add the following externs:

* jquery-1.5.js
* webkit_console.js

All of them are in the svn repo of google closure. You also will need closure-compiler and the closure builder (+ the closure library, of course). You can read about that here:

https://developers.google.com/closure/library/docs/calcdeps

Check the Makefile for where to place them or modify that to suit your needs.

## How fast

The WebGL implementation might depend a lot on your graphic card, but I tried to make it very efficient, so it should go *very* fast with lots of sprites on the screen. Try to use BlockGroups (batched sprites) as much as you can. As a reference, you might want to look at the [performance test](http://funkaster.github.com/ChesterGL/test/test_perf.html), for my dev machine (4 years old MacBook Pro, Firefox 11), it's around 13,000 blocks at 33ms per frame (~ 30 frames per second).

For the canvas version, the is a bit more slow, but pretty decent even on iOS devices:

* iPhone 4, iOS 5.1 (test_ios.html, with 45 sprites on screen): 19.62ms per frame ~> 51 FPS
* Chrome 19 (Mac build) running test_perf.html: 17ms per frame, 10000 sprites ~> 58 FPS (YMMV)

## Known problems

<strike>There's a weird problem that makes textures not load the first time, so you might need to reload the page. On webgl I fixed this by reloading the asset if the texture2d binding failed, in canvas mode you will need to reload the page</strike>. This was fixed by the asset loader.

## Known problems in canvas mode

* You will not get a z-position, for really obvious reasons.
* Color tinting will not work (I haven't found a way to replace that part)
* Block groups (batched sprites) will not add any improvement, for obvious reasons

## What's with the name?

That's my dog's name. And I would like this library to have the same goals that my dog usually has

* Help you have fun (easy to learn)
* Always be ready to have fun (easy to use, docs, examples)
* Simple (simple API)
* Not very demanding (few dependencies)
* Fast and performant (Chester runs very fast and requires only food and water!)

## Roadmap

### 0.1

* Initial version

### 0.2

You can always look at the issues on the [github project](https://github.com/funkaster/ChesterGL/issues) and look for the right milestone.

* <strike>Fix BlockGroup (batched blocks in a single gl call)</strike>
* <strike>Improve canvas fallback</strike>
* <strike>Improve support for tile maps</strike>
* Improve speed on iOS (see test_ios.html). Right now we can get:
 * ~26fps with 12 moving sprites on an iPhone 4, iOS 4.3.5
 * ~35fps with 42 moving sprites on iTouch 4gen, iOS 5.0
* Improve support for Texture Packer sprite sheets
* <strike>Add time-based animations (shouldn't be too hard)</strike>

### 1.0

* Finish the webgl binding for iOS (what!?)
* Make it a real game library:
 * Add new interesting effects (light?)
 * Add more actions
* Add your ideas here
