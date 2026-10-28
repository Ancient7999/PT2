/* PT2 emoji unlocks (local only, saved on this device; no accounts, no XP, no progress shown).
   Counted per week: a week's tally = distinct questions of that week's banks answered correctly at least once
   (window.__PT2_QIDS.weeks lists the banks of each week; the build fills it), plus, for Week 11, each picture study
   item (a picture, a picture variant or a bone page) solved completely once. Week 11 = English, Medical Terminology
   and Anatomy; Medical Physics and Study Skills (Week 12) do not count. The Week 11 emoji (🎓) needs every Week 11
   quiz question solved; picture study is not required for it.
   Each week has its own ledger, so 'Reset solved' on a set does not take unlocks away.
   To add Week 12 later: add 'week12' banks in build_pt2.py (WEEKS) and a { week: 'week12', unlocks: [...] } entry below. */
(function (global) {
  'use strict';
  var GOT = 'pt2_emoji_unlocked_v1', PREFIX = 'sp_bank_v1:';
  var Q = global.__PT2_QIDS || { banks: {}, weeks: {} };
  var WEEKS = [
    { week: 'week11', pictures: true, done: 'Every Week 11 question solved', unlocks: [
      { emoji: '⚡', at: 20, label: 'Electric', fam: 'mood-fierce', cls: 'mood-electric' },
      { emoji: '📚', at: 70, label: 'Bookworm', fam: 'mood-calm', cls: 'mood-calm' },
      { emoji: '🧠', at: 150, label: 'Big Brain', fam: 'mood-happy', cls: 'mood-happy' },
      { emoji: '🚀', at: 280, label: 'Lift-off', fam: 'mood-fierce', cls: 'mood-fierce' },
      { emoji: '🏅', at: 360, label: 'Medal', fam: 'mood-happy', cls: 'mood-happy' },
      { emoji: '💎', at: 495, label: 'Diamond', fam: 'mood-calm', cls: 'mood-calm' },
      { emoji: '🏆', at: 600, label: 'Champion', fam: 'mood-happy', cls: 'mood-happy' },
      { emoji: '👑', at: 800, label: 'Royal', fam: 'mood-happy', cls: 'mood-happy' },
      { emoji: '🎓', all: true, label: 'Week 11 Graduate', fam: 'mood-happy', cls: 'mood-happy' }
    ] }
    // { week: 'week12', done: 'Every Week 12 question solved', unlocks: [ ... ] }   (none yet)
  ];
  var UNLOCKS = [];
  WEEKS.forEach(function (w) { w.banks = (Q.weeks && Q.weeks[w.week]) || []; w.ledger = 'pt2_solved_ever_v1:' + w.week; w.unlocks.forEach(function (u) { u.w = w; UNLOCKS.push(u); }); });
  function lsGet(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, v); } catch (e) {} }
  function readJSON(k, d) { try { var v = JSON.parse(lsGet(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  var known = {};
  Object.keys(Q.banks).forEach(function (bk) { known[bk] = {}; Q.banks[bk].forEach(function (id) { known[bk][id] = 1; }); });
  /* fold the current solved sets of a week's banks into that week's ledger (only real question ids) */
  function sync(w) {
    var L = readJSON(w.ledger, {}), changed = false;
    w.banks.forEach(function (bk) {
      if (!known[bk]) return;
      var st = readJSON(PREFIX + bk, null); if (!st || !st.solved) return;
      var ids = Array.isArray(st.solved) ? st.solved : Object.keys(st.solved);
      ids.forEach(function (id) { if (known[bk][id] && !L[bk + '|' + id]) { L[bk + '|' + id] = 1; changed = true; } });
    });
    if (changed) lsSet(w.ledger, JSON.stringify(L));
    return L;
  }
  function allDone(w, L) {
    if (!w.banks.length) return false;
    return w.banks.every(function (bk) { return (Q.banks[bk] || []).length && Q.banks[bk].every(function (id) { return L[bk + '|' + id]; }); });
  }
  function isOpen(u, L, n) { return u.all ? allDone(u.w, L) : n >= u.at; }
  function unlocked() { return readJSON(GOT, {}); }
  function byEmoji(e) { for (var i = 0; i < UNLOCKS.length; i++) if (UNLOCKS[i].emoji === e) return UNLOCKS[i]; return null; }
  function isLocked(e) { var u = byEmoji(e); return !!(u && !unlocked()[e]); }

  /* the unlock pop-up: PT2's achievement pop-up, in the accent colour */
  var queue = [], showing = false;
  function popup(u) { queue.push(u); if (!showing) next(); }
  function next() {
    var u = queue.shift(); if (!u) { showing = false; return; }
    showing = true;
    var old = document.getElementById('pt2-unlock-popup'); if (old) old.remove();
    var p = document.createElement('div');
    p.id = 'pt2-unlock-popup'; p.setAttribute('role', 'status'); p.setAttribute('aria-live', 'polite');
    p.innerHTML = '<div class="achievement-popup-content"><div class="achievement-popup-icon"></div><div class="achievement-popup-text">'
      + '<div class="achievement-popup-title">New emoji unlocked</div><div class="achievement-popup-name"></div><div class="achievement-popup-desc"></div></div></div>';
    p.querySelector('.achievement-popup-icon').textContent = u.emoji;
    p.querySelector('.achievement-popup-name').textContent = u.emoji + ' ' + u.label;
    p.querySelector('.achievement-popup-desc').textContent = u.all ? u.w.done : u.at + ' questions solved';
    document.body.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.remove(); next(); }, 4500);
  }

  /* picker: a locked emoji is not shown at all; it appears only once unlocked */
  function decorate() { decorate0(); paginate(false); }
  function decorate0() {
    var row = document.querySelector('#moodTray .mood-tray-row'); if (!row) return;
    var got = unlocked();
    UNLOCKS.forEach(function (u) {
      var b = row.querySelector('.mood-pick[data-mood="' + u.emoji + '"]');
      if (!got[u.emoji]) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'mood-pick pt2-unlockable'; b.dataset.mood = u.emoji; b.textContent = u.emoji; b.title = u.label; row.appendChild(b); }
    });
    // locked emojis are never chosen automatically either
    try {
      if (typeof FOCUS_MOOD_POOL !== 'undefined') UNLOCKS.forEach(function (u) {
        var i = FOCUS_MOOD_POOL.indexOf(u.emoji);
        if (!got[u.emoji] && i !== -1) { FOCUS_MOOD_POOL.splice(i, 1); FOCUS_MOOD_POOL.__pt2Held = (FOCUS_MOOD_POOL.__pt2Held || []).concat(u.emoji); }
        else if (got[u.emoji] && FOCUS_MOOD_POOL.__pt2Held && FOCUS_MOOD_POOL.__pt2Held.indexOf(u.emoji) !== -1 && i === -1) FOCUS_MOOD_POOL.push(u.emoji);
      });
    } catch (e) {}
  }
  function check(quiet) {
    var got = unlocked(), fresh = [], counts = {};
    WEEKS.forEach(function (w) {
      var L = sync(w), n = Object.keys(L).length; counts[w.week] = n;
      w.unlocks.forEach(function (u) { if (!got[u.emoji] && isOpen(u, L, n)) { got[u.emoji] = Date.now(); fresh.push(u); } });
    });
    if (fresh.length) { lsSet(GOT, JSON.stringify(got)); if (!quiet) fresh.forEach(popup); }
    decorate();
    return { solved: counts, fresh: fresh.map(function (u) { return u.emoji; }) };
  }
  // the new emojis need a mood entry so choosing them works like any other emoji
  /* W: emoji picker paging, 20 per page. With 20 or fewer selectable emojis the pager is display:none (no space kept). */
  var PER = 20, page = 0;
  function picks(row) {
    return Array.prototype.filter.call(row.querySelectorAll('.mood-pick'), function (b) {
      b.classList.remove('pt2-pg-off');
      return !b.hidden && global.getComputedStyle(b).display !== 'none';
    });
  }
  function paginate(toActive) {
    var row = document.querySelector('#moodTray .mood-tray-row'); if (!row) return;
    var pg = document.getElementById('pt2MoodPager');
    if (!pg) {
      pg = document.createElement('div'); pg.id = 'pt2MoodPager'; pg.className = 'pt2-mood-pager'; pg.hidden = true;
      var arrow = function (d) { return '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="' + (d < 0 ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5') + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
      pg.innerHTML = '<button type="button" class="pt2-pg-btn" data-d="-1" aria-label="Previous emojis">' + arrow(-1) + '</button><span class="pt2-pg-ind" aria-live="polite"></span><button type="button" class="pt2-pg-btn" data-d="1" aria-label="More emojis">' + arrow(1) + '</button>';
      row.parentNode.insertBefore(pg, row.nextSibling);
      pg.addEventListener('click', function (e) {
        var b = e.target.closest('.pt2-pg-btn'); if (!b) return;
        e.stopPropagation(); page += +b.dataset.d; paginate(false);
        try { if (typeof cancelMoodClose === 'function') cancelMoodClose(); } catch (x) {}
      });
    }
    var list = picks(row), n = Math.ceil(list.length / PER) || 1;
    if (toActive) { var ai = list.findIndex(function (b) { return b.classList.contains('active'); }); if (ai >= 0) page = Math.floor(ai / PER); }
    page = Math.max(0, Math.min(n - 1, page));
    if (list.length <= PER) { pg.hidden = true; page = 0; return; }
    list.forEach(function (b, i) { if (Math.floor(i / PER) !== page) b.classList.add('pt2-pg-off'); });
    pg.hidden = false;
    pg.querySelector('.pt2-pg-ind').textContent = (page + 1) + ' / ' + n;
    pg.querySelector('[data-d="-1"]').disabled = page === 0;
    pg.querySelector('[data-d="1"]').disabled = page === n - 1;
  }
  function addMoods() {
    try {
      if (typeof MOODS === 'undefined') return;
      UNLOCKS.forEach(function (u) { if (!MOODS.some(function (m) { return m.emoji === u.emoji; })) MOODS.push({ emoji: u.emoji, cls: u.cls, fam: u.fam, label: u.label }); });
    } catch (e) {}
  }
  function wrapStore() {
    var S = global.StudyStore; if (!S || S.__pt2Unlocks) return;
    S.__pt2Unlocks = true;
    ['markSolved', 'save'].forEach(function (fn) {
      var orig = S[fn]; if (typeof orig !== 'function') return;
      S[fn] = function () { var r = orig.apply(this, arguments); setTimeout(function () { check(false); }, 0); return r; };
    });
  }
  function init() { addMoods(); wrapStore(); check(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  // for tests only (nothing in the page shows counts or the next unlock)
  function weekOf(id) { for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].week === id) return WEEKS[i]; return null; }
  function pictureSolved(id) {
    var w = null; for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].pictures) w = WEEKS[i];
    if (!w || !id) return;
    var L = readJSON(w.ledger, {}); if (L['pic|' + id]) return;
    L['pic|' + id] = 1; lsSet(w.ledger, JSON.stringify(L)); check(false);
  }
  global.PT2Unlocks = { check: check, pictureSolved: pictureSolved, paginate: paginate, count: function (wk) { var w = weekOf(wk || 'week11'); return w ? Object.keys(sync(w)).length : 0; }, weekDone: function (wk) { var w = weekOf(wk || 'week11'); return !!w && allDone(w, sync(w)); }, list: UNLOCKS, isLocked: isLocked };
})(window);
