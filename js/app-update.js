/* What's New pop-up, Settings → Changelog and the "new update" notice. Reads js/app-info.js. */
(function (g) {
  'use strict';
  var INFO = g.APP_INFO; if (!INFO || !INFO.version) return;
  var V = String(INFO.version), D = String(INFO.revisionDate || '');
  var releases = Array.isArray(INFO.releases) && INFO.releases.length ? INFO.releases : [{ version: V, date: D, changes: INFO.changelog || [] }];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return g.localStorage.getItem(k); g.localStorage.setItem(k, v); } catch (e) { return null; } }
  function $(id) { return document.getElementById(id); }

  // drop the ?u= left by the Update button so it does not stay in the address bar
  try { var u0 = new URL(g.location.href); if (u0.searchParams.has('u')) { u0.searchParams.delete('u'); g.history.replaceState(g.history.state, '', u0.pathname + (u0.search || '') + u0.hash); } } catch (e) {}

  /* —— What's New pop-up: once per version and date —— */
  var WKEY = 'pt2_welcome_v' + V + '_r' + D.replace(/\//g, '-');
  function returningVisitor() {
    // a first visit has none of PT2's saved settings or progress yet, so there is nothing "new" to tell
    try {
      for (var i = 0; i < g.localStorage.length; i++) {
        var k = g.localStorage.key(i) || '';
        if (/^pt2_welcome_v|^pt2_solve_count_v1$|^pt2_solved_ever_v1/.test(k)) continue;
        if (/^pt2_/.test(k) || /^sp_bank_v1:.*\/pt2\//.test(k) || /^sp_bank_v1:anatomy\//.test(k) || k === 'sp_study_images_v1') return true;
      }
    } catch (e) {}
    return false;
  }
  function attachScrollDot(ul, dot) {
    function move() {
      var room = ul.scrollHeight - ul.clientHeight;
      dot.style.display = room > 2 ? '' : 'none';
      if (room <= 2) return;
      var ratio = Math.max(0, Math.min(1, ul.scrollTop / room));
      dot.style.top = (8 + ratio * Math.max(0, ul.clientHeight - 24)) + 'px';
    }
    ul.addEventListener('scroll', move, { passive: true }); g.addEventListener('resize', move); move();
  }
  function onKey(e) {
    var p = $('welcome-popup'); if (!p || p.style.display === 'none') return;
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); dismissWelcomePopup(); }
  }
  function checkWelcomePopup() {
    if (ls(WKEY)) return;
    if (!returningVisitor()) { ls(WKEY, '1'); return; }
    var p = $('welcome-popup');
    if (!p) {
      p = document.createElement('div'); p.id = 'welcome-popup'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'welcome-version-title');
      p.innerHTML = '<div class="wp-head"><h3 id="welcome-version-title"></h3></div>' +
        '<div class="wp-body"><ul id="welcome-changelog-list"></ul><div id="welcome-scroll-dot" aria-hidden="true"></div></div>' +
        '<div class="wp-foot"><span class="wp-note">You can find this again in Settings → Changelog</span>' +
        '<button type="button" class="wp-close" id="welcome-close">Close</button></div>';
      document.body.appendChild(p);
      $('welcome-close').addEventListener('click', dismissWelcomePopup);
    }
    p.style.display = 'flex';
    $('welcome-version-title').textContent = "What's New in Version " + V;
    var ul = $('welcome-changelog-list');
    ul.innerHTML = (INFO.changelog || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    attachScrollDot(ul, $('welcome-scroll-dot'));
    document.addEventListener('keydown', onKey, true);
    try { $('welcome-close').focus({ preventScroll: true }); } catch (e) {}
  }
  function dismissWelcomePopup() {
    var p = $('welcome-popup'); if (p) p.style.display = 'none';
    ls(WKEY, '1');   // always treated as "do not show again for this version"
    document.removeEventListener('keydown', onKey, true);
  }
  g.checkWelcomePopup = checkWelcomePopup; g.dismissWelcomePopup = dismissWelcomePopup;

  /* —— Settings → Changelog —— */
  function fillChangelog() {
    var box = $('changelog-releases'); if (!box) return;
    var v = $('about-version'), d = $('about-revision-date');
    if (v) v.textContent = V; if (d) d.textContent = D;
    // newest first, whatever order the blocks were written in
    var vnum = function (r) { return String(r.version).split('.').map(Number); };
    var list = releases.slice().sort(function (a, b) { var x = vnum(a), y = vnum(b); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (y[i] || 0) - (x[i] || 0); if (d) return d; } return 0; });
    box.innerHTML = list.map(function (r) {
      return '<div class="cl-release"><div class="cl-ver">v' + esc(r.version) + ' — ' + esc(r.date) + '</div><ul class="changelog-list">' +
        (r.changes || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  /* —— new update notice —— */
  var last = 0, shown = false, SRC = 'js/app-info.js';
  function check() {
    if (shown || !g.fetch || g.location.protocol === 'file:') return;
    var now = Date.now(); if (now - last < 60000) return; last = now;
    // no-cache: always asks the server, and refreshes the browser's copy that the script tag uses
    g.fetch(SRC, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
      if (!t) return;
      var v = (t.match(/version:\s*'([^']+)'/) || [])[1], d = (t.match(/date:\s*'([^']+)'/) || [])[1];
      if (v && (v !== V || (d && d !== D))) showNotice();
    }).catch(function () {});
  }
  function showNotice() {
    if (shown || !document.body) return; shown = true;
    var n = document.createElement('div'); n.className = 'pt2-upd'; n.id = 'pt2UpdateNotice'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite');
    n.innerHTML = '<div class="pt2-upd-card"><span class="pt2-upd-text">A new update is available.</span><button type="button" class="pt2-upd-btn">Update</button></div>';
    document.body.appendChild(n);
    n.querySelector('.pt2-upd-btn').addEventListener('click', function () {
      this.disabled = true; this.textContent = 'Updating…';
      var here = g.location.href.split('#')[0];
      var go = function () { try { var u = new URL(g.location.href); u.searchParams.set('u', Date.now()); g.location.replace(u.toString()); } catch (e) { g.location.reload(); } };
      // refresh the cached page and version file first, then load the page past the cache
      Promise.all([g.fetch(here, { cache: 'reload' }), g.fetch(SRC, { cache: 'reload' })]).then(go, go);
    });
  }
  g.PT2Update = { check: function () { last = 0; check(); }, show: showNotice, version: V };

  function start() {
    fillChangelog(); checkWelcomePopup();
    setTimeout(check, 6000);
    setInterval(function () { if (!document.hidden) check(); }, 10 * 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    g.addEventListener('pageshow', function (e) { if (e.persisted) { last = 0; check(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
