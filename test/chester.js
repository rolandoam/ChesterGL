var vec2 = {create:function(h) {
  var a = new Float32Array(2);
  h && (a[0] = h[0], a[1] = h[1]);
  return a
}};
HTMLCanvasElement._canvas_tmp_mouse = vec3.create();
HTMLCanvasElement.prototype.relativePosition = function(h) {
  var a = HTMLCanvasElement._canvas_tmp_mouse;
  a[0] = 0;
  a[1] = 0;
  h.x != void 0 && h.y != void 0 ? (a[0] = h.x, a[1] = h.y) : (a[0] = h.clientX + document.body.scrollLeft + document.documentElement.scrollLeft, a[1] = h.clientY + document.body.scrollTop + document.documentElement.scrollTop);
  a[0] -= this.offsetLeft;
  a[1] = this.height - (a[1] - this.offsetTop);
  return a
};
window.requestAnimFrame = function() {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(h) {
    window.setTimeout(h, 1E3 / 60)
  }
}();
window.requestAnimFrame = window.requestAnimFrame;
(function(h) {
  var a = {exportProperty:function(a, b, d) {
    a[b] = d
  }, gl:null, _paused:false, useGoogleAnalytics:false, programs:{}, currentProgram:null, pMatrix:null, runningScene:null, canvas:null, projection:"3d", webglMode:true, usesOffscreenBuffer:false, assets:{}, assetsHandlers:{}, assetsLoaders:{}, assetsLoadedListeners:{}};
  a.lastTime = (new Date).getTime();
  a.delta = 0;
  a.fps = 0;
  a.debugSpan = null;
  a.debugSpanId = "debug-info";
  a.update = null;
  a.mouseEvents = {DOWN:0, MOVE:1, UP:2};
  a.mouseHandlers = [];
  a.selectProgram = function(a) {
    var b = this.programs[a], d = this.gl;
    if(a != this.currentProgram) {
      this.currentProgram = a;
      d.validateProgram(b);
      d.useProgram(b);
      for(var e in b.attribs) {
        d.enableVertexAttribArray(b.attribs[e])
      }
    }
    return b
  };
  a.setup = function(a) {
    this.initGraphics(document.getElementById(a));
    this.webglMode && this.initDefaultShaders();
    this.debugSpan = document.getElementById("debug-info");
    this.registerAssetHandler("texture", this.defaultTextureHandler);
    this.registerAssetLoader("texture", this.defaultTextureLoader);
    this.registerAssetLoader("default", this.defaultAssetLoader)
  };
  a.initGraphics = function(a) {
    try {
      if(this.canvas = a, this.webglMode) {
        this.gl = a.getContext("experimental-webgl", {alpha:false, antialias:false})
      }
    }catch(b) {
      console.log("ERROR: " + b)
    }
    if(!this.gl) {
      this.gl = a.getContext("2d");
      this.usesOffscreenBuffer ? (this.offCanvas = document.createElement("canvas"), this.offCanvas.width = a.width, this.offCanvas.height = a.height, this.offContext = this.offCanvas.getContext("2d"), this.offContext.viewportWidth = a.width, this.offContext.viewportHeight = a.height, this.exportProperty(this, "offContext", this.offContext), this.exportProperty(this.offContext, "viewportWidth", this.offContext.viewportWidth), this.exportProperty(this.offContext, "viewportHeight", this.offContext.viewportHeight)) : 
      this.offContext = this.gl;
      if(!this.gl || !this.offContext) {
        throw"Error initializing graphic context!";
      }
      this.webglMode = false
    }
    this.exportProperty(this, "gl", this.gl);
    this.canvasResized();
    this.installMouseHandlers()
  };
  a.canvasResized = function() {
    var a = this.canvas;
    this.gl.viewportWidth = a.width;
    this.gl.viewportHeight = a.height;
    this.exportProperty(this.gl, "viewportWidth", this.gl.viewportWidth);
    this.exportProperty(this.gl, "viewportHeight", this.gl.viewportHeight)
  };
  a.initDefaultShaders = function() {
    var c = this.gl;
    this.initShader("default", function(b) {
      b.mvpMatrixUniform = c.getUniformLocation(b, "uMVPMatrix");
      b.attribs = {vertexPositionAttribute:c.getAttribLocation(b, "aVertexPosition"), vertexColorAttribute:c.getAttribLocation(b, "aVertexColor")};
      a.exportProperty(b, "mvpMatrixUniform", b.mvpMatrixUniform);
      a.exportProperty(b, "attribs", b.attribs)
    });
    this.initShader("texture", function(b) {
      b.mvpMatrixUniform = c.getUniformLocation(b, "uMVPMatrix");
      b.samplerUniform = c.getUniformLocation(b, "uSampler");
      b.attribs = {vertexColorAttribute:c.getAttribLocation(b, "aVertexColor"), textureCoordAttribute:c.getAttribLocation(b, "aTextureCoord"), vertexPositionAttribute:c.getAttribLocation(b, "aVertexPosition")};
      a.exportProperty(b, "mvpMatrixUniform", b.mvpMatrixUniform);
      a.exportProperty(b, "samplerUniform", b.samplerUniform);
      a.exportProperty(b, "attribs", b.attribs)
    })
  };
  a.initShader = function(a, b) {
    var d = this.gl, e = this.loadShader(a, "frag"), g = this.loadShader(a, "vert"), i = d.createShader(d.FRAGMENT_SHADER);
    d.shaderSource(i, e);
    d.compileShader(i);
    d.getShaderParameter(i, d.COMPILE_STATUS) ? (e = d.createShader(d.VERTEX_SHADER), d.shaderSource(e, g), d.compileShader(e), d.getShaderParameter(e, d.COMPILE_STATUS) ? (d = this.createShader(a, i, e), b && b(d)) : console.log("problem compiling vertex shader " + a + "(" + d.getShaderInfoLog(e) + "):\n" + g)) : console.log("problem compiling fragment shader " + a + "(" + d.getShaderInfoLog(i) + "):\n" + e)
  };
  a.loadShader = function(a, b) {
    var d = null;
    $.ajax({url:"shaders/" + a + "." + b, async:false, type:"GET", success:function(a, c) {
      c == "success" ? d = a : console.log("error getting the shader data")
    }});
    return d
  };
  a.createShader = function(a, b, d) {
    var e = this.gl, g = e.createProgram();
    e.attachShader(g, b);
    e.attachShader(g, d);
    e.linkProgram(g);
    e.getProgramParameter(g, e.LINK_STATUS) || console.log("problem linking shader");
    return this.programs[a] = g
  };
  a.registerAssetHandler = function(a, b) {
    this.assetsHandlers[a] = b
  };
  a.registerAssetLoader = function(a, b) {
    this.assetsLoaders[a] = b
  };
  a.loadAsset = function(a, b, d) {
    var e = void 0;
    if(typeof b == "object") {
      e = b.dataType, b = b.path
    }
    this.assets[a] || (this.assets[a] = {});
    var g = this.assets[a];
    if(g[b]) {
      if(g[b].status == "loading") {
        d && g[b].listeners.push(d)
      }else {
        if(g[b].status == "loaded") {
          d && d(g[b].data)
        }else {
          if(g[b].status == "try") {
            g[b].status = "loading";
            if(this.assetsLoaders[a]) {
              this.assetsLoaders[a](a, {url:b, dataType:e})
            }else {
              this.assetsLoaders["default"](a, {url:b, dataType:e})
            }
            d && g[b].listeners.push(d)
          }
        }
      }
    }else {
      g[b] = {data:null, status:"try", listeners:[]}, d && g[b].listeners.push(d), this.loadAsset(a, {path:b, dataType:e})
    }
  };
  a.assetsLoaded = function(a, b) {
    var d = this.assetsLoadedListeners[a];
    d || (this.assetsLoadedListeners[a] = [], d = this.assetsLoadedListeners[a]);
    b && d.push(b);
    var e = true;
    if(a == "all") {
      for(var g in this.assets) {
        var i = this.assets[g], f;
        for(f in i) {
          if(i[f].status != "loaded") {
            e = false;
            break
          }
        }
        if(!e) {
          break
        }
      }
    }else {
      for(f in i = this.assets[a], i) {
        if(i[f].status != "loaded") {
          e = false;
          break
        }
      }
    }
    if(e) {
      for(;e = d.shift();) {
        e()
      }
    }
  };
  a.getAsset = function(a, b) {
    return this.assets[a][b].data
  };
  a.prepareWebGLTexture = function(a) {
    var b = this.gl, d = true;
    try {
      var e = 0;
      b.pixelStorei(b.UNPACK_FLIP_Y_WEBGL, 1);
      b.bindTexture(b.TEXTURE_2D, a.tex);
      b.texImage2D(b.TEXTURE_2D, 0, b.RGBA, b.RGBA, b.UNSIGNED_BYTE, a);
      e = b.getError();
      e != 0 && (console.log("gl error " + e), d = false);
      b.texParameteri(b.TEXTURE_2D, b.TEXTURE_MAG_FILTER, b.LINEAR);
      b.texParameteri(b.TEXTURE_2D, b.TEXTURE_MIN_FILTER, b.LINEAR);
      b.bindTexture(b.TEXTURE_2D, null)
    }catch(g) {
      console.log("got some error: " + g), d = false
    }
    return d
  };
  a.defaultTextureHandler = function(c, b) {
    if(a.webglMode) {
      b.tex = a.gl.createTexture()
    }
    a.assets.texture[c].data = b;
    return a.webglMode ? a.prepareWebGLTexture(b) : true
  };
  a.defaultTextureLoader = function(c, b) {
    var d = new Image, e = b.url;
    d.addEventListener("load", function() {
      var b = a.assets.texture[e];
      if(a.assetsHandlers[c](e, d)) {
        b.status = "loaded";
        for(var i;i = b.listeners.shift();) {
          i(b.data)
        }
        a.assetsLoaded(c);
        a.assetsLoaded("all")
      }else {
        b.status = "try", a.loadAsset(c, e)
      }
    }, false);
    d.src = e
  };
  a.defaultAssetLoader = function(c, b) {
    var d = b.url;
    $.ajax({url:d, dataType:b.dataType, success:function(b, g) {
      var i = a.assets[c][d];
      if(g == "success") {
        if(a.assetsHandlers[c](d, b)) {
          i.status = "loaded";
          for(var f;f = i.listeners.shift();) {
            f(i.data)
          }
          a.assetsLoaded(c);
          a.assetsLoaded("all")
        }else {
          i.status = "try", a.loadAsset(c, d)
        }
      }else {
        console.log("Error loading asset " + d)
      }
    }})
  };
  a.setupPerspective = function() {
    var a = this.gl;
    if(this.webglMode) {
      a.clearColor(0, 0, 0, 1);
      a.blendFunc(a.SRC_ALPHA, a.ONE_MINUS_SRC_ALPHA);
      a.enable(a.BLEND);
      a.disable(a.DEPTH_TEST);
      var b = a.viewportWidth, d = a.viewportHeight;
      a.viewport(0, 0, b, d);
      this.pMatrix = mat4.create();
      if(this.projection == "2d") {
        console.log("setting up 2d projection (" + b + "," + d + ")"), mat4.ortho(0, b, 0, d, -1024, 1024, this.pMatrix)
      }else {
        if(this.projection == "3d") {
          console.log("setting up 3d projection (" + b + "," + d + ")");
          var e = d / 1.1566, a = mat4.perspective(60, b / d, 0.5, 1500), e = vec3.create([b / 2, d / 2, e]), b = vec3.create([b / 2, d / 2, 0]), d = vec3.create([0, 1, 0]), b = mat4.lookAt(e, b, d);
          mat4.multiply(a, b, this.pMatrix)
        }else {
          throw"Invalid projection: " + this.projection;
        }
      }
    }
  };
  a.setRunningScene = function(a) {
    this.runningScene = a
  };
  a.drawScene = function() {
    var a = void 0;
    this.webglMode ? (a = this.gl, a.clear(a.COLOR_BUFFER_BIT | a.DEPTH_BUFFER_BIT)) : (a = this.offContext, a.setTransform(1, 0, 0, 1, 0, 0), a.fillRect(0, 0, a.viewportWidth, a.viewportHeight));
    this.runningScene && this.runningScene.visit();
    !this.webglMode && this.usesOffscreenBuffer && (a.fillRect(0, 0, a.viewportWidth, a.viewportHeight), a.drawImage(this.offCanvas, 0, 0));
    a = (new Date).getTime();
    this.delta = a - this.lastTime;
    this.lastTime = a
  };
  a.lastDebugSecond_ = Date.now();
  a.elapsed_ = 0;
  a.frames_ = 0;
  a.sampledAvg = 0;
  a.sumAvg = 0;
  a.updateDebugTime = function() {
    var c = Date.now();
    this.elapsed_ += this.delta;
    this.frames_++;
    if(c - this.lastDebugSecond_ > 1E3) {
      var b = this.elapsed_ / this.frames_;
      this.sumAvg += b;
      this.sampledAvg++;
      if(this.debugSpan) {
        this.debugSpan.textContent = b.toFixed(2)
      }
      if(this.useGoogleAnalytics && this.sampledAvg > 5) {
        _gaq.push(["_trackEvent", "ChesterGL", "renderTime-" + this.webglMode, a.runningScene.title, Math.floor(this.sumAvg / this.sampledAvg)]), this.sumAvg = this.sampledAvg = 0
      }
      this.elapsed_ = this.frames_ = 0;
      this.lastDebugSecond_ = c
    }
  };
  a.installMouseHandlers = function() {
    $(this.canvas).mousedown(a.mouseDownHandler);
    $(this.canvas).mousemove(a.mouseMoveHandler);
    $(this.canvas).mouseup(a.mouseUpHandler)
  };
  a.mouseDownHandler = function(c) {
    for(var c = a.canvas.relativePosition(c), b = 0, d = a.mouseHandlers.length;b < d;b++) {
      a.mouseHandlers[b](c, a.mouseEvents.DOWN)
    }
  };
  a.mouseMoveHandler = function(c) {
    for(var c = a.canvas.relativePosition(c), b = 0, d = a.mouseHandlers.length;b < d;b++) {
      a.mouseHandlers[b](c, a.mouseEvents.MOVE)
    }
  };
  a.mouseUpHandler = function(c) {
    for(var c = a.canvas.relativePosition(c), b = 0, d = a.mouseHandlers.length;b < d;b++) {
      a.mouseHandlers[b](c, a.mouseEvents.UP)
    }
  };
  a.addMouseHandler = function(a) {
    this.mouseHandlers.indexOf(a) == -1 && this.mouseHandlers.push(a)
  };
  a.removeMouseHandler = function(a) {
    a = this.mouseHandlers.indexOf(a);
    a > 0 && this.mouseHandlers.splice(a, 1)
  };
  a.run = function() {
    a._paused || (h.requestAnimFrame(a.run, a.canvas), a.drawScene(), a.ActionManager.tick(a.delta), a.updateDebugTime())
  };
  a.togglePause = function() {
    a._paused ? (a._paused = false, a.run()) : a._paused = true
  };
  h.ChesterGL = a;
  a.exportProperty(a, "useGoogleAnalytics", a.useGoogleAnalytics);
  a.exportProperty(a, "projection", a.projection);
  a.exportProperty(a, "webglMode", a.webglMode);
  a.exportProperty(a, "usesOffscreenBuffer", a.usesOffscreenBuffer);
  a.exportProperty(a, "debugSpanId", a.debugSpanId);
  a.exportProperty(a, "update", a.update);
  a.exportProperty(a, "mouseEvents", a.mouseEvents);
  a.exportProperty(a.mouseEvents, "DOWN", a.mouseEvents.DOWN);
  a.exportProperty(a.mouseEvents, "MOVE", a.mouseEvents.MOVE);
  a.exportProperty(a.mouseEvents, "UP", a.mouseEvents.UP);
  a.exportProperty(a, "setup", a.setup);
  a.exportProperty(a, "canvasResized", a.canvasResized);
  a.exportProperty(a, "initShader", a.initShader);
  a.exportProperty(a, "registerAssetHandler", a.registerAssetHandler);
  a.exportProperty(a, "loadAsset", a.loadAsset);
  a.exportProperty(a, "assetsLoaded", a.assetsLoaded);
  a.exportProperty(a, "getAsset", a.getAsset);
  a.exportProperty(a, "setupPerspective", a.setupPerspective);
  a.exportProperty(a, "setRunningScene", a.setRunningScene);
  a.exportProperty(a, "drawScene", a.drawScene);
  a.exportProperty(a, "run", a.run);
  a.exportProperty(a, "togglePause", a.togglePause)
})(window);
(function(h) {
  var a = h.ChesterGL;
  a.Block = function(c, b, d) {
    this.type = b || a.Block.TYPE.STANDALONE;
    if(d) {
      this.parent = d
    }
    this.children = [];
    this.program = a.Block.PROGRAM.DEFAULT;
    c && (typeof c === "string" ? (c = a.BlockFrames.getFrame(c), this.setTexture(c.texture), this.setFrame(c.frame)) : this.setFrame(c));
    this.type == a.Block.TYPE.STANDALONE && this.setColor([1, 1, 1, 1]);
    if(a.webglMode && this.type == a.Block.TYPE.STANDALONE && (!d || d.type != a.Block.TYPE.BLOCKGROUP)) {
      this.glBuffer = a.gl.createBuffer(), this.glBufferData = new Float32Array(a.Block.BUFFER_SIZE)
    }
    this.mvMatrix = mat4.create();
    this.mvpMatrix = mat4.create();
    mat4.identity(this.mvMatrix);
    this._scheduledAdd = [];
    this._scheduledRemove = []
  };
  a.Block.PROGRAM = {DEFAULT:0, TEXTURE:1};
  a.Block.PROGRAM_NAME = ["default", "texture"];
  a.Block.TYPE = {STANDALONE:0, BLOCKGROUP:1, SCENE:2, TMXBLOCK:3, PARTICLE:4};
  a.Block.QUAD_SIZE = 36;
  a.Block.BUFFER_SIZE = 36;
  a.Block.DEG_TO_RAD = Math.PI / 180;
  a.Block.RAD_TO_DEG = 180 / Math.PI;
  a.Block.FullFrame = quat4.create([0, 0, 1, 1]);
  a.Block.SizeZero = vec2.create([0, 0]);
  a.Block.prototype.title = "";
  a.Block.prototype.mvMatrix = null;
  a.Block.prototype.mvpMatrix = null;
  a.Block.prototype.visible = true;
  a.Block.prototype.isTransformDirty = false;
  a.Block.prototype.isColorDirty = false;
  a.Block.prototype.isFrameDirty = false;
  a.Block.prototype.baseBufferIndex = 0;
  a.Block.prototype.glBuffer = null;
  a.Block.prototype.glBufferData = null;
  a.Block.prototype.position = vec3.create();
  a.Block.prototype.contentSize = null;
  a.Block.prototype.color = quat4.create([1, 1, 1, 1]);
  a.Block.prototype.texture = null;
  a.Block.prototype.opacity = 1;
  a.Block.prototype.rotation = 0;
  a.Block.prototype.scale = 1;
  a.Block.prototype.update = null;
  a.Block.prototype.frame = null;
  a.Block.prototype.parent = null;
  a.Block.prototype.children = null;
  a.Block.prototype._scheduledAdd = null;
  a.Block.prototype._scheduledRemove = null;
  a.Block.prototype._inVisit = false;
  a.Block.prototype.setFrame = function(a) {
    this.frame = quat4.create(a);
    this.setContentSize([a[2], a[3]]);
    this.isFrameDirty = true
  };
  a.Block.prototype.setContentSize = function(a) {
    this.contentSize = vec2.create(a);
    this.isFrameDirty = true
  };
  a.Block.prototype.setScale = function(a) {
    this.scale = a;
    this.isTransformDirty = true
  };
  a.Block.prototype.setColor = function(a) {
    this.color = quat4.create(a);
    this.isColorDirty = true
  };
  a.Block.prototype.setTexture = function(c) {
    this.texture = c;
    this.program = a.Block.PROGRAM.TEXTURE;
    var b = this;
    a.loadAsset("texture", c, function(a) {
      b.contentSize || b.setContentSize([a.width, a.height]);
      b.frame || b.setFrame([0, 0, a.width, a.height])
    })
  };
  a.Block.prototype.moveTo = function(c, b) {
    if(b) {
      var d = new a.MoveToAction(this, b, c);
      a.ActionManager.scheduleAction(d)
    }else {
      this.position = vec3.create(c), this.isTransformDirty = true
    }
  };
  a.Block.prototype.moveBy = function(a) {
    vec3.add(this.position, a);
    this.isTransformDirty = true
  };
  a.Block.prototype.rotateTo = function(c) {
    this.rotation = (a.webglMode ? -1 : 1) * c * a.Block.DEG_TO_RAD;
    this.isTransformDirty = true
  };
  a.Block.prototype.rotateBy = function(c) {
    this.rotation += (a.webglMode ? -1 : 1) * c * a.Block.DEG_TO_RAD;
    this.isTransformDirty = true
  };
  a.Block.prototype.addChild = function(a) {
    if(a.parent) {
      throw"can't add a block twice!";
    }
    this._inVisit ? this._scheduledAdd.push(a) : (this.children.push(a), a.parent = this)
  };
  a.Block.prototype.removeChild = function(a) {
    if(!a.parent || a.parent != this) {
      throw"not our child!";
    }
    this._inVisit ? this._scheduledRemove.push(a) : (a = this.children.indexOf(a), a >= 0 && this.children.splice(a, 1))
  };
  a.Block.prototype.transform = function() {
    var c = a.gl;
    if(this.isTransformDirty || this.parent && this.parent.isTransformDirty) {
      mat4.identity(this.mvMatrix);
      mat4.translate(this.mvMatrix, this.position);
      mat4.rotate(this.mvMatrix, this.rotation, [0, 0, 1]);
      mat4.scale(this.mvMatrix, [this.scale, this.scale, 1]);
      var b = this.parent ? this.parent.mvMatrix : null;
      b && mat4.multiply(b, this.mvMatrix, this.mvMatrix)
    }
    if(this.type != a.Block.TYPE.BLOCKGROUP) {
      var b = this.glBufferData, d = this.parent && this.parent.type == a.Block.TYPE.BLOCKGROUP;
      if(a.webglMode) {
        !d && (this.isFrameDirty || this.isColorDirty) && c.bindBuffer(c.ARRAY_BUFFER, this.glBuffer);
        if(this.isFrameDirty || d && this.isTransformDirty) {
          var e = 9, g = this.contentSize[0] * 0.5, i = this.contentSize[1] * 0.5, f = this.baseBufferIndex * a.Block.BUFFER_SIZE, h = this.position[2];
          if(d) {
            var l = [g, i, 0], k = [-g, i, 0], j = [g, -i, 0], g = [-g, -i, 0];
            mat4.multiplyVec3(this.mvMatrix, l);
            mat4.multiplyVec3(this.mvMatrix, k);
            mat4.multiplyVec3(this.mvMatrix, g);
            mat4.multiplyVec3(this.mvMatrix, j);
            b[f] = g[0];
            b[f + 1] = g[1];
            b[f + 2] = h;
            b[f + e] = k[0];
            b[f + 1 + e] = k[1];
            b[f + 2 + e] = h;
            b[f + 2 * e] = j[0];
            b[f + 1 + 2 * e] = j[1];
            b[f + 2 + 2 * e] = h;
            b[f + 3 * e] = l[0];
            b[f + 1 + 3 * e] = l[1];
            b[f + 2 + 3 * e] = h
          }else {
            b[f] = -g, b[f + 1] = -i, b[f + 2] = 0, b[f + e] = -g, b[f + 1 + e] = i, b[f + 2 + e] = 0, b[f + 2 * e] = g, b[f + 1 + 2 * e] = -i, b[f + 2 + 2 * e] = 0, b[f + 3 * e] = g, b[f + 1 + 3 * e] = i, b[f + 2 + 3 * e] = 0
          }
          if(this.program == a.Block.PROGRAM.TEXTURE) {
            h = a.getAsset("texture", this.texture), k = h.width, j = h.height, h = this.frame[0] / k, l = this.frame[1] / j, k = this.frame[2] / k, j = this.frame[3] / j, f += 3, b[f] = h, b[f + 1] = l, b[f + e] = h, b[f + 1 + e] = l + j, b[f + 2 * e] = h + k, b[f + 1 + 2 * e] = l, b[f + 3 * e] = h + k, b[f + 1 + 3 * e] = l + j
          }
        }
        if(this.isColorDirty) {
          f = 5 + this.baseBufferIndex * a.Block.BUFFER_SIZE;
          h = this.color;
          l = this.opacity;
          for(k = 0;k < 4;k++) {
            b[f + e * k] = h[0] * l, b[f + 1 + e * k] = h[1] * l, b[f + 2 + e * k] = h[2] * l, b[f + 3 + e * k] = h[3] * l
          }
        }
        a.webglMode && !d && (this.isFrameDirty || this.isColorDirty) && c.bufferData(c.ARRAY_BUFFER, this.glBufferData, c.STATIC_DRAW)
      }
    }
  };
  a.Block.prototype.visit = function() {
    this._inVisit = true;
    this.update && this.update(a.delta);
    if(this.visible) {
      this.transform();
      for(var c = this.children, b = c.length, d = 0;d < b;d++) {
        c[d].visit()
      }
      (!this.parent || this.parent.type != a.Block.TYPE.BLOCKGROUP) && this.render();
      for(this._inVisit = this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false;c = this._scheduledAdd.shift();) {
        this.addChild(c)
      }
      for(;c = this._scheduledRemove.shift();) {
        this.removeChild(c)
      }
    }else {
      this._inVisit = false
    }
  };
  a.Block.prototype.render = function() {
    if(this.type == a.Block.TYPE.BLOCKGROUP) {
      throw"Cannot call render on a BlockGroup block!";
    }
    if(this.type != a.Block.TYPE.SCENE) {
      if(a.webglMode) {
        var c = a.gl, b = a.selectProgram(a.Block.PROGRAM_NAME[this.program]);
        c.bindBuffer(c.ARRAY_BUFFER, this.glBuffer);
        var d = a.Block.QUAD_SIZE;
        c.vertexAttribPointer(b.attribs.vertexPositionAttribute, 3, c.FLOAT, false, d, 0);
        c.vertexAttribPointer(b.attribs.vertexColorAttribute, 4, c.FLOAT, false, d, 20);
        if(this.program != a.Block.PROGRAM.DEFAULT && this.program == a.Block.PROGRAM.TEXTURE) {
          var e = a.getAsset("texture", this.texture);
          c.vertexAttribPointer(b.attribs.textureCoordAttribute, 2, c.FLOAT, false, d, 12);
          c.activeTexture(c.TEXTURE0);
          c.bindTexture(c.TEXTURE_2D, e.tex);
          c.uniform1i(b.samplerUniform, 0)
        }
        (this.isTransformDirty || this.parent && this.parent.isTransformDirty) && mat4.multiply(a.pMatrix, this.mvMatrix, this.mvpMatrix);
        c.uniformMatrix4fv(b.mvpMatrixUniform, false, this.mvpMatrix);
        c.drawArrays(c.TRIANGLE_STRIP, 0, 4)
      }else {
        if(c = a.offContext, this.program == a.Block.PROGRAM.TEXTURE) {
          b = this.mvMatrix;
          e = a.getAsset("texture", this.texture);
          c.globalAlpha = this.opacity;
          c.setTransform(b[0], b[1], b[4], b[5], b[12], c.viewportHeight - b[13]);
          var b = this.contentSize[0], d = this.contentSize[1], g = this.frame;
          c.drawImage(e, g[0], e.height - (g[1] + d), g[2], g[3], -b / 2, -d / 2, b, d)
        }
      }
    }
  };
  a.Block = a.Block;
  a.exportProperty(a.Block, "FullFrame", a.Block.FullFrame);
  a.exportProperty(a.Block, "SizeZero", a.Block.SizeZero);
  a.exportProperty(a.Block, "TYPE", a.Block.TYPE);
  a.exportProperty(a.Block, "PROGRAM", a.Block.PROGRAM);
  a.exportProperty(a.Block, "PROGRAM_NAME", a.Block.PROGRAM_NAME);
  a.exportProperty(a.Block, "create", a.Block.create);
  a.exportProperty(a.Block.prototype, "visible", a.Block.prototype.visible);
  a.exportProperty(a.Block.prototype, "position", a.Block.prototype.position);
  a.exportProperty(a.Block.prototype, "contentSize", a.Block.prototype.contentSize);
  a.exportProperty(a.Block.prototype, "color", a.Block.prototype.color);
  a.exportProperty(a.Block.prototype, "texture", a.Block.prototype.texture);
  a.exportProperty(a.Block.prototype, "opacity", a.Block.prototype.opacity);
  a.exportProperty(a.Block.prototype, "rotation", a.Block.prototype.rotation);
  a.exportProperty(a.Block.prototype, "scale", a.Block.prototype.scale);
  a.exportProperty(a.Block.prototype, "update", a.Block.prototype.update);
  a.exportProperty(a.Block.prototype, "frame", a.Block.prototype.frame);
  a.exportProperty(a.Block.prototype, "parent", a.Block.prototype.parent);
  a.exportProperty(a.Block.prototype, "children", a.Block.prototype.children);
  a.exportProperty(a.Block.prototype, "setFrame", a.Block.prototype.setFrame);
  a.exportProperty(a.Block.prototype, "setContentSize", a.Block.prototype.setContentSize);
  a.exportProperty(a.Block.prototype, "setScale", a.Block.prototype.setScale);
  a.exportProperty(a.Block.prototype, "setColor", a.Block.prototype.setColor);
  a.exportProperty(a.Block.prototype, "setTexture", a.Block.prototype.setTexture);
  a.exportProperty(a.Block.prototype, "moveTo", a.Block.prototype.moveTo);
  a.exportProperty(a.Block.prototype, "moveBy", a.Block.prototype.moveBy);
  a.exportProperty(a.Block.prototype, "rotateTo", a.Block.prototype.rotateTo);
  a.exportProperty(a.Block.prototype, "rotateBy", a.Block.prototype.rotateBy);
  a.exportProperty(a.Block.prototype, "addChild", a.Block.prototype.addChild);
  a.exportProperty(a.Block.prototype, "removeChild", a.Block.prototype.removeChild)
})(window);
(function(h) {
  var a = h.ChesterGL;
  a.BlockGroup = function(c, b) {
    if(!a.webglMode) {
      throw"BlockGroup only works on WebGL mode";
    }
    a.Block.call(this, null, a.Block.TYPE.BLOCKGROUP);
    c ? (this.texture = c, this.program = a.Block.PROGRAM.TEXTURE) : this.program = a.Block.PROGRAM.DEFAULT;
    this.maxChildren = b || 10;
    this.createBuffers()
  };
  a.BlockGroup.prototype = Object.create(a.Block.prototype);
  a.BlockGroup.prototype.maxChildren = 0;
  a.BlockGroup.prototype.isChildDirty = false;
  a.BlockGroup.prototype.indexBuffer = null;
  a.BlockGroup.prototype.indexBufferData = null;
  a.BlockGroup.prototype.createBuffers = function() {
    var c = a.gl;
    this.glBuffer = c.createBuffer();
    this.glBufferData = new Float32Array(a.Block.QUAD_SIZE * this.maxChildren);
    this.indexBuffer = c.createBuffer();
    this.indexBufferData = new Uint16Array(6 * this.maxChildren)
  };
  a.BlockGroup.prototype.createBlock = function(c) {
    c = new a.Block(c, a.Block.TYPE.STANDALONE, this);
    this.texture && c.setTexture(this.texture);
    return c
  };
  a.BlockGroup.prototype.addChild = function(a) {
    if(this.children.length >= this.maxChildren) {
      throw"Error: too many children - Make the initial size of the BlockGroup larger";
    }
    if(a.parent != this) {
      throw"Invalid child: can only add children created with BlockGroup.create";
    }
    if(this.texture) {
      if(this.texture != a.texture) {
        throw"Invalid child: only can add child with the same texture";
      }
    }else {
      this.texture = a.texture
    }
    this.children.push(a);
    a.baseBufferIndex = this.children.length - 1;
    a.glBufferData = this.glBufferData;
    this.isChildDirty = true
  };
  a.BlockGroup.prototype.recreateIndices = function(c) {
    for(var b = (this.indexBufferData[c * 6 - 1] || -1) + 1, d = Math.max(this.children.length, 1);c < d;c++) {
      var e = c * 6;
      this.indexBufferData[e + 0] = b;
      this.indexBufferData[e + 1] = b + 1;
      this.indexBufferData[e + 2] = b + 2;
      this.indexBufferData[e + 3] = b + 2;
      this.indexBufferData[e + 4] = b + 1;
      this.indexBufferData[e + 5] = b + 3;
      b += 4
    }
    b = a.gl;
    b.bindBuffer(b.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    b.bufferData(b.ELEMENT_ARRAY_BUFFER, this.indexBufferData, b.STATIC_DRAW)
  };
  a.BlockGroup.prototype.removeBlock = function() {
    throw"not implemented";
  };
  a.BlockGroup.prototype.visit = function() {
    this.update && this.update(a.delta);
    if(this.visible) {
      this.transform();
      for(var c = this.children, b = c.length, d = 0;d < b;d++) {
        c[d].visit()
      }
      c = a.gl;
      c.bindBuffer(c.ARRAY_BUFFER, this.glBuffer);
      c.bufferData(c.ARRAY_BUFFER, this.glBufferData, c.STATIC_DRAW);
      if(this.isChildDirty) {
        this.recreateIndices(0), this.isChildDirty = false
      }
      this.render();
      this.isFrameDirty = this.isColorDirty = this.isTransformDirty = false
    }
  };
  a.BlockGroup.prototype.render = function() {
    var c = a.gl, b = a.selectProgram(a.Block.PROGRAM_NAME[this.program]), d = this.children.length, e = a.Block.QUAD_SIZE;
    c.bindBuffer(c.ARRAY_BUFFER, this.glBuffer);
    c.vertexAttribPointer(b.attribs.vertexPositionAttribute, 3, c.FLOAT, false, e, 0);
    if(this.program != a.Block.PROGRAM.DEFAULT && this.program == a.Block.PROGRAM.TEXTURE) {
      var g = a.getAsset("texture", this.texture);
      c.vertexAttribPointer(b.attribs.textureCoordAttribute, 2, c.FLOAT, false, e, 12);
      c.activeTexture(c.TEXTURE0);
      c.bindTexture(c.TEXTURE_2D, g.tex);
      c.uniform1i(b.samplerUniform, 0)
    }
    c.vertexAttribPointer(b.attribs.vertexColorAttribute, 4, c.FLOAT, false, e, 20);
    c.bindBuffer(c.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    mat4.multiply(a.pMatrix, this.mvMatrix, this.mvpMatrix);
    c.uniformMatrix4fv(b.mvpMatrixUniform, false, this.mvpMatrix);
    c.drawElements(c.TRIANGLES, d * 6, c.UNSIGNED_SHORT, 0)
  };
  a.BlockGroup = a.BlockGroup;
  a.exportProperty(a.BlockGroup.prototype, "createBlock", a.BlockGroup.prototype.createBlock)
})(window);
(function(h) {
  var a = h.ChesterGL, c = {frames:{}};
  c.loadJSON = function(b) {
    if(b.meta && b.meta.version == "1.0") {
      var d = b.meta.image;
      a.loadAsset("texture", d, function(a) {
        var a = a.height, g = b.frames, h;
        for(h in g) {
          var f = g[h], u = {frame:{}, texture:""};
          u.frame = quat4.create([f.frame.x, a - (f.frame.y + f.frame.h), f.frame.w, f.frame.h]);
          u.texture = d;
          c.frames[h] = u
        }
      })
    }else {
      throw"Unkown json data";
    }
  };
  c.getFrame = function(a) {
    return c.frames[a]
  };
  c.loadFrames = function(a) {
    console.log("loadFrames: will fetch " + a);
    $.ajax({url:a, async:false, dataType:"json", success:function(a, b) {
      b == "success" && c.loadJSON(a)
    }})
  };
  a.BlockFrames = c;
  a.exportProperty(c, "getFrame", c.getFrame);
  a.exportProperty(c, "loadFrames", c.loadFrames)
})(window);
(function(h) {
  var a = h.ChesterGL;
  a.TMXBlock = function(c) {
    c = a.TMXBlock.maps[c];
    if(!c) {
      throw"Invalid map - make sure you call loadTMX first";
    }
    a.Block.call(this, null, a.Block.TYPE.TMXBLOCK);
    for(var b = 0;b < c.layers.length;b++) {
      for(var d = c.layers[b], e = a.webglMode ? new a.BlockGroup(c.texture, d.blocks.length) : new a.Block, g = 0;g < d.blocks.length;g++) {
        var h = d.blocks[g], f = void 0;
        a.webglMode ? f = e.createBlock(h.frame) : (f = new a.Block(h.frame), f.setTexture(c.texture));
        f.moveTo(h.position);
        e.addChild(f)
      }
      this.addChild(e)
    }
  };
  a.TMXBlock.prototype = Object.create(a.Block.prototype);
  a.TMXBlock.prototype.render = function() {
  };
  a.TMXBlock.prototype.tileSize = null;
  a.TMXBlock.prototype.mapTileSize = null;
  a.TMXBlock.prototype.totalTiles = 0;
  a.TMXBlock.prototype.spacing = 0;
  a.TMXBlock.prototype.margin = 0;
  a.TMXBlock.maps = {};
  a.TMXBlock.loadTMX = function(c) {
    a.loadAsset("tmx", {path:c, dataType:"xml"}, function(b) {
      var d = {}, b = $(b).find("map"), e = b.find("tileset").first(), g = b.attr("orientation");
      if(e) {
        d.tileSize = vec2.create([parseInt(e.attr("tilewidth"), 10), parseInt(e.attr("tileheight"), 10)]);
        d.mapTileSize = vec2.create([parseInt(b.attr("tilewidth"), 10), parseInt(b.attr("tileheight"), 10)]);
        e.attr("spacing") && (d.spacing = parseInt(e.attr("spacing"), 10));
        e.attr("margin") && (d.margin = parseInt(e.attr("margin"), 10));
        var e = e.find("image").first(), h = vec2.create([parseInt(e.attr("width"), 10), parseInt(e.attr("height"), 10)]);
        d.texture = e.attr("source");
        a.loadAsset("texture", d.texture);
        d.layers = [];
        b.find("layer").each(function(a, b) {
          var c = {blocks:[]}, e = vec2.create([parseInt($(b).attr("width"), 10), parseInt($(b).attr("height"), 10)]), j = $(b).find("data").first();
          if(j) {
            if(j.attr("encoding") != "base64" || j.attr("compression")) {
              throw"Invalid TMX Data";
            }
            for(var j = j.text().trim(), j = base64.decode(j), o = 0, p = 0;p < e[1];p++) {
              for(var q = 0;q < e[0];q++) {
                var n = ((j.charCodeAt(o + 3) & 255) << 24 | (j.charCodeAt(o + 2) & 255) << 16 | (j.charCodeAt(o + 1) & 255) << 8 | j.charCodeAt(o + 0) & 255) - 1, v = {}, s = d.margin || 0, r = d.spacing || 0, m = d.tileSize, t = d.mapTileSize, w = parseInt((h[0] - s * 2 + r) / (m[0] + r), 10), n = quat4.create([n % w * (m[0] + r) + s, h[1] - m[1] - s - r - parseInt(n / w, 10) * (m[1] + r) + s, m[0], m[1]]);
                v.frame = n;
                if(g == "orthogonal") {
                  n = q * t[0] + m[0] / 2, m = (e[1] - p - 1) * t[1] + m[1] / 2
                }else {
                  if(g == "isometric") {
                    n = t[0] / 2 * (e[0] + q - p - 1) + m[0] / 2, m = t[1] / 2 * (e[1] * 2 - q - p - 2) + m[1] / 2
                  }else {
                    throw"Invalid orientation";
                  }
                }
                v.position = [n, m, 0];
                c.blocks.push(v);
                o += 4
              }
            }
          }else {
            throw"No data for layer!";
          }
          d.layers.push(c)
        })
      }
      a.TMXBlock.maps[c] = d
    })
  };
  a.registerAssetHandler("tmx", function(c, b) {
    console.log("tmx loaded: " + c);
    a.assets.tmx[c].data = b;
    return true
  });
  a.TMXBlock = a.TMXBlock;
  a.exportProperty(a.TMXBlock, "loadTMX", a.TMXBlock.loadTMX)
})(window);
(function(h) {
  var a = h.ChesterGL;
  a.Action = function(a, b) {
    this.block = a;
    this.totalTime = b * 1E3;
    this.elapsed = 0
  };
  a.Action.prototype.block = null;
  a.Action.prototype.totalTime = 0;
  a.Action.prototype.elapsed = 0;
  a.Action.prototype.currentTime = 0;
  a.Action.prototype.finished = false;
  a.Action.prototype.update = function(a) {
    this.elapsed += a;
    if(this.elapsed >= this.totalTime) {
      this.finished = true
    }
  };
  a.MoveToAction = function(c, b, d) {
    a.Action.call(this, c, b);
    this.finalPosition = vec3.create(d);
    this.startPosition = vec3.create(c.position)
  };
  a.MoveToAction.prototype = Object.create(a.Action.prototype);
  a.MoveToAction.prototype.finalPosition = null;
  a.MoveToAction.prototype.startPosition = null;
  a.MoveToAction.prototype.update = function(c) {
    a.Action.prototype.update.call(this, c);
    c = this.block;
    if(this.finished) {
      c.moveTo(this.finalPosition)
    }else {
      var b = Math.min(1, this.elapsed / this.totalTime);
      vec3.lerp(this.startPosition, this.finalPosition, b, c.position);
      c.isTransformDirty = true
    }
  };
  a.ActionManager = {};
  a.ActionManager.scheduledActions_ = [];
  a.ActionManager.scheduleAction = function(a) {
    this.scheduledActions_.push(a)
  };
  a.ActionManager.tick = function(a) {
    for(var b = 0, d = this.scheduledActions_.length, b = 0;b < d;b++) {
      var e = this.scheduledActions_[b];
      !e.finished && e.update(a)
    }
  };
  a.exportProperty(a.ActionManager, "scheduleAction", a.ActionManager.scheduleAction)
})(window);

