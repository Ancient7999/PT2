/* PT2 offline layer: serves the bundled JSON and Markdown to fetch(), so the site opens from a
   double-clicked file as well as from a web server. Also the PT2 timer-box settings. */
(function (global) {
  'use strict';
  /* Background grid level (Settings → Theme): off | low | mod, saved as pt2_grid_level.
     low = the plain grid, mod (Moderate) = a light accent glow, weaker than the old Medium.
     The old Medium / High levels are read as Moderate (and saved that way).
     An older saved pt2_show_grid: '0' → off, anything else (or nothing) → low. */
  var GRID_LEVELS = ['off', 'low', 'mod'];
  function gridLevel() {
    try {
      var v = global.localStorage.getItem('pt2_grid_level');
      if (v === 'med' || v === 'high') { v = 'mod'; global.localStorage.setItem('pt2_grid_level', v); }
      if (GRID_LEVELS.indexOf(v) >= 0) return v;
      return global.localStorage.getItem('pt2_show_grid') === '0' ? 'off' : 'low';
    } catch (e) { return 'low'; }
  }
  function showGridLevel(lv) {   // what the page shows (the saved level, or a hover preview)
    var root = document.documentElement;
    root.classList.toggle('pt2-no-grid', lv === 'off');
    root.setAttribute('data-pt2-grid', lv);
  }
  function applyGrid() {
    var lv = gridLevel(); showGridLevel(lv);
    var seg = document.getElementById('pt2GridLevel'); if (!seg) return;
    [].forEach.call(seg.querySelectorAll('[data-level]'), function (bt) {
      var on = bt.getAttribute('data-level') === lv;
      bt.classList.toggle('active', on); bt.setAttribute('aria-checked', on ? 'true' : 'false'); bt.tabIndex = on ? 0 : -1;
    });
  }
  function setGridLevel(lv) {
    try { global.localStorage.setItem('pt2_grid_level', lv); global.localStorage.setItem('pt2_show_grid', lv === 'off' ? '0' : '1'); } catch (x) {}
    applyGrid();
  }
  applyGrid();
  document.addEventListener('DOMContentLoaded', applyGrid);
  /* Hover preview: pointing at (or keyboard-focusing) a level shows it on the page behind the dimmed Settings
     panel; leaving the control goes back to the saved level. */
  function wireGridGlow() {
    if (!document.getElementById('pt2GridGlow') && document.body) {
      var gl = document.createElement('div'); gl.id = 'pt2GridGlow'; gl.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(gl, document.body.firstChild);
    }
    var seg = document.getElementById('pt2GridLevel'); if (!seg || seg.dataset.glowWired) return;
    seg.dataset.glowWired = '1';
    var row = seg.closest('.pt2-opt') || seg.parentNode, root = document.documentElement;
    var preview = function (lv) { root.classList.add('pt2-grid-hover'); showGridLevel(lv || gridLevel()); };
    var end = function () { root.classList.remove('pt2-grid-hover'); showGridLevel(gridLevel()); };
    row.addEventListener('mouseenter', function () { preview(); });
    row.addEventListener('mouseleave', function () { if (!seg.contains(document.activeElement) || !document.activeElement.matches(':focus-visible')) end(); });
    seg.addEventListener('mouseover', function (e) { var bt = e.target.closest && e.target.closest('[data-level]'); preview(bt ? bt.getAttribute('data-level') : null); });
    seg.addEventListener('mouseout', function (e) { if (!e.relatedTarget || !seg.contains(e.relatedTarget)) preview(); });
    seg.addEventListener('focusin', function (e) { var bt = e.target.closest('[data-level]'); try { if (bt && bt.matches(':focus-visible')) preview(bt.getAttribute('data-level')); } catch (x) {} });
    seg.addEventListener('focusout', function (e) { if (!e.relatedTarget || !seg.contains(e.relatedTarget)) end(); });
    seg.addEventListener('click', function (e) {
      var bt = e.target.closest && e.target.closest('[data-level]'); if (!bt) return;
      setGridLevel(bt.getAttribute('data-level')); if (row.matches(':hover')) preview(); });
    seg.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
      e.preventDefault();
      var lv = GRID_LEVELS[(GRID_LEVELS.indexOf(gridLevel()) + d + GRID_LEVELS.length) % GRID_LEVELS.length];
      setGridLevel(lv); var bt = seg.querySelector('[data-level="' + lv + '"]'); if (bt) bt.focus(); preview(lv);
    });
    document.addEventListener('pointerdown', function (e) { if (!row.contains(e.target)) end(); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') end(); }, true);
  }
  document.addEventListener('DOMContentLoaded', wireGridGlow);
  /* S: connectors from English and Medical Terminology to the smaller Anatomy card. An SVG in the week grid, redrawn
     whenever the grid or the cards change size, so it stays attached; pointer-events:none so it never blocks a click. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function drawBranch(grid) {
    var an = grid.querySelector(':scope > .pt2-lesser');
    var mains = [].filter.call(grid.children, function (c) { return c !== an && c.tagName.toLowerCase() !== 'svg'; });
    var svg = grid.querySelector(':scope > svg.pt2-branch');
    if (!an || !mains.length) { if (svg) svg.remove(); return; }
    var g = grid.getBoundingClientRect(), a = an.getBoundingClientRect();
    if (!g.width || !a.width) return;
    var X = function (v) { return Math.round((v - g.left) * 10) / 10; }, Y = function (v) { return Math.round((v - g.top) * 10) / 10; };
    var html = '', r0 = 10;
    function dot(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="3.5"/>'; }
    mains.forEach(function (mc) {
      var m = mc.getBoundingClientRect(); if (!m.width) return;
      var top, bot;  // the card above and the card below
      if (a.top >= m.bottom - 4) { top = m; bot = a; } else if (m.top >= a.bottom - 4) { top = a; bot = m; } else return;
      var y1 = Y(top.bottom), y2 = Y(bot.top), ol = Math.max(top.left, bot.left), orr = Math.min(top.right, bot.right), d, x1, x2;
      if (orr - ol >= 40) {
        // they overlap sideways: a straight line down the middle of the overlap
        x1 = x2 = X((ol + orr) / 2); d = 'M' + x1 + ' ' + y1 + ' V' + y2;
      } else {
        // no overlap: down, across, down, with rounded corners
        var left = top.right <= bot.left;
        x1 = X(left ? top.right - 40 : top.left + 40); x2 = X(left ? bot.left + 40 : bot.right - 40);
        var ym = Math.round((y1 + y2) / 2), s = x2 > x1 ? 1 : -1, r = Math.max(0, Math.min(r0, Math.abs(x2 - x1) / 2, (y2 - y1) / 2));
        d = 'M' + x1 + ' ' + y1 + ' V' + (ym - r) + ' Q' + x1 + ' ' + ym + ' ' + (x1 + s * r) + ' ' + ym + ' H' + (x2 - s * r) + ' Q' + x2 + ' ' + ym + ' ' + x2 + ' ' + (ym + r) + ' V' + y2;
      }
      html += '<path d="' + d + '"/>' + dot(x1, y1) + dot(x2, y2);
      // wide screens (Anatomy below, narrower than the card above it): a second link from Anatomy's side up to
      // the far part of that card's bottom edge, outside the straight link
      if (top === m && (a.left > m.left + 60 || a.right < m.right - 60)) {
        var onLeft = (m.left + m.right) / 2 < (a.left + a.right) / 2;
        var sx = X(onLeft ? a.left : a.right), sy = Y(a.top + Math.min(a.height * 0.5, 56));
        var tx = X(onLeft ? Math.max(m.left + 40, a.left - Math.min(90, (a.left - m.left) / 2)) : Math.min(m.right - 40, a.right + Math.min(90, (m.right - a.right) / 2)));
        if (Math.abs(tx - x1) > 24 && Math.abs(sx - tx) > 14 && sy - y1 > 14) {
          var k = onLeft ? -1 : 1, rr = Math.max(0, Math.min(r0, Math.abs(sx - tx) / 2, (sy - y1) / 2));
          // from Anatomy's side: across, then up to the card's bottom edge
          var d2 = 'M' + sx + ' ' + sy + ' H' + (tx - k * rr) + ' Q' + tx + ' ' + sy + ' ' + tx + ' ' + (sy - rr) + ' V' + y1;
          html += '<path d="' + d2 + '"/>' + dot(sx, sy) + dot(tx, y1);
        }
      }
    });
    if (!svg) { svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'pt2-branch'); svg.setAttribute('aria-hidden', 'true'); grid.appendChild(svg); }
    if (svg.__h !== html) { svg.__h = html; svg.innerHTML = html; }
  }
  var branchRO = global.ResizeObserver ? new ResizeObserver(function (es) { es.forEach(function (e) { var gr = e.target.closest('.pt2-week-cards'); if (gr) drawBranch(gr); }); }) : null;
  function wireBranches() {
    document.querySelectorAll('.pt2-week-cards.pt2-has-lesser').forEach(function (gr) {
      if (!gr.__branch) { gr.__branch = true; if (branchRO) { branchRO.observe(gr); [].forEach.call(gr.children, function (c) { if (c.tagName !== 'svg') branchRO.observe(c); }); } }
      drawBranch(gr);
    });
  }
  var branchT = 0;
  function queueBranches() { if (branchT) return; branchT = requestAnimationFrame(function () { branchT = 0; wireBranches(); }); }
  document.addEventListener('DOMContentLoaded', function () {
    queueBranches();
    if (global.MutationObserver) new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) { var t = ms[i].target;
        if (t.closest && t.closest('svg.pt2-branch')) continue;
        var own = [].slice.call(ms[i].addedNodes).concat([].slice.call(ms[i].removedNodes)).every(function (n) { return n.nodeType === 1 && n.classList && n.classList.contains('pt2-branch'); });
        if (own && (ms[i].addedNodes.length || ms[i].removedNodes.length)) continue; if (t && t.closest && (t.closest('.pt2-week-cards') || t.querySelector && t.querySelector('.pt2-week-cards'))) { queueBranches(); return; } }
    }).observe(document.body, { childList: true, subtree: true });
  });
  global.addEventListener('resize', queueBranches);
  // cards that slide in (Animation effects) end up somewhere else than where they started: redraw after
  document.addEventListener('animationend', function (e) { var t = e.target; if (t && t.closest && t.parentElement && t.parentElement.classList && t.parentElement.classList.contains('pt2-week-cards')) queueBranches(); });
  global.addEventListener('orientationchange', function () { queueBranches(); setTimeout(queueBranches, 300); });
  global.addEventListener('load', queueBranches);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueBranches);
  /* the Settings text button sits on the same line as the Fullscreen button of the open view */
  function alignSettings() {
    var w = document.getElementById('settings-wrapper'); if (!w) return;
    // Phone chrome is viewport-fixed; desktop alignment uses document coordinates.
    var phone = document.documentElement.classList.contains('pt2-phone') ||
      (global.matchMedia && global.matchMedia('(pointer: coarse) and (max-width: 768px), (pointer: coarse) and (max-height: 500px)').matches);
    if (phone) { w.style.removeProperty('top'); return; }
    var f = [].slice.call(document.querySelectorAll('[data-fs]')).filter(function (x) { return x.offsetParent; })[0];
    if (!f) { w.style.removeProperty('top'); return; }
    var top = Math.round(f.getBoundingClientRect().top + global.scrollY);
    if (top > 0 && top < 200) w.style.setProperty('top', top + 'px', 'important');
  }
  document.addEventListener('DOMContentLoaded', function () { alignSettings(); setTimeout(alignSettings, 400); });
  global.addEventListener('resize', alignSettings);
  document.addEventListener('click', function () { setTimeout(alignSettings, 60); setTimeout(alignSettings, 500); }, true);
  global.addEventListener('hashchange', function () { setTimeout(alignSettings, 60); });
  /* PT2 has no Mastery system: drop any saved mastery or hidden-question data */
  try { ['study_portal_mastery_v1', 'study_portal_dnsa_v1'].forEach(function (k) { global.localStorage.removeItem(k); }); } catch (e) {}
  var B = global.__PT2_BUNDLE || {};
  var realFetch = global.fetch ? global.fetch.bind(global) : null;
  function keyOf(u) {
    var s = String(u && u.url ? u.url : u);
    try { s = decodeURIComponent(s); } catch (e) {}
    s = s.split('#')[0].split('?')[0];
    var i = s.indexOf('/banks/'), j = s.indexOf('/data/'), k = s.indexOf('/content/');
    var cut = [i, j, k].filter(function (x) { return x >= 0; });
    if (cut.length) s = s.slice(Math.min.apply(null, cut) + 1);
    return s.replace(/^\.\//, '').replace(/^\//, '');
  }
  global.fetch = function (u, o) {
    var k = keyOf(u);
    if (Object.prototype.hasOwnProperty.call(B, k)) {
      var v = B[k], body = typeof v === 'string' ? v : JSON.stringify(v);
      // answer after the page has loaded, like a real request would, so every script is ready
      return new Promise(function (res) {
        var go = function () { res(new Response(body, { status: 200, headers: { 'Content-Type': typeof v === 'string' ? 'text/plain' : 'application/json' } })); };
        if (document.readyState === 'complete') setTimeout(go, 0); else global.addEventListener('load', function () { setTimeout(go, 0); }, { once: true });
      });
    }
    if (!realFetch) return Promise.reject(new Error('offline: ' + k));
    return realFetch(u, o);
  };

  /* —— timer box settings (saved on this device) —— */
  var PREFS = [
    { id: 'pt2PomoOff', key: 'pt2_pomo_disabled', cls: 'pt2-pomo-off' },
    { id: 'pt2PomoMute', key: 'pt2_pomo_muted', cls: 'pt2-pomo-muted' },
    { id: 'pt2HideQuotes', key: 'pt2_hide_quotes', cls: 'pt2-hide-quotes' },
    { id: 'pt2HideEmojis', key: 'pt2_hide_emojis', cls: 'pt2-hide-emojis' },
    { id: 'pt2HideDock', key: 'pt2_hide_dock', cls: 'pt2-hide-dock' }
  ];
  function get(k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }
  function set(k, on) { try { localStorage.setItem(k, on ? '1' : '0'); } catch (e) {} }
  var root = document.documentElement;
  /* Drop leftover emoji/timed mood-lock flags. Accent lock is only Settings → Lock accent. */
  try {
    localStorage.removeItem('pt2_mood_lock_until');
    localStorage.removeItem('pt2_mood_lock');
    document.documentElement.classList.remove('pt2-mood-locked');
  } catch (e) {}
  PREFS.forEach(function (p) { root.classList.toggle(p.cls, get(p.key)); });
  try { root.classList.toggle('pt2-accent-locked', get('pt2_accent_lock')); } catch (e) {}
  global.PT2Prefs = { muted: function () { return get('pt2_pomo_muted'); }, disabled: function () { return get('pt2_pomo_disabled'); },
    // no automatic mood colours while the timer is off or the Timer box is hidden
    moodFrozen: function () { return get('pt2_pomo_disabled') || get('pt2_hide_dock'); },
    moodLocked: function () { return false; },
    accentLocked: function () { return get('pt2_accent_lock'); } };
  try { var gotU = JSON.parse(localStorage.getItem('pt2_emoji_unlocked_v1') || '{}') || {};
    root.classList.toggle('pt2-la-open', !!gotU['look:a']); root.classList.toggle('pt2-lb-open', !!gotU['look:b']);
    var lk = JSON.parse(localStorage.getItem('pt2_look_v1') || '{}') || {};
    if (gotU['look:a'] && (lk.fx || lk.e) && !root.classList.contains('pt2-basic')) root.classList.add('pt2-fx');
    if (gotU['look:b'] && lk.mc && lk.mc.on) root.classList.add('pt2-mc', 'pt2-mc-' + (lk.mc.mode || 'gradient')); } catch (e) {}
  /* Basic theme (Settings → Theme, saved as pt2_basic_theme; off by default): a plainer, lighter page. The accent
     colour still works; the custom cursor and the heavy effects are off while it is on (css/pt2-site.css). */
  var BASIC = 'pt2_basic_theme';
  function basicOn() { try { return global.localStorage.getItem(BASIC) === '1'; } catch (e) { return false; } }
  function cursorPref() { try { var c = global.localStorage.getItem('pt1_custom_cursor'); return !(c === '0' || c === 'false' || c === 'off'); } catch (e) { return true; } }
  function applyBasic() {
    var on = basicOn();
    root.classList.toggle('pt2-basic', on);
    if (on) root.setAttribute('data-custom-cursor', 'off');
    else if (root.getAttribute('data-custom-cursor') === 'off' && cursorPref()) root.setAttribute('data-custom-cursor', 'on');
    var t = document.getElementById('pt2BasicOn'); if (t) t.checked = on;
    var cp = document.getElementById('theme-cursor-picker'); if (cp) cp.classList.toggle('pt2-basic-off', on);
    try { document.dispatchEvent(new CustomEvent('pt2-basic', { detail: on })); global.dispatchEvent(new CustomEvent('study-prefs-changed', { detail: { basic: on } })); } catch (e) {}
  }
  applyBasic();
  // other scripts set the cursor attribute back on: keep it off while Basic theme is on
  new MutationObserver(function () { if (root.classList.contains('pt2-basic') && root.getAttribute('data-custom-cursor') !== 'off') root.setAttribute('data-custom-cursor', 'off'); })
    .observe(root, { attributes: true, attributeFilter: ['data-custom-cursor'] });
  document.addEventListener('DOMContentLoaded', function () {
    var t = document.getElementById('pt2BasicOn'); if (!t) return;
    t.checked = basicOn();
    t.addEventListener('change', function () { try { global.localStorage.setItem(BASIC, this.checked ? '1' : '0'); } catch (e) {} applyBasic(); });
    applyBasic();
  });
  /* Settings → Accent Color → Lock accent: keep accent through emoji / automatic colour changes */
  function syncAccentLock() {
    var on = get('pt2_accent_lock');
    root.classList.toggle('pt2-accent-locked', on);
    root.classList.remove('pt2-mood-locked');
    var el = document.getElementById('pt2AccentLock');
    if (el) el.checked = on;
  }
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || t.id !== 'pt2AccentLock') return;
    set('pt2_accent_lock', !!t.checked);
    try { localStorage.removeItem('pt2_mood_lock'); localStorage.removeItem('pt2_mood_lock_until'); } catch (err) {}
    syncAccentLock();
    try { document.dispatchEvent(new CustomEvent('pt2-accent-lock', { detail: !!t.checked })); } catch (err) {}
    if (t.checked && global.PT2Color && typeof PT2Color.onAccent === 'function') {
      try { PT2Color.onAccent(); } catch (err) {}
    }
  });
  document.addEventListener('DOMContentLoaded', syncAccentLock);
  syncAccentLock();
  /* quiz order switches in Settings mirror the Quiz settings panel above the banks */
  var MIRROR = {};
  function sync() {
    PREFS.forEach(function (p) { var el = document.getElementById(p.id); if (el) el.checked = get(p.key); });
    Object.keys(MIRROR).forEach(function (m) { var a = document.getElementById(m), b = document.getElementById(MIRROR[m]); if (a && b) a.checked = b.checked; });
  }
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.id) return;
    if (MIRROR[t.id]) { var o = document.getElementById(MIRROR[t.id]); if (o && o.checked !== t.checked) { o.checked = t.checked; o.dispatchEvent(new Event('change', { bubbles: true })); } return; }
    var p = PREFS.filter(function (x) { return x.id === t.id; })[0]; if (!p) return;
    set(p.key, t.checked); root.classList.toggle(p.cls, t.checked);
    if (p.key === 'pt2_pomo_disabled' && typeof global.setPomodoroEnabled === 'function') global.setPomodoroEnabled(!t.checked);
  });
  document.addEventListener('click', function () { setTimeout(sync, 0); }, true);
  document.addEventListener('DOMContentLoaded', sync);
  /* t336u: a material's description (e.g. the Anatomy picture credit) shown under a view's title */
  global.PT2Intro = function (after, id, parts) {
    if (!after) return;
    var el = document.getElementById(id);
    if (!el) { el = document.createElement('p'); el.id = id; el.className = 'portal-subject-intro pt2-view-intro'; after.parentNode.insertBefore(el, after.nextSibling); }
    while (el.firstChild) el.removeChild(el.firstChild);
    (Array.isArray(parts) ? parts : []).forEach(function (x) {
      if (typeof x === 'string') { el.appendChild(document.createTextNode(x)); return; }
      if (!x || !x.text) return;
      if (x.href) { var a = document.createElement('a'); a.href = x.href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = x.text; el.appendChild(a); }
      else el.appendChild(document.createTextNode(x.text));
    });
    el.hidden = !el.childNodes.length;
  };
  global.addEventListener('load', function () {
    sync();
    if (get('pt2_pomo_disabled') && typeof global.setPomodoroEnabled === 'function') global.setPomodoroEnabled(false);
  });
})(window);
