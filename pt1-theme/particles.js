/* Theme background grid.
   The former drifting/WebGL particle field has been permanently removed. */
(function (global) {
  'use strict';

  if (typeof global.globalBlobs === 'undefined') {
    global.globalBlobs = null;
  }

  var isQuiz = /\/quiz(\/|$)/.test(location.pathname) || !!document.getElementById('fxCanvas');
  if (!isQuiz) document.body.style.background = '#0d0d0d';

  function buildGridSVG(isLight) {
    var color = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
    return "<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><path d='M0 0 L60 0 M0 0 L0 60' stroke='" + color + "' stroke-width='0.5' fill='none'/></svg>";
  }

  var styleSheet = document.createElement('style');
  document.head.appendChild(styleSheet);
  styleSheet.textContent = '#el-arquitecto-bg-layer{content:"";position:fixed;top:0;left:0;width:100%;height:100%;z-index:-3;pointer-events:none;background-size:60px 60px;opacity:0.4;mix-blend-mode:multiply}';

  var bgDiv = document.createElement('div');
  bgDiv.id = 'el-arquitecto-bg-layer';
  document.body.appendChild(bgDiv);

  function clearParticleOverlays() {
    document.querySelectorAll('.calc-theme-overlay').forEach(function (overlay) {
      overlay.style.display = 'none';
      var ctx = overlay.getContext && overlay.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
    });
  }

  function refreshThemeSVGs() {
    var isLight = document.documentElement.classList.contains('light-mode');
    var encodedGrid = encodeURIComponent(buildGridSVG(isLight).replace(/\s+/g, ' '));
    bgDiv.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,' + encodedGrid + '")';
    if (typeof global.refreshFxAccentColors === 'function') {
      try { global.refreshFxAccentColors(); } catch (e) {}
    }
    clearParticleOverlays();
  }

  /* Compatibility surface for callers that still query the old layer. */
  var layerCtl = { particles: false, particleDensity: 0, grid: true, calcOverlays: false };
  function applyLayerVisibility() {
    bgDiv.style.display = layerCtl.grid ? '' : 'none';
    clearParticleOverlays();
  }

  global.refreshParticleColors = function () {};
  global.refreshThemeSVGs = refreshThemeSVGs;
  global.updateOverlayCanvases = clearParticleOverlays;
  global.BgParticles = {
    getState: function () {
      return {
        particles: false,
        particleDensity: 0,
        grid: !!layerCtl.grid,
        calcOverlays: false,
        count: 0
      };
    },
    setEnabled: function (key, on) {
      if (key === 'grid') layerCtl.grid = !!on;
      /* particles and particle-backed calculator overlays stay disabled. */
      applyLayerVisibility();
    },
    setDensity: function () {
      layerCtl.particleDensity = 0;
      applyLayerVisibility();
    },
    applyState: function (state) {
      if (state && 'grid' in state) layerCtl.grid = !!state.grid;
      layerCtl.particles = false;
      layerCtl.particleDensity = 0;
      layerCtl.calcOverlays = false;
      applyLayerVisibility();
    }
  };

  applyLayerVisibility();
  try { refreshThemeSVGs(); } catch (e) {}
})(typeof window !== 'undefined' ? window : globalThis);
