/* PT2 emoji unlocks (local only, saved on this device; no accounts, no XP, no progress shown).
   Counted per week: a week's tally = distinct questions of that week's banks answered correctly at least once
   (the banks of each week come from the catalog's week tags; Anatomy always counts), plus, for Week 11, each picture
   study label named correctly once (per label of a picture, whatever the mode or picture variant). Week 11 = English,
   Medical Terminology and Anatomy; Medical Physics and Study Skills are Week 12. The Week 11 emoji (🎓) needs every
   Week 11 quiz question solved; picture study is not required for it.
   Each week has its own ledger, so 'Reset solved' on a set does not take unlocks away.
   Solving every Week 12 question unlocks 😌 and 🧘 together. The Week 12 tally is retroactive: it reads the solved
   sets plus the ids of sets that were fully solved and then reset (resets[card].ids; a set can only be reset once
   nothing is left in it), so history from before the unlock existed still counts. */
(function (global) {
  'use strict';
  var GOT = 'pt2_emoji_unlocked_v1', PREFIX = 'sp_bank_v1:';
  var Q = global.__PT2_QIDS || { banks: {}, weeks: {} };
  /* The bank and week lists are read from data/catalog.json and the bank files when the page loads (through the offline
     bundle when it is there), so they always match the banks in use. A list the bundle provides is only a head start. */
  var PICS = [], PICLAB = {}, PIC_STORE = 'sp_study_images_v1';
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
    ], features: [
      // the Lock emoji control in the emoji dropdown: hidden (html:not(.pt2-lock-open)) until 250 questions are solved
      { key: 'feature:moodLock', icon: '🔒', at: 250, label: 'Lock emoji', cls: 'pt2-lock-open' }
    ] }
    ,{ week: 'week12', history: true, done: 'Every Week 12 question solved', unlocks: [
      { emoji: '😌', all: true, label: 'Calm', fam: 'mood-calm', cls: 'mood-calm' },
      { emoji: '🧘', all: true, label: 'Zen', fam: 'mood-calm', cls: 'mood-zen' }
    ] }
  ];
  // options that follow the overall tally rather than one week
  var EXTRAS = [
    { key: 'look:a', icon: '\u26A1', label: 'Golden theme', title: 'New theme unlocked', desc: '1000 questions solved', cls: 'pt2-la-open', ok: function (t) { return t.n >= 1000; } },
    { key: 'look:b', icon: '\uD83C\uDF08', label: 'Multicolour Accents', title: 'New setting unlocked', desc: 'Every question solved', cls: 'pt2-lb-open', ok: function (t) { return t.all; } }
  ];
  var UNLOCKS = [], FEATURES = [];
  WEEKS.forEach(function (w) { w.banks = (Q.weeks && Q.weeks[w.week]) || []; w.ledger = 'pt2_solved_ever_v1:' + w.week; w.unlocks.forEach(function (u) { u.w = w; UNLOCKS.push(u); }); (w.features || []).forEach(function (f) { f.w = w; FEATURES.push(f); }); });
  function lsGet(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, v); } catch (e) {} }
  function readJSON(k, d) { try { var v = JSON.parse(lsGet(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  var known = {}, SLOT = {};
  function setQ(q) {
    Q = q; known = {};
    Object.keys(Q.banks).forEach(function (bk) { known[bk] = {}; Q.banks[bk].forEach(function (id) { known[bk][id] = 1; }); });
    WEEKS.forEach(function (w) { w.banks = (Q.weeks && Q.weeks[w.week]) || []; });
  }
  setQ(Q);
  /* question ids of a bank: the same rule as the quiz (id, or a fallback from the stem; '~n' on a repeated id) */
  function qidsOf(data) {
    var out = [], seen = {}, bank = (data && data.bank) || {};
    var forms = Array.isArray(data && data.forms) && data.forms.length ? data.forms : Object.keys(bank);
    forms.forEach(function (letter) {
      (bank[letter] || []).forEach(function (q, i) {
        var qi = q && q.id != null ? String(q.id) : 'q_' + String((q && q.q) || '').slice(0, 48) + '_' + i;
        if (seen[qi]) { seen[qi]++; qi = qi + '~' + seen[qi]; } else seen[qi] = 1;
        out.push(qi);
      });
    });
    return out;
  }
  function bkOf(path) { var m = String(path || '').match(/banks\/(.+)\.json$/); return m ? m[1] : null; }
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  /* Week 11 = the materials tagged Week 11 (English, Medical Terminology, Anatomy); Week 12 = those tagged Week 12.
     Anatomy always counts, whatever week it is filed under. Picture studies: every material with study.images. */
  function loadLists() {
    return getJSON('data/catalog.json').then(function (cat) {
      var weeks = { week11: [], week12: [] }, jobs = [], banks = {}, pics = [];
      (cat.subjects || []).forEach(function (sub) { (sub.materials || []).forEach(function (m) {
        var tag = String(m.week || ''), wk = /\b12\b/.test(tag) ? 'week12' : /\b11\b/.test(tag) ? 'week11' : null;
        if (!wk && /anatom/i.test(String(m.id) + ' ' + String(m.title))) wk = 'week11';
        if (m.study && m.study.images) pics.push({ set: m.studyKey || ('medterm/' + m.id), src: m.study.images });
        if (!wk) return;
        var paths = (m.lectures || []).map(function (l) { return l.bank; }).concat(m.bank ? [m.bank] : []);
        paths.forEach(function (p) { var bk = bkOf(p); if (!bk || weeks.week11.indexOf(bk) !== -1 || weeks.week12.indexOf(bk) !== -1) return;
          weeks[wk].push(bk);
          jobs.push(getJSON(p).then(function (d) { banks[bk] = qidsOf(d); }, function () {}));
        });
      }); });
      pics.forEach(function (pc) {
        jobs.push(getJSON(pc.src).then(function (d) {
          var map = PICLAB[pc.set] = {};
          (d.chapters || []).forEach(function (ch) { (ch.images || []).forEach(function (img) {
            var single = img.kind === 'single-structure' || !(img.labels && img.labels.length);
            var ids = single ? ['name'] : img.labels.map(function (l) { return l.id; });
            var vars = {};
            (img.variants || []).forEach(function (v) { if (v && v.id) vars[v.id] = v.pos && typeof v.pos === 'object' ? ids.filter(function (id) { return v.pos[id]; }) : ids; });
            map[ch.lecture + '/' + img.id] = { ids: ids, vars: vars };
          }); });
        }, function () {}));
      });
      PICS = pics;
      return Promise.all(jobs).then(function () {
        ['week11', 'week12'].forEach(function (wk) { weeks[wk] = weeks[wk].filter(function (bk) { return banks[bk]; }); });
        setQ({ banks: banks, weeks: weeks });
        READY = true; baseline();
      });
    });
  }
  /* fold the current solved sets of a week's banks into that week's ledger (only real question ids) */
  function sync(w) {
    var L = readJSON(w.ledger, {}), changed = false;
    w.banks.forEach(function (bk) {
      if (!known[bk]) return;
      var st = readJSON(PREFIX + bk, null); if (!st) return;
      var ids = !st.solved ? [] : Array.isArray(st.solved) ? st.solved : Object.keys(st.solved);
      if (w.history && st.resets && typeof st.resets === 'object') {
        Object.keys(st.resets).forEach(function (c) { var r = st.resets[c]; if (r && Array.isArray(r.ids)) ids = ids.concat(r.ids); });
      }
      ids.forEach(function (id) { if (known[bk][id] && !L[bk + '|' + id]) { L[bk + '|' + id] = 1; changed = true; } });
    });
    if (w.pictures && foldPictures(L)) changed = true;
    if (changed) lsSet(w.ledger, JSON.stringify(L));
    return L;
  }
  /* Picture study counts one per label named correctly (typed or placed from the word bank), once per label of a
     picture: other modes, other pictures of the same diagram (variants) and redoing it after a reset add nothing.
     Read from the saved picture answers, and from the pictures recorded as fully solved before labels were counted. */
  function foldPictures(L) {
    var changed = false, all = readJSON(PIC_STORE, {});
    function add(set, pic, id) {
      var p = PICLAB[set] && PICLAB[set][pic]; if (!p || p.ids.indexOf(id) === -1) return;
      var k = 'lbl|' + set + '|' + pic + '|' + id; if (!L[k]) { L[k] = 1; changed = true; }
    }
    Object.keys(PICLAB).forEach(function (set) {
      var s = all[set]; if (!s || typeof s !== 'object') return;
      Object.keys(s).forEach(function (sk) {
        var r = s[sk] || {}, pic = sk.split('|')[0], slotsets = [];
        if (r.m && typeof r.m === 'object') Object.keys(r.m).forEach(function (md) { if (r.m[md] && r.m[md].slots) slotsets.push(r.m[md].slots); });
        else if (r.slots) slotsets.push(r.slots);
        slotsets.forEach(function (sl) { Object.keys(sl).forEach(function (id) { if (sl[id] != null) add(set, pic, id); }); });
      });
    });
    Object.keys(L).forEach(function (k) {
      if (k.indexOf('pic|') !== 0) return;
      var parts = k.slice(4).split('|'), set = parts[0], pic = parts[1], vid = parts[2], p = PICLAB[set] && PICLAB[set][pic];
      if (!p) return;
      ((vid && p.vars[vid]) || p.ids).forEach(function (id) { add(set, pic, id); });
    });
    return changed;
  }
  /* what a ledger counts: questions and picture labels (the older whole-picture entries are covered by their labels) */
  function countOf(L) { return Object.keys(L).filter(function (k) { return k.indexOf('pic|') !== 0; }).length; }
  function allDone(w, L) {
    if (!w.banks.length) return false;
    return w.banks.every(function (bk) { return (Q.banks[bk] || []).length && Q.banks[bk].every(function (id) { return L[bk + '|' + id]; }); });
  }
  /* distinct questions solved across every week: the week ledgers plus ids kept from sets that were reset */
  function tally() {
    var seen = {};
    WEEKS.forEach(function (w) {
      var L = sync(w);
      Object.keys(L).forEach(function (k) { if (k.indexOf('pic|') !== 0) seen[k] = 1; });
      w.banks.forEach(function (bk) {
        if (!known[bk]) return;
        var st = readJSON(PREFIX + bk, null); if (!st || !st.resets || typeof st.resets !== 'object') return;
        Object.keys(st.resets).forEach(function (c) { var r = st.resets[c]; if (r && Array.isArray(r.ids)) r.ids.forEach(function (id) { if (known[bk][id]) seen[bk + '|' + id] = 1; }); });
      });
    });
    var all = Object.keys(Q.banks).length > 0 && Object.keys(Q.banks).every(function (bk) { return Q.banks[bk].every(function (id) { return seen[bk + '|' + id]; }); });
    return { n: Object.keys(seen).length, all: all };
  }
  /* Solve counts include repeats. History before this existed only records which questions/labels were ever solved,
     so that distinct total is kept once as the starting point and every solve after it adds one. */
  var COUNT = 'pt2_solve_count_v1', READY = false;
  function counter() { var c = readJSON(COUNT, null); return c && c.base && typeof c.base === 'object' ? c : null; }
  function baseline() {
    if (counter()) return;
    var base = { total: tally().n };
    WEEKS.forEach(function (w) { base[w.week] = countOf(sync(w)); });
    lsSet(COUNT, JSON.stringify({ base: base, ev: {}, since: Date.now() }));
  }
  function bump(week) {
    var c = counter(); if (!c || !week) return false;
    c.ev = c.ev || {}; c.ev[week] = (c.ev[week] | 0) + 1; lsSet(COUNT, JSON.stringify(c)); return true;
  }
  function evSum(c) { var n = 0; Object.keys(c.ev || {}).forEach(function (k) { n += c.ev[k] | 0; }); return n; }
  function weekCount(w, L) { var c = counter(); return c ? (c.base[w.week] | 0) + ((c.ev || {})[w.week] | 0) : countOf(L); }
  function totalCount(t) { var c = counter(); return c ? (c.base.total | 0) + evSum(c) : t.n; }
  function weekOfBank(bk) { for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].banks.indexOf(bk) !== -1) return WEEKS[i]; return null; }
  function picWeek() { var w = null; for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].pictures) w = WEEKS[i]; return w; }
  // one question solved in a run (quiz-engine.js), repeats included
  function questionSolved(bk, id) {
    if (!READY || !known[bk] || !known[bk][id]) return;
    var w = weekOfBank(bk); if (w) bump(w.week);
  }
  // asked before a label's answer is saved: has this label been named before?
  function labelFresh(set, pic, id) {
    var w = picWeek(); if (!w || !READY) return true;
    return !sync(w)['lbl|' + set + '|' + pic + '|' + id];
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
    p.querySelector('.achievement-popup-icon').textContent = u.icon || u.emoji;
    if (u.icon) p.querySelector('.achievement-popup-title').textContent = u.title || 'New option unlocked';
    p.querySelector('.achievement-popup-name').textContent = u.icon ? u.label : u.emoji + ' ' + u.label;
    p.querySelector('.achievement-popup-desc').textContent = u.desc || (u.all ? u.w.done : u.at + ' questions solved');
    document.body.appendChild(p);
    if (u.key) { try { document.dispatchEvent(new CustomEvent('pt2-popup', { detail: u.key })); } catch (e) {} }
    setTimeout(function () { if (p.parentNode) p.remove(); next(); }, 4500);
  }

  /* picker: a locked emoji is not shown at all; it appears only once unlocked */
  function decorate() { decorate0(); paginate(false); }
  function decorate0() {
    var got = unlocked();
    FEATURES.concat(EXTRAS).forEach(function (f) { document.documentElement.classList.toggle(f.cls, !!got[f.key]); });
    // the results screen (the end-of-set "how did that set feel?" stamp row) and the answer review screen offer an
    // unlockable emoji only once it is unlocked; stamps already saved on cards are not touched and still show
    document.querySelectorAll('#finalScreen [data-mood], #reviewScreen [data-mood]').forEach(function (btn) {
      var u = byEmoji(btn.dataset.mood); if (!u) return;
      var off = !got[u.emoji]; btn.style.display = off ? 'none' : ''; btn.hidden = off;
      if (off) btn.setAttribute('aria-hidden', 'true'); else btn.removeAttribute('aria-hidden');
    });
    var row = document.querySelector('#moodTray .mood-tray-row');
    if (row) UNLOCKS.forEach(function (u) {
      var b = row.querySelector('.mood-pick[data-mood="' + u.emoji + '"]');
      if (!got[u.emoji]) {
        if (b) { if (!(u.emoji in SLOT)) { var nx = b.nextElementSibling; while (nx && byEmoji(nx.dataset.mood) && !got[nx.dataset.mood]) nx = nx.nextElementSibling; SLOT[u.emoji] = nx ? nx.dataset.mood || null : null; } b.remove(); }
        return;
      }
      if (!b) {
        b = document.createElement('button'); b.type = 'button'; b.className = 'mood-pick pt2-unlockable'; b.dataset.mood = u.emoji; b.textContent = u.emoji; b.title = u.label;
        var at = SLOT[u.emoji] ? row.querySelector('.mood-pick[data-mood="' + SLOT[u.emoji] + '"]') : null;
        if (at) row.insertBefore(b, at); else row.appendChild(b);
        if (typeof currentMoodEmoji !== 'undefined' && currentMoodEmoji === u.emoji) b.classList.add('active');
      }
    });
    // locked emojis are never chosen automatically either
    try {
      var pools = [];
      if (typeof FOCUS_MOOD_POOL !== 'undefined') pools.push(FOCUS_MOOD_POOL);
      if (typeof BREAK_MOOD_POOL !== 'undefined') pools.push(BREAK_MOOD_POOL);
      pools.forEach(function (P) { UNLOCKS.forEach(function (u) {
        var i = P.indexOf(u.emoji);
        if (!got[u.emoji] && i !== -1) { P.splice(i, 1); P.__pt2Held = (P.__pt2Held || []).concat(u.emoji); }
        else if (got[u.emoji] && P.__pt2Held && P.__pt2Held.indexOf(u.emoji) !== -1 && i === -1) P.push(u.emoji);
      }); });
    } catch (e) {}
  }
  function check(quiet) {
    var got = unlocked(), fresh = [], counts = {};
    WEEKS.forEach(function (w) {
      var L = sync(w), n = weekCount(w, L); counts[w.week] = n;
      w.unlocks.forEach(function (u) { if (!got[u.emoji] && isOpen(u, L, n)) { got[u.emoji] = Date.now(); fresh.push(u); } });
      (w.features || []).forEach(function (f) { if (!got[f.key] && n >= f.at) { got[f.key] = Date.now(); fresh.push(f); } });
    });
    var t = tally(); t.n = totalCount(t);
    EXTRAS.forEach(function (f) { if (!got[f.key] && f.ok(t)) { got[f.key] = Date.now(); fresh.push(f); } });
    if (fresh.length) { lsSet(GOT, JSON.stringify(got)); if (!quiet) fresh.forEach(popup); }
    decorate();
    if (fresh.length) { try { document.dispatchEvent(new CustomEvent('pt2-unlocked', { detail: fresh.map(function (u) { return u.emoji || u.key; }) })); } catch (e) {} }
    return { total: t.n, solved: counts, fresh: fresh.map(function (u) { return u.emoji || u.key; }) };
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
  function init() {
    addMoods(); wrapStore(); check(false);
    try { loadLists().then(function () { check(false); }, function () {}); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  // for tests only (nothing in the page shows counts or the next unlock)
  function weekOf(id) { for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].week === id) return WEEKS[i]; return null; }
  function pictureSolved(id) {
    var w = null; for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].pictures) w = WEEKS[i];
    if (!w || !id) return;
    var L = readJSON(w.ledger, {}); if (L['pic|' + id]) return;
    L['pic|' + id] = 1; lsSet(w.ledger, JSON.stringify(L)); check(false);
  }
  // one picture label named correctly (study-images.js); the saved answers are read too, so this only makes it immediate
  /* typed labels count every time; word-bank labels only the first time (Reset plus trial-and-error dragging would farm them) */
  function labelSolved(set, pic, id, how, fresh) {
    var w = picWeek();
    if (READY && w && set && (how === 'type' || fresh)) bump(w.week);
    check(false);
  }
  global.PT2Unlocks = { has: function (k) { return !!unlocked()[k]; }, tally: tally, check: check, pictureSolved: pictureSolved, labelSolved: labelSolved, labelFresh: labelFresh, questionSolved: questionSolved, paginate: paginate, count: function (wk) { var w = weekOf(wk || 'week11'); return w ? weekCount(w, sync(w)) : 0; }, weekDone: function (wk) { var w = weekOf(wk || 'week11'); return !!w && allDone(w, sync(w)); }, list: UNLOCKS, features: FEATURES, isLocked: isLocked };
})(window);
