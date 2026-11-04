/* PT2 Drawing Lines: colour rotation for the lines drawn in linking questions.
   Unlocked with 240 questions solved (pt2-unlocks.js, key 'look:lines'), which also adds Settings → Drawing Lines.
   With rotation on, every line drawn (right, wrong or loose) takes the next colour of the chosen palette; lines already
   drawn keep theirs. On the unlock, rotation is switched on once with the Theme palette; turning it off is respected.
   Saved on this device: pt2_lines_v1 = {on, palette}, pt2_lines_idx_v1 = position in the rotation. */
(function (global) {
  'use strict';
  var KEY = 'pt2_lines_v1', IDX = 'pt2_lines_idx_v1', FEATURE = 'look:lines';
  var PRESETS = [
    { id: 'theme', name: 'Theme', hint: 'Shades of your accent colour' },
    { id: 'ocean', name: 'Ocean', c: ['#0ea5e9', '#06b6d4', '#14b8a6', '#3b82f6', '#6366f1'] },
    { id: 'sunset', name: 'Sunset', c: ['#f43f5e', '#f97316', '#f59e0b', '#ec4899', '#a855f7'] },
    { id: 'forest', name: 'Forest', c: ['#15803d', '#65a30d', '#0d9488', '#4d7c0f', '#059669'] },
    { id: 'berry', name: 'Berry', c: ['#be185d', '#9333ea', '#db2777', '#7c3aed', '#c026d3'] },
    { id: 'autumn', name: 'Autumn', c: ['#c2410c', '#b45309', '#a16207', '#dc2626', '#92400e'] },
    { id: 'mint', name: 'Mint', c: ['#10b981', '#14b8a6', '#22c55e', '#06b6d4', '#34d399'] },
    { id: 'candy', name: 'Candy', c: ['#ec4899', '#8b5cf6', '#f472b6', '#38bdf8', '#e879f9'] },
    { id: 'aurora', name: 'Aurora', c: ['#22d3ee', '#4ade80', '#a78bfa', '#2dd4bf', '#818cf8'] },
    { id: 'coral', name: 'Coral', c: ['#f87171', '#fb923c', '#f472b6', '#fb7185', '#f59e0b'] },
    { id: 'pastel', name: 'Pastel', c: ['#f472b6', '#a78bfa', '#fb923c', '#60a5fa', '#e879f9'] },
    { id: 'neon', name: 'Neon', c: ['#ff2bd6', '#00d9ff', '#39e600', '#ffd500', '#ff6b00'] }
  ];
  function ls(k, v) { try { if (v === undefined) return global.localStorage.getItem(k); global.localStorage.setItem(k, v); } catch (e) { return null; } }
  function unlocked() { try { return !!(global.PT2Unlocks && global.PT2Unlocks.has(FEATURE)); } catch (e) { return false; } }
  function pref() { try { var p = JSON.parse(ls(KEY) || 'null'); if (p && typeof p === 'object') return p; } catch (e) {} return null; }
  function save(p) { ls(KEY, JSON.stringify(p)); }
  function cur() { var p = pref() || { on: false, palette: 'theme' }; if (!PRESETS.some(function (x) { return x.id === p.palette; })) p.palette = 'theme'; return p; }
  // first time unlocked (or already past 240 when this arrived): on, with the Theme palette. A saved choice is never changed.
  function ensureDefault() { if (unlocked() && !pref()) save({ on: true, palette: 'theme' }); }

  /* Theme palette: the current accent (--accent-1, else --accent-0) as HSL, then six readable variations of it:
     the accent itself, lighter / darker levels and small hue steps to each side. Lightness is kept in 34–72%. */
  function accentHex() {
    var el = document.querySelector('.pt1q') || document.documentElement, cs = getComputedStyle(el);
    var v = (cs.getPropertyValue('--accent-1') || cs.getPropertyValue('--accent-0') || '').trim();
    var d = document.createElement('span'); d.style.color = v || '#7c3aed'; document.body.appendChild(d);
    var m = getComputedStyle(d).color.match(/\d+(\.\d+)?/g); d.remove();
    return m ? [+m[0], +m[1], +m[2]] : [124, 58, 237];
  }
  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { var d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s * 100, l * 100];
  }
  // HSL → #rrggbb (the line canvas stores hex colours)
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(34, Math.min(72, l)) / 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { var v = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return ('0' + Math.round(v * 255).toString(16)).slice(-2); };
    return '#' + f(0) + f(8) + f(4);
  }
  function themeColors() {
    var a = toHsl.apply(null, accentHex()), h = a[0], s = Math.max(45, a[1]), l = Math.max(40, Math.min(62, a[2]));
    return [hsl(h, s, l), hsl(h, s, l + 14), hsl(h, s, l - 14), hsl(h + 22, s, l + 4), hsl(h - 22, s, l - 4), hsl(h, Math.max(35, s - 25), l + 24)];
  }
  function colorsOf(id) { if (id === 'theme') return themeColors(); for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i].c.slice(); return themeColors(); }
  function idx() { return Math.max(0, parseInt(ls(IDX) || '0', 10) || 0); }
  var API = {
    on: function () { return unlocked() && !!cur().on; },
    peek: function () { var c = colorsOf(cur().palette); return c[idx() % c.length]; },
    advance: function () { ls(IDX, String(idx() + 1)); },
    palettes: PRESETS, colors: colorsOf
  };
  global.PT2Lines = API;

  /* Settings → Drawing Lines (only once unlocked) */
  function $(id) { return document.getElementById(id); }
  function sw(cs) { return cs.map(function (c) { return '<span class="pt2-ln-sw" style="background:' + c + '"></span>'; }).join(''); }
  function paint() {
    var p = $('settings-panel-lines'); if (!p) return; var c = cur();
    var t = $('pt2LinesOn'); if (t) t.checked = !!c.on;
    p.querySelectorAll('.pt2-ln-pal').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.pal === c.palette ? 'true' : 'false');
      b.querySelector('.pt2-ln-sws').innerHTML = sw(colorsOf(b.dataset.pal));
    });
    p.classList.toggle('pt2-ln-off', !c.on);
  }
  function build() {
    if (!unlocked() || $('settings-panel-lines')) { paint(); return; }
    var nav = document.querySelector('.settings-nav'), panels = document.querySelector('.settings-panels');
    if (!nav || !panels) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'settings-nav-btn'; b.dataset.panel = 'lines'; b.textContent = 'Drawing Lines';
    b.addEventListener('click', function () { if (typeof global.openSettingsPanel === 'function') global.openSettingsPanel('lines'); paint(); });
    var clb = nav.querySelector('[data-panel="changelog"]'); if (clb) nav.insertBefore(b, clb); else nav.appendChild(b);
    var p = document.createElement('div'); p.className = 'settings-panel'; p.id = 'settings-panel-lines';
    p.innerHTML = '<div class="settings-panel-title">Drawing Lines</div>' +
      '<div class="setting-item" style="padding-top:8px;"><span class="setting-item-label">Colour rotation</span>' +
      '<p class="setting-item-desc" style="margin:4px 0 8px;">Each line you draw in a linking question takes the next colour of the palette. Lines already drawn keep their colour.</p>' +
      '<div class="pt2-opt-list"><div class="pt2-opt"><span class="pt2-opt-text"><span class="pt2-opt-name">Rotate line colours</span></span>' +
      '<label class="toggle-switch"><input type="checkbox" id="pt2LinesOn"><span class="toggle-slider"></span></label></div></div></div>' +
      '<div class="setting-item pt2-ln-pals" style="border-top:1px solid var(--col-border-light); padding-top:16px;"><span class="setting-item-label">Palette</span><div class="pt2-ln-list">' +
      PRESETS.map(function (x) { return '<button type="button" class="pt2-ln-pal" data-pal="' + x.id + '" aria-pressed="false"><span class="pt2-ln-name">' + x.name + (x.hint ? '<span class="pt2-ln-hint">' + x.hint + '</span>' : '') + '</span><span class="pt2-ln-sws"></span></button>'; }).join('') +
      '</div></div>';
    var clp = $('settings-panel-changelog'); if (clp) panels.insertBefore(p, clp); else panels.appendChild(p);
    $('pt2LinesOn').addEventListener('change', function (e) { var c = cur(); c.on = !!e.target.checked; save(c); paint(); });
    p.querySelectorAll('.pt2-ln-pal').forEach(function (btn) { btn.addEventListener('click', function () { var c = cur(); c.palette = btn.dataset.pal; save(c); ls(IDX, '0'); paint(); }); });
    paint();
  }
  function sync() { ensureDefault(); build(); }
  document.addEventListener('pt2-unlocked', function (e) { if (e.detail && e.detail.indexOf(FEATURE) !== -1) sync(); });
  // the Theme swatches follow theme changes: refreshed whenever Settings opens
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#settings-btn')) setTimeout(paint, 0); });
  function init() { sync(); setTimeout(sync, 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
