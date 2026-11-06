/* PT2 Medical Physics unlock: ATC-Math style orbiting particle background.
   Same orbit/WebGL behaviour as ATC-Math / calculator particles.js.
   Formula texts come from Pt2FormulaGen (Medical Physics), excluding Chapter 3 keys.
   Starts only when PT2Bg enables the "particles" background. */
(function (global) {
  'use strict';

  var CH3 = {
    continuity:1, massFlow:1, bernoulli:1, viscosity:1, poiseuille:1, laplaceCylinder:1,
    wallStress:1, reynolds:1, surfaceTension:1, alveolus:1
  };

  function formulaKeys() {
    var gen = global.Pt2FormulaGen;
    if (!gen || !gen.allKeys) return [];
    return gen.allKeys().filter(function (k) { return !CH3[k]; });
  }

  function stripHtml(text) {
    var d = document.createElement('div'); d.innerHTML = String(text);
    return d.textContent || '';
  }

  function textToTargets(text, cx, cy, fontSize, maxWidth) {
    var off = document.createElement('canvas');
    var octx = off.getContext('2d', { willReadFrequently: true });
    var font = "bold " + fontSize + "px 'Courier New',monospace";
    octx.font = font;
    var words = String(text).split(' ');
    var lines = []; var currentLine = words[0] || '';
    for (var i = 1; i < words.length; i++) {
      var testLine = currentLine + ' ' + words[i];
      if (octx.measureText(testLine).width < (maxWidth || 400)) currentLine = testLine;
      else { lines.push(currentLine); currentLine = words[i]; }
    }
    lines.push(currentLine);
    var w = Math.ceil(Math.max.apply(null, lines.map(function (l) { return octx.measureText(l).width; }).concat([10])) + 20);
    var lineHeight = Math.ceil(fontSize * 1.2);
    var h = Math.ceil(lineHeight * lines.length + 10);
    off.width = w; off.height = h;
    octx.font = font; octx.fillStyle = '#fff'; octx.textBaseline = 'middle';
    lines.forEach(function (line, i) { octx.fillText(line, 10, (i * lineHeight) + lineHeight / 2 + 5); });
    var data = octx.getImageData(0, 0, w, h).data;
    var targets = []; var step = 2;
    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        var idx = (y * w + x) * 4;
        if (data[idx + 3] > 128) targets.push({ x: cx - w / 2 + x, y: cy - h / 2 + y });
      }
    }
    if (targets.length > 5000) {
      var ratio = targets.length / 5000; var sub = [];
      for (var j = 0; j < 5000; j++) sub.push(targets[Math.floor(j * ratio)]);
      return sub;
    }
    return targets;
  }

  function generateFormulaTexts(activeTexts) {
    var gen = global.Pt2FormulaGen;
    var keys = formulaKeys();
    if (!gen || !keys.length) return null;
    var qText = '', ansText = '', type = '';
    for (var attempt = 0; attempt < 30; attempt++) {
      var k = keys[Math.floor(Math.random() * keys.length)];
      var qData;
      try { qData = gen.QUESTION_GENERATORS[k](); } catch (e) { continue; }
      if (!qData) continue;
      var t_qText = stripHtml(qData.q).replace(/\s+/g, ' ').trim();
      if (/[a-zA-Z]/.test(t_qText) && t_qText.length > 60) {
        /* allow letterful physics stems; still skip empties */
      }
      if (!t_qText) continue;
      if (activeTexts && activeTexts.indexOf(t_qText) !== -1) continue;
      qText = t_qText; type = k;
      if (typeof qData.ans === 'number' && Number.isInteger(qData.ans) && qData.opts && qData.ans >= 0 && qData.ans < qData.opts.length) {
        ansText = String(qData.opts[qData.ans]);
      } else if (qData.opts && qData.opts.length) {
        ansText = String(qData.opts[0]);
      } else {
        ansText = String(qData.ans != null ? qData.ans : '');
      }
      ansText = stripHtml(ansText).replace(/\s+/g, ' ').trim();
      break;
    }
    if (!qText) return null;
    if (qText.length > 45) qText = qText.substring(0, 45);
    if (ansText.length > 20) ansText = ansText.substring(0, 20);
    return { qText: qText, ansText: ansText, type: type };
  }

  var running = false, raf = 0, canvas = null, gl = null, ctx2 = null;
  var particles = [], activeFormulas = [], nextSpawnTime = 0, globalCooldownEnd = 0;
  var MAX_FORMULAS = 9;
  var program, positionLoc, sizeLoc, alphaLoc, resolutionLoc, colorLoc;
  var positionBuffer, sizeBuffer, alphaBuffer, colorBuffer, sparkleBuffer;
  var colorIndexLoc, sparkleSpeedLoc, timeLoc, startTime = 0, lastFrameTime = 0;
  var accentLoc;

  function ensureCanvas() {
    if (canvas && canvas.parentNode) return;
    canvas = document.createElement('canvas');
    canvas.id = 'pt2-bg-orbit-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;mix-blend-mode:screen;';
    document.body.appendChild(canvas);
    resize();
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    activeFormulas.forEach(function (f) {
      f.qParticles.forEach(function (p) { p.formulaId = -1; p.locked = false; });
      f.aParticles.forEach(function (p) { p.formulaId = -1; p.locked = false; });
    });
    activeFormulas = [];
    nextSpawnTime = 0;
    globalCooldownEnd = 0;
    particles.forEach(function (p) {
      if (p.isOrbit) p.radius = Math.random() * (Math.min(window.innerWidth, window.innerHeight) / 2);
    });
  }

  function initParticles() {
    particles = [];
    var count = 1500;
    var vmin = Math.min(window.innerWidth, window.innerHeight);
    for (var i = 0; i < count; i++) {
      var isOrbit = i < 300;
      var sz = Math.random() * 3.0 + 2.0;
      particles.push({
        x: Math.random() * (canvas ? canvas.width : window.innerWidth),
        y: Math.random() * (canvas ? canvas.height : window.innerHeight),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: sz, baseSize: sz, alpha: 0, colorIndex: 0,
        sparkleSpeed: 2.0 + Math.random() * 6.0, formulaId: -1,
        targetX: 0, targetY: 0, isAnswer: false, locked: false, speed: 0.005,
        isOrbit: isOrbit, angle: Math.random() * Math.PI * 2,
        radius: Math.random() * (vmin / 2), orbitSpeed: Math.random() * 0.001 + 0.0005
      });
    }
  }

  function createShader(g, type, source) {
    var shader = g.createShader(type);
    g.shaderSource(shader, source);
    g.compileShader(shader);
    return shader;
  }

  function initGL() {
    gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return false;
    var vsSource = 'attribute vec2 a_position;attribute float a_size;attribute float a_alpha;attribute float a_colorIndex;attribute float a_sparkleSpeed;uniform vec2 u_resolution;uniform float u_time;varying float v_alpha;varying float v_colorIndex;varying float v_sparkleSpeed;void main(){vec2 zeroToOne=a_position/u_resolution;vec2 zeroToTwo=zeroToOne*2.0;vec2 clipSpace=zeroToTwo-1.0;gl_Position=vec4(clipSpace*vec2(1,-1),0,1);gl_PointSize=a_size*2.0;v_alpha=a_alpha;v_colorIndex=a_colorIndex;v_sparkleSpeed=a_sparkleSpeed;}';
    var fsSource = 'precision mediump float;varying float v_alpha;varying float v_colorIndex;varying float v_sparkleSpeed;uniform vec3 u_accentColor;uniform float u_time;void main(){vec2 coord=gl_PointCoord-vec2(0.5);float dist=length(coord);if(dist>0.5)discard;float glow=1.0-(dist*2.0);glow=pow(glow,2.5);vec3 color=u_accentColor;if(v_colorIndex>0.5&&v_colorIndex<1.5)color=vec3(1.0,1.0,1.0);else if(v_colorIndex>1.5&&v_colorIndex<2.5)color=vec3(1.0,0.85,0.85);else if(v_colorIndex>2.5&&v_colorIndex<3.5)color=vec3(1.0,1.0,0.8);else if(v_colorIndex>3.5)color=vec3(0.3,1.0,0.5);float sparkle=1.0;float finalAlpha=v_alpha*glow*sparkle;gl_FragColor=vec4(color,finalAlpha);}';
    var vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    var fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    positionLoc = gl.getAttribLocation(program, 'a_position');
    sizeLoc = gl.getAttribLocation(program, 'a_size');
    alphaLoc = gl.getAttribLocation(program, 'a_alpha');
    colorIndexLoc = gl.getAttribLocation(program, 'a_colorIndex');
    sparkleSpeedLoc = gl.getAttribLocation(program, 'a_sparkleSpeed');
    resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    accentLoc = gl.getUniformLocation(program, 'u_accentColor');
    timeLoc = gl.getUniformLocation(program, 'u_time');
    positionBuffer = gl.createBuffer(); sizeBuffer = gl.createBuffer();
    alphaBuffer = gl.createBuffer(); colorBuffer = gl.createBuffer(); sparkleBuffer = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    return true;
  }

  function findFreePosition() {
    var margin = 130;
    for (var attempt = 0; attempt < 20; attempt++) {
      var cx = margin + Math.random() * Math.max(100, window.innerWidth - margin * 2);
      var cy = margin + 60 + Math.random() * Math.max(100, window.innerHeight - margin * 2 - 120);
      var ok = true;
      for (var i = 0; i < activeFormulas.length; i++) {
        var f = activeFormulas[i];
        var dx = cx - f.cx, dy = cy - f.cy;
        if (Math.sqrt(dx * dx + dy * dy) < 350) { ok = false; break; }
      }
      if (ok) return { cx: cx, cy: cy };
    }
    return {
      cx: margin + Math.random() * Math.max(100, window.innerWidth - margin * 2),
      cy: margin + 60 + Math.random() * Math.max(100, window.innerHeight - margin * 2 - 120)
    };
  }

  function spawnFormula() {
    if (activeFormulas.length >= MAX_FORMULAS) return;
    var activeTexts = activeFormulas.map(function (f) { return f.qText; });
    var data = generateFormulaTexts(activeTexts);
    if (!data) return;
    var pos = findFreePosition();
    var fontSize = 28;
    var qTargets = textToTargets(data.qText, pos.cx, pos.cy, fontSize, 450);
    var aTargets = textToTargets(data.ansText, pos.cx, pos.cy + fontSize * 2.5, fontSize, 200);
    var freeParticles = particles.filter(function (p) { return p.formulaId < 0 && !p.isOrbit; });
    var qAssign = [];
    for (var i = 0; i < qTargets.length && i < freeParticles.length; i++) {
      var p = freeParticles[i];
      p.formulaId = activeFormulas.length;
      p.targetX = qTargets[i].x; p.targetY = qTargets[i].y;
      p.isAnswer = false; p.colorIndex = 0;
      if (Math.random() < 0.15) p.colorIndex = 1;
      p.locked = false; p.speed = 0.004 + Math.random() * 0.006;
      p.size = Math.random() * 1.0 + 0.5;
      qAssign.push(p);
    }
    var now = performance.now();
    activeFormulas.push({
      id: activeFormulas.length, qText: data.qText, ansText: data.ansText,
      cx: pos.cx, cy: pos.cy, qParticles: qAssign, aParticles: [], aTargets: aTargets,
      spawnTime: now, answerDelay: 2000 + Math.random() * 2000,
      showDuration: 26000 + Math.random() * 4000, answerFormed: false
    });
  }

  function assignAnswerParticles(formula) {
    var freeParticles = particles.filter(function (p) { return p.formulaId < 0 && !p.isOrbit; });
    var targets = formula.aTargets;
    for (var i = 0; i < targets.length && i < freeParticles.length; i++) {
      var p = freeParticles[i];
      p.formulaId = formula.id; p.targetX = targets[i].x; p.targetY = targets[i].y;
      p.isAnswer = true;
      p.colorIndex = Math.random() < 0.7 ? 4 : 0;
      p.locked = false; p.speed = 0.004 + Math.random() * 0.006;
      p.size = Math.random() * 1.0 + 0.5;
      formula.aParticles.push(p);
    }
    formula.answerFormed = true;
  }

function renderFrame(now) {
  if (!running || !gl) return;
  var dt = Math.min(50, now - lastFrameTime); lastFrameTime = now;
  var timeScale = dt / 16.67;
  var cx = canvas.width / 2, cy = canvas.height / 2;
  var randomFlux = 0.85 + Math.random() * 0.3;

  /* slow growth: count and diameter up to limits */
  var vmin = Math.min(canvas.width, canvas.height);
  var grow = Math.min(1, (now - startTime) / 45000);
  if (particles.length < 2200 && Math.random() < 0.015 * timeScale) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1.5 + Math.random() * 2.2,
      baseSize: 1.5 + Math.random() * 2.2,
      alpha: 0,
      colorIndex: 0,
      sparkleSpeed: 0,
      formulaId: -1,
      isOrbit: Math.random() < 0.25,
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * (vmin / 2) * (0.4 + grow * 0.6),
      orbitSpeed: Math.random() * 0.0008 + 0.0003
    });
  }
  particles.forEach(function (p) {
    if (p.isOrbit) p.radius = Math.min(p.radius + 0.04 * timeScale, vmin * 0.48);
  });

  activeFormulas.slice().forEach(function (f) {
      if (!f.answerFormed && now - f.spawnTime > f.answerDelay) assignAnswerParticles(f);
      if (now - f.spawnTime > f.showDuration) {
        f.qParticles.concat(f.aParticles).forEach(function (p) {
          p.formulaId = -1; p.locked = false; p.isOrbit = false;
          p.vx = (Math.random() - 0.5) * 0.4; p.vy = (Math.random() - 0.5) * 0.4;
          p.size = p.baseSize;
        });
        activeFormulas = activeFormulas.filter(function (x) { return x !== f; });
        globalCooldownEnd = now + 1500;
      }
    });

    particles.forEach(function (p) {
      if (p.formulaId >= 0) {
        var dx = p.targetX - p.x, dy = p.targetY - p.y;
        p.x += dx * p.speed * 12 * timeScale;
        p.y += dy * p.speed * 12 * timeScale;
        p.alpha = Math.min(1, (p.alpha || 0) + 0.02 * timeScale);
    } else if (p.isOrbit) {
    p.angle += p.orbitSpeed * timeScale;
    p.x = cx + Math.cos(p.angle) * p.radius;
    p.y = cy + Math.sin(p.angle) * p.radius;
    p.alpha = 0.25 + 0.35 * Math.sin(now * 0.0008 + p.angle * 1.7);
    } else {
    p.x += p.vx * timeScale;
    p.y += p.vy * timeScale;
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    p.alpha = 0.12 + 0.18 * Math.sin(now * 0.0006 + p.x * 0.015);
    }
    });

    var rs = getComputedStyle(document.documentElement);
    var rgb = (rs.getPropertyValue('--accent-0-rgb') || '34,211,238').trim().split(',').map(function (n) { return parseInt(n, 10) || 0; });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    gl.uniform3f(accentLoc, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    gl.uniform1f(timeLoc, (now - startTime) / 1000);

    var positions = new Float32Array(particles.length * 2);
    var sizes = new Float32Array(particles.length);
    var alphas = new Float32Array(particles.length);
    var colorIndices = new Float32Array(particles.length);
    var sparkles = new Float32Array(particles.length);
    particles.forEach(function (p, i) {
      positions[i * 2] = p.x; positions[i * 2 + 1] = p.y;
      sizes[i] = p.size; alphas[i] = p.alpha || 0;
      colorIndices[i] = p.colorIndex || 0; sparkles[i] = p.sparkleSpeed || 1;
    });
    function bind(buf, loc, data, size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    bind(positionBuffer, positionLoc, positions, 2);
    bind(sizeBuffer, sizeLoc, sizes, 1);
    bind(alphaBuffer, alphaLoc, alphas, 1);
    bind(colorBuffer, colorIndexLoc, colorIndices, 1);
    bind(sparkleBuffer, sparkleSpeedLoc, sparkles, 1);
    gl.drawArrays(gl.POINTS, 0, particles.length);

    raf = requestAnimationFrame(renderFrame);
  }

  function onResize() { if (running) resize(); }

  function start() {
    if (running) return;
    ensureCanvas();
    canvas.style.display = 'block';
    if (!gl && !initGL()) return;
    initParticles();
    startTime = Date.now();
    lastFrameTime = performance.now();
    nextSpawnTime = performance.now() + 2000;
    running = true;
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(renderFrame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.removeEventListener('resize', onResize);
    if (canvas) canvas.style.display = 'none';
    activeFormulas = [];
  }

  function isRunning() { return running; }

  global.PT2BgOrbit = { start: start, stop: stop, isRunning: isRunning };
})(typeof window !== 'undefined' ? window : globalThis);
