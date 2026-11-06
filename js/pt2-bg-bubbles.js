/* PT2 Medical Physics unlock: RSO quiz.html soft-blob ("bubble") background.
   Same blob count, speeds, radii, composite and draw style as RSO's cosmic field blobs
   (without billiards / grav-shift / cosmic-roam extras). Gated by PT2Bg. */
(function (global) {
  'use strict';

  var running = false, raf = 0, canvas = null, ctx = null, blobs = [];

  function ensureCanvas() {
    if (canvas && canvas.parentNode) return;
    canvas = document.createElement('canvas');
    canvas.id = 'pt2-bg-bubbles-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    canvas._isLightBlurApplied = false;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initBlobs() {
    blobs = Array.from({ length: 40 }, function () {
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 60 + 40,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4
      };
    });
    global.globalBlobs = blobs;
  }

  function draw() {
    if (!running || !ctx) return;
    var isLight = document.documentElement.classList.contains('light-mode');
    if (isLight && !canvas._isLightBlurApplied) {
      canvas.style.filter = 'blur(6px)';
      canvas._isLightBlurApplied = true;
    } else if (!isLight && canvas._isLightBlurApplied) {
      canvas.style.filter = 'none';
      canvas._isLightBlurApplied = false;
    }
    var rootStyle = getComputedStyle(document.documentElement);
    var accent0 = rootStyle.getPropertyValue('--accent-0-rgb').trim() || '34,211,238';
    var accent2 = rootStyle.getPropertyValue('--accent-2-rgb').trim() || accent0;
    var accent4 = rootStyle.getPropertyValue('--accent-4-rgb').trim() || accent0;
    if (isLight) {
      var parts = accent0.split(',').map(function (n) { return parseInt(n, 10) || 0; });
      var br = Math.round(parts[0] * 0.18 + 118 * 0.82);
      var bg = Math.round(parts[1] * 0.18 + 124 * 0.82);
      var bb = Math.round(parts[2] * 0.18 + 128 * 0.82);
      ctx.fillStyle = 'rgb(' + br + ',' + bg + ',' + bb + ')';
    } else {
      ctx.fillStyle = '#0b0e11';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = isLight ? 'source-over' : 'lighter';
    for (var bi = 0; bi < blobs.length; bi++) {
      var blob = blobs[bi];
      var gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
      gradient.addColorStop(0, 'rgba(' + accent0 + ', ' + (isLight ? 0.28 : 0.32) + ')');
      gradient.addColorStop(0.6, 'rgba(' + accent2 + ', ' + (isLight ? 0.10 : 0.08) + ')');
      gradient.addColorStop(1, 'rgba(' + accent4 + ', 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      ctx.fill();
      blob.x += blob.dx;
      blob.y += blob.dy;
      if (blob.x < 0 || blob.x > canvas.width) blob.dx *= -1;
      if (blob.y < 0 || blob.y > canvas.height) blob.dy *= -1;
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(draw);
  }

  function onResize() { if (running) resize(); }

  function start() {
    if (running) return;
    ensureCanvas();
    canvas.style.display = 'block';
    initBlobs();
    running = true;
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.removeEventListener('resize', onResize);
    if (canvas) canvas.style.display = 'none';
  }

  function isRunning() { return running; }

  global.PT2BgBubbles = { start: start, stop: stop, isRunning: isRunning };
})(typeof window !== 'undefined' ? window : globalThis);
