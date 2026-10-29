/* PT2 offline layer: serves the bundled JSON and Markdown to fetch(), so the site opens from a
   double-clicked file as well as from a web server. Also the PT2 timer-box settings. */
(function (global) {
  'use strict';
  /* Background grid level (Settings → Theme): off | low | med | high, saved as pt2_grid_level.
     low = the plain grid, high = the accent glow the row used to show on hover, med = halfway (glow at half strength).
     An older saved pt2_show_grid: '0' → off, anything else (or nothing) → low. */
  var GRID_LEVELS = ['off', 'low', 'med', 'high'];
  function gridLevel() {
    try {
      var v = global.localStorage.getItem('pt2_grid_level');
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
  /* S: connector from Medical Terminology to the lesser Anatomy card. An SVG in the week grid, redrawn whenever the grid
     or the cards change size, so it stays attached; pointer-events:none so it never blocks a click. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function drawBranch(grid) {
    var an = grid.querySelector(':scope > .pt2-lesser'), mt = an && an.previousElementSibling;
    var svg = grid.querySelector(':scope > svg.pt2-branch');
    if (!an || !mt) { if (svg) svg.remove(); return; }
    var g = grid.getBoundingClientRect(), a = an.getBoundingClientRect(), m = mt.getBoundingClientRect();
    if (!g.width || !a.width || !m.width) return;
    if (!svg) { svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'pt2-branch'); svg.setAttribute('aria-hidden', 'true'); grid.appendChild(svg); }
    var X = function (v) { return Math.round((v - g.left) * 10) / 10; }, Y = function (v) { return Math.round((v - g.top) * 10) / 10; };
    var r = 10, d, p0, p1;
    if (a.left >= m.right - 4) {
      // beside it (wide screens): out of Medical Terminology's right edge, down the gap, into Anatomy's left edge
      var y1 = Y(m.top + m.height * 0.5), y2 = Y(a.top + Math.min(a.height * 0.5, 60)), x1 = X(m.right), x2 = X(a.left), xm = Math.round((x1 + x2) / 2);
      var rr = Math.max(0, Math.min(r, (x2 - x1) / 2 - 1, Math.abs(y2 - y1) / 2));
      d = 'M' + x1 + ' ' + y1 + ' H' + (xm - rr) + ' Q' + xm + ' ' + y1 + ' ' + xm + ' ' + (y1 + rr) + ' V' + (y2 - rr) + ' Q' + xm + ' ' + y2 + ' ' + (xm + rr) + ' ' + y2 + ' H' + x2;
      p0 = [x1, y1]; p1 = [x2, y2];
    } else {
      // under it (narrow screens): down from Medical Terminology's bottom edge, then right into Anatomy's left edge
      var xs = X(m.left + Math.max(18, Math.min(40, (a.left - m.left) / 2))), ys = Y(m.bottom), ye = Y(a.top + Math.min(a.height * 0.5, 50)), xe = X(a.left);
      if (xe - xs < 8) xs = X(a.left + 26);
      var r2 = Math.max(0, Math.min(r, (xe - xs) - 1, (ye - ys) / 2));
      d = xe > xs ? 'M' + xs + ' ' + ys + ' V' + (ye - r2) + ' Q' + xs + ' ' + ye + ' ' + (xs + r2) + ' ' + ye + ' H' + xe : 'M' + xs + ' ' + ys + ' V' + Y(a.top);
      p0 = [xs, ys]; p1 = xe > xs ? [xe, ye] : [xs, Y(a.top)];
    }
    var html = '<path d="' + d + '"/><circle cx="' + p0[0] + '" cy="' + p0[1] + '" r="3.5"/><circle cx="' + p1[0] + '" cy="' + p1[1] + '" r="3.5"/>';
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
  global.addEventListener('load', queueBranches);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueBranches);
  /* the Settings text button sits on the same line as the Fullscreen button of the open view */
  function alignSettings() {
    var w = document.getElementById('settings-wrapper'); if (!w) return;
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
  PREFS.forEach(function (p) { root.classList.toggle(p.cls, get(p.key)); });
  global.PT2Prefs = { muted: function () { return get('pt2_pomo_muted'); }, disabled: function () { return get('pt2_pomo_disabled'); },
    // no automatic mood colours while the timer is off or the Timer box is hidden
    moodFrozen: function () { return get('pt2_pomo_disabled') || get('pt2_hide_dock'); },
    moodLocked: function () { return get('pt2_mood_lock'); } };
  /* Lock emoji control shows only once unlocked (js/pt2-unlocks.js, feature:moodLock); set here so it never flashes.
     A lock already switched on keeps working while the control is hidden. */
  try { var gotU = JSON.parse(localStorage.getItem('pt2_emoji_unlocked_v1') || '{}') || {}; root.classList.toggle('pt2-lock-open', !!gotU['feature:moodLock']);
    root.classList.toggle('pt2-la-open', !!gotU['look:a']); root.classList.toggle('pt2-lb-open', !!gotU['look:b']);
    var lk = JSON.parse(localStorage.getItem('pt2_look_v1') || '{}') || {};
    if (gotU['look:a'] && lk.e) { root.classList.add('pt2-electric'); root.setAttribute('data-cursor', 'intro'); }
    if (gotU['look:b'] && lk.mc && lk.mc.on) root.classList.add('pt2-mc', 'pt2-mc-' + (lk.mc.mode || 'gradient')); } catch (e) {}
  /* Lock emoji (in the emoji dropdown): keeps the chosen emoji; unlocking restores automatic changes */
  function syncLock() {
    var on = get('pt2_mood_lock'), b = document.getElementById('pt2MoodLock');
    root.classList.toggle('pt2-mood-locked', on);
    if (!b) return;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.title = on ? 'Emoji locked · it stays as chosen' : 'Keep this emoji instead of letting it change automatically';
    var i = b.querySelector('.mood-lock-box'); if (i) i.textContent = on ? '\u2713' : '';
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#pt2MoodLock'); if (!b) return;
    e.stopPropagation(); set('pt2_mood_lock', !get('pt2_mood_lock')); syncLock();
  }, true);
  document.addEventListener('DOMContentLoaded', syncLock);
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
