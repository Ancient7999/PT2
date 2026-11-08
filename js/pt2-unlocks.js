/* PT2 emoji unlocks (local only, saved on this device; no accounts, no XP, no progress shown).
   Counted per week: a week's tally = distinct questions of that week's banks answered correctly at least once
   (the banks of each week come from the catalog's week tags; Anatomy always counts), plus, for Week 11, each picture
   study label named correctly once (per label of a picture, whatever the mode or picture variant). Week 11 = English,
   Medical Terminology and Anatomy; Medical Physics and Study Skills are Week 12. The Week 11 emoji (🎓) needs every
   Week 11 quiz question solved; picture study is not required for it.
   Each week has its own ledger, so 'Reset solved' on a set does not take unlocks away.
   Solving every Week 12 question unlocks 😌. The Week 12 tally is retroactive: it reads the solved
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
      { emoji: '\uD83D\uDD12', at: 250, label: 'Locked', fam: 'mood-calm', cls: 'mood-locked' },
      { emoji: '🎓', all: true, label: 'Week 11 Graduate', fam: 'mood-happy', cls: 'mood-happy' }
    ] }
    ,{ week: 'week12', history: true, done: 'Every Week 12 question solved', unlocks: [
      { emoji: '😌', all: true, label: 'Calm', fam: 'mood-calm', cls: 'mood-calm' }
    ] }
  ];
  // options that follow the overall tally rather than one week
  var EXTRAS = [
    { key: 'look:a', icon: '\u26A1', label: 'Glow cursor & Animation effects', labelTouch: 'Animation effects', titleTouch: 'New option unlocked', title: 'New options unlocked', desc: '1000 questions solved · see Settings → Theme', cls: 'pt2-la-open', ok: function (t) { return t.n >= 1000; } },
    { key: 'look:lines', icon: '\uD83D\uDD8D\uFE0F', label: 'Drawing Lines', title: 'New unlock', desc: '240 questions solved · line colours now rotate, change them in Settings → Drawing Lines', cls: 'pt2-lines-open', ok: function (t) { return t.n >= 240; } },
    { key: 'look:b', icon: '\uD83C\uDF08', label: 'Multicolour Accents', title: 'New setting unlocked', desc: 'Every question solved', cls: 'pt2-lb-open', ok: function (t) { return t.all; } }
  ];
  var UNLOCKS = [], FEATURES = [];
  /* Medical Physics special track: quiz bank medphys/pt2 + Formulas practice both count.
     Thresholds unlock site-wide backgrounds (Settings → Backgrounds). */
  var MEDPHYS_BANK = 'medphys/pt2';
  var MEDPHYS_COUNT = 'pt2_medphys_solves_v1';
  var MEDPHYS_SKINS = [
    { emoji: '\uD83D\uDD2C', at: 150, label: 'Microscope', fam: 'mood-calm', cls: 'mood-calm', bg: 'aurora',
      quote: { text: 'The important thing in science is not so much to obtain new facts as to discover new ways of thinking about them.', author: 'William Lawrence Bragg' },
      restQuote: { text: 'Curiosity is the lust of the mind.', author: 'Thomas Hobbes' } },
    { emoji: '\u269B\uFE0F', at: 280, label: 'Atom', fam: 'mood-fierce', cls: 'mood-electric', bg: 'violet-mist',
      quote: { text: 'If I have seen further it is by standing on the shoulders of Giants.', author: 'Isaac Newton' },
      restQuote: { text: 'Truth is ever to be found in simplicity, and not in the multiplicity and confusion of things.', author: 'Isaac Newton' } },
    { emoji: '\uD83E\uDDF2', at: 400, label: 'Magnet', fam: 'mood-fierce', cls: 'mood-fierce', bg: 'copper-ember',
      quote: { text: 'Nothing is too wonderful to be true, if it be consistent with the laws of nature.', author: 'Michael Faraday' },
      restQuote: { text: 'Work, finish, publish.', author: 'Michael Faraday' } },
    { emoji: '\u2622\uFE0F', at: 500, label: 'Radioactive', fam: 'mood-fierce', cls: 'mood-hot', bg: 'deep-ink',
      quote: { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie' },
      restQuote: { text: 'Be less curious about people and more curious about ideas.', author: 'Marie Curie' } },
    { emoji: '\uD83D\uDCE1', at: 600, label: 'Signal', fam: 'mood-calm', cls: 'mood-focus', bg: 'teal-rift',
      quote: { text: 'What we know is a drop, what we don\u2019t know is an ocean.', author: 'Isaac Newton' },
      restQuote: { text: 'Silence is a source of great strength.', author: 'Lao Tzu' } },
    { emoji: '\uD83C\uDF21\uFE0F', at: 720, label: 'Thermometer', fam: 'mood-calm', cls: 'mood-cozy', bg: 'amber-tide',
      quote: { text: 'The energy of the universe is constant; the entropy of the universe tends to a maximum.', author: 'Rudolf Clausius' },
      restQuote: { text: 'Take rest; a field that has rested gives a beautiful crop.', author: 'Ovid' } },
    { emoji: '\uD83D\uDD2D', at: 850, label: 'Telescope', fam: 'mood-calm', cls: 'mood-daydream', bg: 'summit-amber',
      quote: { text: 'Astronomy compels the soul to look upwards and leads us from this world to another.', author: 'Plato' },
      restQuote: { text: 'Look deep into nature, and then you will understand everything better.', author: 'Albert Einstein' } },
    { emoji: '\uD83C\uDF0C', at: 1000, label: 'Galaxy', fam: 'mood-calm', cls: 'mood-sparkle', bg: 'rib-haze',
      quote: { text: 'We are a way for the cosmos to know itself.', author: 'Carl Sagan' },
      restQuote: { text: 'For small creatures such as we, the vastness is bearable only through love.', author: 'Carl Sagan' } }
  ];
  var MEDPHYS_FEATURES = [
    { key: 'bg:bubbles', at: 5, icon: '\uD83E\uDEE7', emoji: '\uD83E\uDEE7', label: 'Bubble background', title: 'New background unlocked',
      desc: '5 Medical Physics questions solved \u00b7 Settings \u2192 Backgrounds', cls: 'pt2-bg-bubbles-open', bg: 'bubbles',
      quote: { text: 'In all things of nature there is something of the marvelous.', author: 'Aristotle' },
      restQuote: { text: 'Adopt the pace of nature: her secret is patience.', author: 'Ralph Waldo Emerson' } },
    { key: 'bg:particles', at: 50, icon: '\u2728', emoji: '\u2728', label: 'Orbit background', title: 'New background unlocked',
      desc: '50 Medical Physics questions solved \u00b7 Settings \u2192 Backgrounds', cls: 'pt2-bg-particles-open', bg: 'particles',
      quote: { text: 'Dwell on the beauty of life. Watch the stars, and see yourself running with them.', author: 'Marcus Aurelius' },
      restQuote: { text: 'The night is more alive and more richly colored than the day.', author: 'Vincent van Gogh' } }
  ];
  MEDPHYS_SKINS.forEach(function (u) {
    u.w = { week: 'medphys', done: 'Medical Physics' };
    u.desc = u.at + ' Medical Physics questions solved \u00b7 Settings \u2192 Backgrounds';
    u.bgKey = 'bg:skin:' + u.bg;
    UNLOCKS.push(u);
  });
  MEDPHYS_FEATURES.forEach(function (f) { FEATURES.push(f); });

  WEEKS.forEach(function (w) { w.banks = (Q.weeks && Q.weeks[w.week]) || []; w.ledger = 'pt2_solved_ever_v1:' + w.week; w.unlocks.forEach(function (u) { u.w = w; UNLOCKS.push(u); }); (w.features || []).forEach(function (f) { f.w = w; FEATURES.push(f); }); });
  // emojis that follow the overall solve count (both weeks, repeats included), like the options above
  var TOTAL = { week: 'total', unlocks: [
    // rot: also chosen by the automatic mood rotation while still locked; unlocking only adds it to the picker
    { emoji: '\uD83E\uDD13', at: 1250, rot: true, label: 'Nerd', fam: 'mood-neutral', cls: 'mood-nerd' },
    { emoji: '\uD83E\uDD73', at: 1500, rot: true, label: 'Party', fam: 'mood-happy', cls: 'mood-party' },
    { emoji: '\uD83E\uDD17', at: 2000, label: 'Warm', fam: 'mood-calm', cls: 'mood-calm' },
    { emoji: '\u2728', at: 2500, rot: true, label: 'Sparkle', fam: 'mood-calm', cls: 'mood-sparkle' },
    // mostly faces at spread-out totals; 🥶 🥵 👻 😈 bring their own look (css/pt2.css)
    { emoji: '\uD83D\uDE00', at: 1100, label: 'Beaming', fam: 'mood-happy', cls: 'mood-smile' },
    { emoji: '\uD83D\uDE07', at: 1175, label: 'Angel', fam: 'mood-calm', cls: 'mood-calm' },
    { emoji: '\uD83D\uDE03', at: 1325, label: 'Bright Smile', fam: 'mood-happy', cls: 'mood-grin' },
    { emoji: '\uD83D\uDE43', at: 1400, label: 'Upside Down', fam: 'mood-happy', cls: 'mood-grin' },
    { emoji: '\uD83D\uDE01', at: 1575, label: 'Big Grin', fam: 'mood-happy', cls: 'mood-grin' },
    { emoji: '\uD83D\uDE0F', at: 1650, label: 'Smirk', fam: 'mood-happy', cls: 'mood-cool' },
    { emoji: '\uD83E\uDEE1', at: 1750, label: 'Salute', fam: 'mood-neutral', cls: 'mood-focus' },
    { emoji: '\uD83D\uDE06', at: 1850, label: 'Laughing', fam: 'mood-happy', cls: 'mood-party' },
    { emoji: '\uD83E\uDD70', at: 1925, label: 'Loved', fam: 'mood-happy', cls: 'mood-starstruck' },
    { emoji: '\uD83E\uDD20', at: 2100, label: 'Cowboy', fam: 'mood-happy', cls: 'mood-party' },
    { emoji: '\uD83D\uDE0B', at: 2200, label: 'Yum', fam: 'mood-happy', cls: 'mood-smile' },
    { emoji: '\uD83E\uDD79', at: 2300, label: 'Touched', fam: 'mood-happy', cls: 'mood-happy' },
    { emoji: '\uD83E\uDD76', at: 2400, label: 'Frozen', fam: 'mood-calm', cls: 'mood-frozen' },
    { emoji: '\uD83D\uDE1A', at: 2600, label: 'Kiss', fam: 'mood-calm', cls: 'mood-cozy' },
    { emoji: '\uD83E\uDD2F', at: 2700, label: 'Mind Blown', fam: 'mood-fierce', cls: 'mood-electric' },
    { emoji: '\uD83E\uDD75', at: 2800, label: 'Overheated', fam: 'mood-fierce', cls: 'mood-hot' },
    { emoji: '\uD83D\uDE0D', at: 2900, label: 'Heart Eyes', fam: 'mood-happy', cls: 'mood-starstruck' },
    { emoji: '\uD83D\uDC7B', at: 3000, label: 'Ghost', fam: 'mood-neutral', cls: 'mood-ghost' },
    { emoji: '\uD83D\uDE08', at: 3150, label: 'Devil', fam: 'mood-fierce', cls: 'mood-devil' },
    { emoji: '\uD83E\uDEE0', at: 3300, label: 'Melting', fam: 'mood-sleepy', cls: 'mood-cozy' }
  ] };
  TOTAL.unlocks.forEach(function (u) { u.w = TOTAL; UNLOCKS.push(u); });
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
        READY = true;
        baseline();
        medphysBaseline();
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
  function medphysState() {
    var c = readJSON(MEDPHYS_COUNT, null);
    return c && typeof c.base === 'number' ? c : null;
  }
  function medphysBaseline() {
    if (medphysState()) return;
    var distinct = 0;
    WEEKS.forEach(function (w) {
      var L = sync(w);
      Object.keys(L).forEach(function (k) {
        if (k.indexOf(MEDPHYS_BANK + '|') === 0) distinct++;
      });
    });
    var fp = 0;
    try { fp = parseInt(lsGet('fp_count:' + MEDPHYS_BANK) || '0', 10) || 0; } catch (e) {}
    lsSet(MEDPHYS_COUNT, JSON.stringify({ base: distinct + fp, ev: 0, since: Date.now() }));
  }
  function medphysBump() {
    var c = medphysState(); if (!c) return;
    c.ev = (c.ev | 0) + 1;
    lsSet(MEDPHYS_COUNT, JSON.stringify(c));
  }
  function medphysCount() {
    var c = medphysState();
    return c ? (c.base | 0) + (c.ev | 0) : 0;
  }
  // Formulas practice correct answer (formula-practice.js)
  function formulaSolved(key) {
    if (!READY) return;
    if (key !== MEDPHYS_BANK && key !== 'medphys/pt2') return;
    medphysBump();
    check(false);
  }

  // one question solved in a run (quiz-engine.js), repeats included
  function questionSolved(bk, id) {
    // medphys bump is done per solved step in quiz-engine onQuestionSolved
    // (covers both normal questions and every step of a stepped question,
    // and both medphys/pt2 and medphys/diagrams).
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
  var queue = [], showing = false, UNLOCK_POPUP_MS = 13500;
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
    // touch-only devices have no cursor, so the glow cursor is left out of what the pop-up announces there
    var touchOnly = false; try { touchOnly = global.matchMedia('(hover: none) and (pointer: coarse)').matches || document.documentElement.getAttribute('data-pointer-input') === 'touch'; } catch (e) {}
    if (u.icon) p.querySelector('.achievement-popup-title').textContent = (touchOnly && u.titleTouch) || u.title || 'New option unlocked';
    p.querySelector('.achievement-popup-name').textContent = u.icon ? ((touchOnly && u.labelTouch) || u.label) : u.emoji + ' ' + u.label;
    var qline = u.quote && u.quote.text ? ('\u201c' + u.quote.text + '\u201d' + (u.quote.author ? (' \u2014 ' + u.quote.author) : '')) : '';
    var base = u.desc || (u.all ? u.w.done : (u.at != null ? u.at + ' questions solved' : ''));
    p.querySelector('.achievement-popup-desc').textContent = qline || base;
    if (qline && base && !u.icon) {
      /* keep a short threshold hint under the quote via title */
      p.querySelector('.achievement-popup-desc').title = base;
    }
    document.body.appendChild(p);
    if (u.key) { try { document.dispatchEvent(new CustomEvent('pt2-popup', { detail: u.key })); } catch (e) {} }
    // shown 3× as long as before (4.5 s → 13.5 s); css/pt2.css starts the fade-out 0.6 s before this
    setTimeout(function () { if (p.parentNode) p.remove(); next(); }, UNLOCK_POPUP_MS);
  }

  /* picker: a locked emoji is not shown at all; it appears only once unlocked */
  function decorate() { decorate0(); paginate(false); }
  function decorate0() {
    var got = unlocked();
    FEATURES.concat(EXTRAS).forEach(function (f) { document.documentElement.classList.toggle(f.cls, !!got[f.key]); });
    document.documentElement.classList.toggle('pt2-lock-open', !!got['\uD83D\uDD12']); // Settings → Lock emoji
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
        if (u.rot) return;
        var i = P.indexOf(u.emoji);
        if (!got[u.emoji] && i !== -1) { P.splice(i, 1); P.__pt2Held = (P.__pt2Held || []).concat(u.emoji); }
        else if (got[u.emoji] && P.__pt2Held && P.__pt2Held.indexOf(u.emoji) !== -1 && i === -1) P.push(u.emoji);
      }); });
    } catch (e) {}
  }
  /* Focus + rest quotes for Med Physics unlocks (timer + popup). */
  var MP_QUOTES = {}, MP_REST = {};
  function registerMpQuotes() {
    MEDPHYS_SKINS.concat(MEDPHYS_FEATURES).forEach(function (u) {
      var em = u.emoji || u.icon; if (!em) return;
      if (u.quote) MP_QUOTES[em] = [u.quote];
      if (u.restQuote) MP_REST[em] = [u.restQuote];
    });
  }
  registerMpQuotes();
  function focusQuotes(em) { return MP_QUOTES[em] || null; }
  function restQuotes(em) { return MP_REST[em] || null; }

  /* Drop leftover timed-lock keys from older builds (no lock on unlock). */
  try {
    localStorage.removeItem('pt2_mood_lock_until');
  } catch (e) {}
  function celebrateMedphys(u) {
    if (!u || !(u.bg || u.bgKey || (u.key && String(u.key).indexOf('bg:') === 0))) return;
    var em = u.emoji || u.icon;
    if (global.PT2Prefs && typeof PT2Prefs.clearLocks === 'function') { try { PT2Prefs.clearLocks(); } catch (e) {} }
    if (em && typeof global.applyLiveMood === 'function') {
      try { global.applyLiveMood(em, { skipQuote: false }); } catch (e) {}
    }
    if (u.bg && global.PT2Bg && typeof PT2Bg.select === 'function') {
      try { PT2Bg.select(u.bg); } catch (e) {}
    }
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
    var mn = medphysCount();
    MEDPHYS_FEATURES.forEach(function (f) {
      if (!got[f.key] && mn >= f.at) { got[f.key] = Date.now(); fresh.push(f); }
    });
    MEDPHYS_SKINS.forEach(function (u) {
      if (!got[u.emoji] && mn >= u.at) {
        got[u.emoji] = Date.now();
        if (u.bgKey) got[u.bgKey] = Date.now();
        fresh.push(u);
      }
    });
    TOTAL.unlocks.forEach(function (u) { if (!got[u.emoji] && t.n >= u.at) { got[u.emoji] = Date.now(); fresh.push(u); } });
    if (fresh.length) {
      lsSet(GOT, JSON.stringify(got));
      if (!quiet) fresh.forEach(function (u) { if (!u.silent) popup(u); });
      /* last Med Physics reward in this batch wins (highest tier typically last) */
      var mp = null;
      fresh.forEach(function (u) {
        if (u.bg || u.bgKey || (u.key && String(u.key).indexOf('bg:') === 0)) mp = u;
      });
      if (mp && !quiet) celebrateMedphys(mp);
    }
    decorate();
    if (fresh.length) { try { var keys=[]; fresh.forEach(function (u) { if (u.emoji) keys.push(u.emoji); if (u.key) keys.push(u.key); if (u.bgKey) keys.push(u.bgKey); }); document.dispatchEvent(new CustomEvent('pt2-unlocked', { detail: keys })); } catch (e) {} }
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
  /* a picture completed (study-images.js): one solve every time, repeats included; the ledger keeps the first one */
  function pictureSolved(id) {
    var w = picWeek();
    if (!w || !id) return;
    if (READY) bump(w.week);
    var L = readJSON(w.ledger, {});
    if (!L['pic|' + id]) { L['pic|' + id] = 1; lsSet(w.ledger, JSON.stringify(L)); }
    check(false);
  }
  // one picture label named correctly (study-images.js): no longer a solve by itself; only a completed picture counts
  function labelSolved(set, pic, id, how, fresh) {
    check(false);
  }
  global.PT2Unlocks = { has: function (k) { return !!unlocked()[k]; }, tally: tally, check: check, pictureSolved: pictureSolved, labelSolved: labelSolved, labelFresh: labelFresh, questionSolved: questionSolved, formulaSolved: formulaSolved, medphysBump: medphysBump, medphysCount: medphysCount, focusQuotes: focusQuotes, restQuotes: restQuotes, celebrateMedphys: celebrateMedphys, paginate: paginate, count: function (wk) { var w = weekOf(wk || 'week11'); return w ? weekCount(w, sync(w)) : 0; }, weekDone: function (wk) { var w = weekOf(wk || 'week11'); return !!w && allDone(w, sync(w)); }, list: UNLOCKS, features: FEATURES, isLocked: isLocked };
})(window);
