/* Settings → Lock emoji (with the 🔒 unlock) beside Lock accent; a new theme unlock clears both. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
function boot(store = {}) {
  const ls = new Map(Object.entries(store)), cls = new Set(), handlers = {}, els = { pt2AccentLock: { id: 'pt2AccentLock', checked: false }, pt2EmojiLock: { id: 'pt2EmojiLock', checked: false } };
  const document = { documentElement: { classList: { toggle: (c, on) => { (on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c); }, add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), contains: c => cls.has(c) }, getAttribute: () => null, setAttribute() {} },
    getElementById: id => els[id] || null, addEventListener: (t, f) => (handlers[t] ||= []).push(f), dispatchEvent() {} };
  const ctx = { document, localStorage: { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }, MutationObserver: function () { this.observe = () => {}; }, addEventListener() {}, dispatchEvent() {}, navigator: {}, location: { protocol: 'https:' } };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  try { vm.runInContext(read('js/pt2-offline.js'), ctx); } catch (e) { if (!ctx.PT2Prefs) throw e; }
  (handlers.DOMContentLoaded || []).forEach(f => { try { f(); } catch (e) {} });
  const change = (id, on) => { els[id].checked = on; (handlers.change || []).forEach(f => f({ target: els[id] })); };
  return { ctx, ls, cls, els, change };
}
test('Lock emoji shows only once the 🔒 emoji is unlocked, and persists', () => {
  let b = boot(); assert.equal(b.cls.has('pt2-lock-open'), false);
  b = boot({ pt2_emoji_unlocked_v1: JSON.stringify({ '\uD83D\uDD12': 1 }), pt2_mood_lock: '1' });
  assert.equal(b.cls.has('pt2-lock-open'), true); assert.equal(b.els.pt2EmojiLock.checked, true); assert.equal(b.ctx.PT2Prefs.moodLocked(), true);
  assert.match(read('css/pt2.css'), /html:not\(\.pt2-lock-open\) \.pt2-emoji-lock-opt\{display:none!important\}/);
  assert.match(read('js/pt2-unlocks.js'), /classList\.toggle\('pt2-lock-open', !!got\['\\uD83D\\uDD12'\]\)/, 'appears as soon as it unlocks');
});
test('the two locks are independent and survive a reload', () => {
  const b = boot();
  b.change('pt2EmojiLock', true); assert.equal(b.ls.get('pt2_mood_lock'), '1'); assert.equal(b.ctx.PT2Prefs.accentLocked(), false);
  b.change('pt2AccentLock', true); assert.equal(b.ls.get('pt2_mood_lock'), '1', 'accent lock leaves the emoji lock'); assert.equal(b.ctx.PT2Prefs.accentLocked(), true);
  b.change('pt2EmojiLock', false); assert.equal(b.ctx.PT2Prefs.accentLocked(), true);
  const r = boot(Object.fromEntries(b.ls)); assert.equal(r.els.pt2AccentLock.checked, true); assert.equal(r.els.pt2EmojiLock.checked, false);
});
test('ordinary automatic emoji changes respect the emoji lock; picking by hand still works', () => {
  const q = read('quiz.html');
  for (const f of ['randomizeFocusMood', 'randomizeBreakMood']) assert.match(q, new RegExp('function ' + f + '\\(\\)\\{\\n  if\\(window\\.PT2Prefs && \\(PT2Prefs\\.moodFrozen\\(\\) \\|\\| PT2Prefs\\.moodLocked\\(\\)\\)\\) return;'));
  assert.match(q, /<label class="pt2-opt pt2-emoji-lock-opt"[^>]*>\n<span class="pt2-opt-text"><span class="pt2-opt-name" style="font-size:0\.85em;">Lock emoji<\/span><\/span>\n<span class="toggle-switch"><input type="checkbox" id="pt2EmojiLock"><span class="toggle-slider"><\/span><\/span>/);
  assert.match(read('js/pt2-color.js'), /function onMood\(\) \{ if \(accentLocked\(\)\)/, 'accent lock still holds on mood changes');
});
test('a newly unlocked theme switches both locks off, then applies itself', () => {
  const b = boot({ pt2_mood_lock: '1', pt2_accent_lock: '1' });
  b.ctx.PT2Prefs.clearLocks();
  assert.equal(b.ctx.PT2Prefs.moodLocked(), false); assert.equal(b.ctx.PT2Prefs.accentLocked(), false);
  assert.equal(b.els.pt2EmojiLock.checked, false); assert.equal(b.els.pt2AccentLock.checked, false);
  const u = read('js/pt2-unlocks.js'), i = u.indexOf('function celebrateMedphys(u)'), body = u.slice(i, u.indexOf('\n  }\n', i));
  assert.ok(body.indexOf("if (!u || !(u.bg || u.bgKey") < body.indexOf('PT2Prefs.clearLocks()'), 'only for a theme unlock');
  assert.ok(body.indexOf('PT2Prefs.clearLocks()') < body.indexOf('applyLiveMood'), 'cleared before applying');
  assert.equal((u.match(/clearLocks\(\)/g) || []).length, 1, 'nowhere else (no clearing on render or reload)');
});
