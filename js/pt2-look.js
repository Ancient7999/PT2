/* Look options: animation effects, hover sheen and accent modes (saved on this device). */
(function (global) {
  'use strict';
  var root = document.documentElement, KEY = 'pt2_look_v1', PREV = 'pt2_look_prev_v1', GOT = 'pt2_emoji_unlocked_v1';
  var reduce = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function has(k) { return !!rd(GOT, {})[k]; }
  function st() { return rd(KEY, {}); }
  function $(id) { return document.getElementById(id); }

  /* —— colour helpers —— */
  function h2r(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function r2h(c) { return '#' + c.map(function (x) { return ('0' + Math.round(Math.max(0, Math.min(255, x))).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) { var x = h2r(a), y = h2r(b); return r2h([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function sample(cols, x) { var n = cols.length; x = ((x % 1) + 1) % 1 * n; var i = Math.floor(x), f = x - i; return mix(cols[i % n], cols[(i + 1) % n], f); }
  function rgbs(h) { return h2r(h).join(','); }

  /* ———————————————— Animation effects (Settings → Theme, shown once unlocked; off until switched on) ————————————————
     Extra motion in the current accent colour: hover sheen, card current, sparks, livelier next-question bar. */
  function fxOn() { return root.classList.contains('pt2-fx'); }
  function applyFx() {
    var on = has('look:a') && !!st().fx && !root.classList.contains('pt2-basic');
    root.classList.toggle('pt2-fx', on); root.classList.remove('pt2-electric');
    var t = $('pt2FxOn'); if (t) t.checked = !!st().fx;
    if (!on && typeof hideGlass === 'function') hideGlass();
  }
  function setFx(on) { var o = st(); if (on) o.fx = 1; else delete o.fx; wr(KEY, o); applyFx(); }
  /* the old palette option is gone: anyone who had it on keeps its effects (as the switch, on) with their own accent */
  function migrate() {
    var o = st(); if (!o.e && !o.autoA) return;
    if (o.e && has('look:a')) o.fx = 1;
    delete o.e; delete o.autoA; wr(KEY, o);
    try { localStorage.removeItem(PREV); localStorage.removeItem('pt2_gold_mood_tip_n'); } catch (e) {}
    root.classList.remove('pt2-electric');
    if (root.getAttribute('data-cursor') === 'intro') {
      var keep = null; try { keep = localStorage.getItem('pt1_cursor_skin'); } catch (e) {}
      if (keep !== 'intro' && typeof global.applyCursorSkin === 'function') { try { global.applyCursorSkin(false); } catch (e) {} }
    }
  }
  function wireFx() {
    var t = $('pt2FxOn'); if (!t || t.dataset.wired) return;
    t.dataset.wired = '1'; t.checked = !!st().fx;
    t.addEventListener('change', function () { setFx(this.checked); });
  }

  /* emoji change while the palette is held: a short ripple in that emoji's colour */
  var moodColour = null;
  function moodColours() {
    if (moodColour) return moodColour; moodColour = {};
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      var rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.prototype.forEach.call(rules || [], function (r) {
        var m = r.selectorText && /^html\.(mood-[\w-]+)$/.exec(r.selectorText.trim());
        if (m && r.style) { var c = r.style.getPropertyValue('--accent').trim(); if (c) moodColour[m[1]] = c; }
      });
    });
    return moodColour;
  }
  function moodOf(cls) { var m = String(cls || '').match(/(?:^|\s)(mood-[\w-]+)/g) || []; return m.map(function (x) { return x.trim(); }).filter(function (x) { return x !== 'mood-tray-open'; }).sort().join(' '); }
  var lastMood = moodOf(root.className), rippleReady = false;
  global.addEventListener('load', function () { setTimeout(function () { lastMood = moodOf(root.className); rippleReady = true; }, 900); });
  new MutationObserver(function () {
    var m = moodOf(root.className); if (m === lastMood) return;
    var before = lastMood.split(' '); lastMood = m;
    if (!rippleReady || !(fxOn() || mcOn())) return;
    var added = m.split(' ').filter(function (x) { return x && before.indexOf(x) < 0; });
    var c = null, map = moodColours();
    for (var i = 0; i < added.length && !c; i++) c = map[added[i]];
    if (c) ripple(c);
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  function ripple(c) {
    var src = $('liveMoodBtn'), r = src && src.getBoundingClientRect(), x, y;
    if (r && r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; } else { x = global.innerWidth / 2; y = global.innerHeight / 2; }
    var el = document.createElement('div'); el.className = 'pt2-ripple' + (reduce.matches ? ' calm' : '');
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--rc', c);
    el.style.setProperty('--rx', x + 'px'); el.style.setProperty('--ry', y + 'px');
    el.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 1400);
  }

  /* background streams follow the held palette */
  function recolorFx() {
    try {
      if (typeof streams === 'undefined' || !streams.forEach) return;
      var cs = getComputedStyle(root), held = mcOn(), a = cs.getPropertyValue('--cyan').trim(), b = cs.getPropertyValue('--gold').trim();
      streams.forEach(function (s, i) { if (s._c0 == null) s._c0 = s.color; s.color = held ? (i % 3 ? a : b) : s._c0; });
    } catch (e) {}
  }
  new MutationObserver(function () { setTimeout(recolorFx, 0); }).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* sparks layer */
  function fx() {
    if ($('pt2Fx') || !document.body) return;
    var d = document.createElement('div'); d.id = 'pt2Fx'; d.setAttribute('aria-hidden', 'true');
    [[6, 14, 7.5, 0], [93, 9, 8.6, 2.1], [97, 58, 6.8, 4.2], [3, 71, 9.2, 1.3], [48, 3, 7.9, 5.6], [72, 96, 8.8, 3.2], [22, 94, 7.2, 6.4], [88, 33, 10.1, 7.3]].forEach(function (p) {
      var i = document.createElement('i'); i.style.left = p[0] + '%'; i.style.top = p[1] + '%'; i.style.setProperty('--d', p[2] + 's'); i.style.setProperty('--w', p[3] + 's'); d.appendChild(i);
    });
    document.body.appendChild(d);
  }

  /* ———————————————— hover sheen in every menu ———————————————— */
  var GLASS_SEL = '.settings-nav-btn,.ts-option,.ts-button,.font-picker-option,.font-picker-btn,.cursor-skin-opt,.mood-pick,.mood-cursor-btn,.mood-reset-item,.mood-lock-btn,.mood-btn,.mood-live,' +
    '.portal-tab,.portal-card,.pt1q .card,.btn-ghost,.btn-gold,.nav-btn,.q-nav-btn,.quiz-settings-btn,.chapter-toggle,.study-chip,.settings-btn,.fs-btn,.pt2-opt,.pt2-pg-btn,' +
    '.settings-close-modal,.pt2-mc-mode,.pt2-mc-add,.back-link,.pt2-peek';
  var glass = null, gTarget = null, gUntil = 0, gRaf = 0;
  function glassEl() { if (!glass) { glass = document.createElement('div'); glass.id = 'pt2Glass'; glass.setAttribute('aria-hidden', 'true'); document.body.appendChild(glass); } return glass; }
  function place() {
    gRaf = 0; if (!gTarget || !glass) return;
    if (!gTarget.isConnected) { hideGlass(); return; }
    var r = gTarget.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { glass.classList.remove('on'); return; }
    glass.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
    glass.style.width = r.width + 'px'; glass.style.height = r.height + 'px';
    if (performance.now() < gUntil) gRaf = requestAnimationFrame(place);
  }
  function hideGlass() { gTarget = null; if (glass) glass.classList.remove('on', 'sweep'); }
  function usable(el) { return el && !el.disabled && !el.classList.contains('locked') && !el.classList.contains('pt2-locked-dim') && el.getAttribute('aria-disabled') !== 'true'; }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!fxOn()) { if (gTarget) hideGlass(); return; } // only with Animation effects on
    var t = e.target && e.target.closest ? e.target.closest(GLASS_SEL) : null;
    if (t === gTarget) return;
    if (!t || !usable(t)) { hideGlass(); return; }
    var g = glassEl(); gTarget = t;
    g.style.borderRadius = getComputedStyle(t).borderRadius;
    g.classList.remove('sweep'); void g.offsetWidth;
    g.classList.add('on'); if (!reduce.matches) g.classList.add('sweep');
    gUntil = performance.now() + 450; if (!gRaf) gRaf = requestAnimationFrame(place);
  }, { passive: true });
  document.addEventListener('pointerdown', function () { if (gTarget) { gUntil = performance.now() + 300; if (!gRaf) gRaf = requestAnimationFrame(place); } }, { passive: true });
  global.addEventListener('scroll', function () { if (gTarget && !gRaf) gRaf = requestAnimationFrame(place); }, { passive: true, capture: true });
  document.addEventListener('pointerleave', hideGlass);
  document.addEventListener('keydown', function () { if (gTarget) hideGlass(); });

  /* ———————————————— multicolour accents ———————————————— */
  var DEF = { on: false, colors: ['#22d3ee', '#a78bfa', '#fbbf24'], mode: 'wave', speed: 3 };
  var MODES = [['gradient', 'Gradient'], ['breathing', 'Breathing'], ['wave', 'Wave'], ['aurora', 'Aurora']];
  var DUR = [0, 16, 11, 7.5, 5, 3.2];
  function mc() { var o = st().mc || {}; var m = {}; Object.keys(DEF).forEach(function (k) { m[k] = o[k] != null ? o[k] : DEF[k]; }); m.colors = (Array.isArray(m.colors) ? m.colors : DEF.colors).filter(function (c) { return /^#[0-9a-f]{6}$/i.test(c); }).slice(0, 5); if (m.colors.length < 2) m.colors = DEF.colors.slice(); if (!MODES.some(function (x) { return x[0] === m.mode; })) m.mode = 'wave'; m.speed = Math.max(1, Math.min(5, +m.speed || 3)); return m; }
  function saveMc(m) { var o = st(); o.mc = m; wr(KEY, o); applyMc(); }
  function mcOn() { return root.classList.contains('pt2-mc'); }
  function effMode(m) { return reduce.matches ? 'gradient' : m.mode; }
  var styleEl = null, ticker = null, wireTicker = null;
  function varsCss(m, p) {
    var c = m.colors, n = c.length, S = function (x) { return sample(c, x + p); }, v = {}, i;
    for (i = 0; i < 10; i++) {
      var k = S((i % n) / n);
      if (i === 5 || i === 9) k = mix(k, '#000000', .22); else if (i === 8) k = mix(k, '#ffffff', .14);
      v['--accent-' + i] = k; v['--accent-' + i + '-rgb'] = rgbs(k);
    }
    var a = S(0), b = S(1 / n), d = S(2 / n), deep = mix(a, '#000000', .55);
    v['--accent-deep'] = deep; v['--accent-deep-rgb'] = rgbs(deep);
    v['--accent'] = a; v['--cyan'] = a; v['--cyan-bright'] = mix(b, '#ffffff', .15); v['--teal'] = d; v['--gold'] = b; v['--amber'] = d;
    v['--border'] = 'rgba(' + rgbs(a) + ',.42)'; v['--mood-glow'] = 'rgba(' + rgbs(b) + ',.28)'; v['--bg-glow'] = 'rgba(' + rgbs(a) + ',.07)';
    v['--mc-grad'] = effMode(m) === 'breathing' ? 'linear-gradient(90deg,' + a + ',' + b + ',' + a + ')' : 'linear-gradient(' + (effMode(m) === 'aurora' ? '120deg' : '90deg') + ',' + c.concat([c[0]]).join(',') + ')';
    v['--mc-dur'] = DUR[m.speed] + 's';
    return 'html.pt2-mc.pt2-mc{' + Object.keys(v).map(function (k) { return k + ':' + v[k] + '!important'; }).join(';') + '}';
  }
  function applyMc() {
    var m = mc(), on = m.on && has('look:b');
    MODES.forEach(function (x) { root.classList.remove('pt2-mc-' + x[0]); });
    root.classList.toggle('pt2-mc', on);
    clearInterval(ticker); ticker = null; clearInterval(wireTicker); wireTicker = null;
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'pt2McVars'; (document.head || root).appendChild(styleEl); }
    if (!on) { styleEl.textContent = ''; repaintWires(); syncExtra(); return; }
    var mode = effMode(m);
    root.classList.add('pt2-mc-' + mode);
    styleEl.textContent = varsCss(m, 0);
    if (mode === 'breathing') {
      var t0 = performance.now();
      ticker = setInterval(function () { if (document.hidden) return; styleEl.textContent = varsCss(m, ((performance.now() - t0) / (DUR[m.speed] * 1000)) % 1); }, 70);
    }
    if (mode !== 'gradient') wireTicker = setInterval(function () { if (!document.hidden && document.querySelector('.match-stage')) repaintWires(); }, 50);
    repaintWires(); syncExtra();
  }
  function repaintWires() { try { if (typeof global.relayoutWires === 'function' && document.querySelector('.match-stage')) global.relayoutWires(); } catch (e) {} }
  var mcT0 = performance.now();
  /* stroke for a linking line: a gradient along the line in the chosen colours */
  function wireStroke(ctx, pts) {
    if (!mcOn() || !pts || pts.length < 2) return null;
    var m = mc(), mode = effMode(m), a = pts[0], z = pts[pts.length - 1];
    if (Math.abs(z.x - a.x) + Math.abs(z.y - a.y) < 2) z = { x: a.x + 1, y: a.y };
    var g = ctx.createLinearGradient(a.x, a.y, z.x, z.y), c = m.colors, ph = ((performance.now() - mcT0) / (DUR[m.speed] * 1000)) % 1, k;
    if (mode === 'gradient') { c.forEach(function (x, i) { g.addColorStop(i / (c.length - 1), x); }); return g; }
    if (mode === 'breathing') { g.addColorStop(0, sample(c, ph)); g.addColorStop(1, sample(c, ph + 1 / c.length)); return g; }
    if (mode === 'aurora') ph = (Math.sin(ph * Math.PI * 2) + 1) / 2;
    for (k = 0; k <= 10; k++) g.addColorStop(k / 10, sample(c, k / 10 - ph));
    return g;
  }

  /* Extra tab (Settings) */
  function buildExtra() {
    if (!has('look:b') || $('settings-panel-extra')) return;
    var nav = document.querySelector('.settings-nav'), panels = document.querySelector('.settings-panels');
    if (!nav || !panels) return;
    var b = document.createElement('button'); b.className = 'settings-nav-btn'; b.dataset.panel = 'extra'; b.textContent = 'Extra';
    b.addEventListener('click', function () { if (typeof global.openSettingsPanel === 'function') global.openSettingsPanel('extra'); });
    var clb = nav.querySelector('[data-panel="changelog"]'); if (clb) nav.insertBefore(b, clb); else nav.appendChild(b);
    var p = document.createElement('div'); p.className = 'settings-panel'; p.id = 'settings-panel-extra';
    p.innerHTML = '<div class="settings-panel-title">Extra</div>' +
      '<div class="setting-item" style="padding-top:8px;"><span class="setting-item-label">Multicolour Accents</span>' +
      '<p class="setting-item-desc" style="margin:4px 0 8px;">Use two to five accent colours at once. While this is on, the timer\'s mood colours do not change the page.</p>' +
      '<div class="pt2-opt-list"><div class="pt2-opt"><span class="pt2-opt-text"><span class="pt2-opt-name">Multicolour Accents</span></span>' +
      '<label class="toggle-switch"><input type="checkbox" id="pt2McOn"><span class="toggle-slider"></span></label></div></div>' +
      '<div class="pt2-mc-body"><div class="pt2-mc-preview" id="pt2McPreview"></div>' +
      '<span class="setting-item-label" style="display:block;margin-top:14px;">Colours</span><div class="pt2-mc-colors" id="pt2McColors"></div>' +
      '<span class="setting-item-label" style="display:block;margin-top:14px;">Mode</span><div class="pt2-mc-modes" id="pt2McModes">' +
      MODES.map(function (x) { return '<button type="button" class="pt2-mc-mode" data-mode="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<p class="setting-item-desc" id="pt2McModeDesc" style="margin:6px 0 0;"></p>' +
      '<span class="setting-item-label" style="display:block;margin-top:14px;">Speed</span><div class="pt2-mc-speed"><span class="setting-item-desc" style="margin:0">Slow</span>' +
      '<input type="range" id="pt2McSpeed" min="1" max="5" step="1"><span class="setting-item-desc" style="margin:0">Fast</span></div></div></div>';
    panels.appendChild(p);
    $('pt2McOn').addEventListener('change', function () { var m = mc(); m.on = this.checked; saveMc(m); });
    $('pt2McSpeed').addEventListener('input', function () { var m = mc(); m.speed = +this.value; saveMc(m); });
    $('pt2McModes').addEventListener('click', function (e) { var x = e.target.closest('.pt2-mc-mode'); if (!x) return; var m = mc(); m.mode = x.dataset.mode; saveMc(m); });
    var cols = $('pt2McColors');
    cols.addEventListener('input', function (e) { var i = e.target.dataset && e.target.dataset.i; if (i == null) return; var m = mc(); m.colors[+i] = e.target.value; saveMc(m); });
    cols.addEventListener('click', function (e) {
      var x = e.target.closest('.pt2-mc-x'), add = e.target.closest('.pt2-mc-add'), m = mc();
      if (x && m.colors.length > 2) { m.colors.splice(+x.dataset.i, 1); saveMc(m); renderColours(); }
      if (add && m.colors.length < 5) { m.colors.push(['#34d399', '#f87171', '#60a5fa', '#fb923c', '#e879f9'][m.colors.length % 5]); saveMc(m); renderColours(); }
    });
    renderColours(); syncExtra();
  }
  function renderColours() {
    var cols = $('pt2McColors'); if (!cols) return; var m = mc();
    cols.innerHTML = m.colors.map(function (c, i) {
      return '<span class="pt2-mc-chip"><input type="color" value="' + c + '" data-i="' + i + '" aria-label="Colour ' + (i + 1) + '">' +
        (m.colors.length > 2 ? '<button type="button" class="pt2-mc-x" data-i="' + i + '" aria-label="Remove colour ' + (i + 1) + '">×</button>' : '') + '</span>';
    }).join('') + (m.colors.length < 5 ? '<button type="button" class="pt2-mc-add" aria-label="Add a colour">+</button>' : '');
  }
  var DESC = { gradient: 'A still blend of your colours.', breathing: 'The accents slowly breathe from one colour to the next.', wave: 'Your colours flow across the accented parts of the page.', aurora: 'A slow diagonal drift of your colours, back and forth.' };
  function syncExtra() {
    var p = $('settings-panel-extra'); if (!p) return; var m = mc();
    $('pt2McOn').checked = !!m.on; $('pt2McSpeed').value = m.speed;
    p.classList.toggle('pt2-mc-off', !m.on);
    p.querySelectorAll('.pt2-mc-mode').forEach(function (x) { x.classList.toggle('active', x.dataset.mode === m.mode); });
    $('pt2McModeDesc').textContent = DESC[m.mode] + (reduce.matches && m.mode !== 'gradient' ? ' Reduced motion is on, so it stays still.' : '');
    var pv = $('pt2McPreview'); if (pv) pv.style.background = mcOn() ? '' : 'linear-gradient(90deg,' + m.colors.join(',') + ')';
  }

  /* —— start —— */
  function boot() { fx(); migrate(); applyFx(); wireFx(); applyMc(); buildExtra(); }
  // before the body exists: palette vars for the accent mode so nothing flashes
  if (st().mc && st().mc.on && has('look:b')) applyMc();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  global.addEventListener('load', function () { setTimeout(function () { buildExtra(); wireFx(); applyFx(); }, 0); });
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#settings-btn')) setTimeout(function () { buildExtra(); wireFx(); }, 0); }, true);
  document.addEventListener('pt2-unlocked', function (e) {
    var d = (e.detail || []);
    if (d.indexOf('look:b') >= 0) setTimeout(buildExtra, 0);
    if (d.indexOf('look:a') >= 0) setTimeout(function () { wireFx(); applyFx(); }, 0);
  });
  document.addEventListener('pt2-basic', applyFx);
  if (reduce.addEventListener) reduce.addEventListener('change', applyMc);
  /* the next-question bar runs a little quicker with this palette (never under half a second) */
  function advanceMs(ms) { return fxOn() ? Math.max(500, ms - 1250) : ms; }
  global.PT2Look = { advanceMs: advanceMs, effectsOn: fxOn, setEffects: setFx, applyEffects: applyFx, multicolourOn: mcOn, wireStroke: wireStroke, applyMc: applyMc };
})(window);
