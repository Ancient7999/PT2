/* Every unlock pop-up (theme, emoji, option) shares one path and stays 3× as long: 13.5 s (was 4.5 s). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js/pt2-unlocks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/pt2.css'), 'utf8');
function run() {
  const timers = [], body = { kids: [], appendChild(p) { this.kids.push(p); p.parentNode = body; } };
  const mk = () => { const q = {}; return { id: '', setAttribute() {}, set innerHTML(v) {}, querySelector: s => (q[s] ||= { textContent: '' }), remove() { body.kids.splice(body.kids.indexOf(this), 1); this.parentNode = null; }, q }; };
  const ctx = { document: { getElementById: () => null, createElement: mk, body, dispatchEvent() {}, documentElement: { getAttribute: () => null } }, CustomEvent: function () {}, matchMedia: () => ({ matches: false }), setTimeout: (f, ms) => timers.push({ f, ms }) };
  ctx.global = ctx; vm.createContext(ctx);
  const s = js.indexOf('  var queue = [], showing = false'), e = js.indexOf('\n  }\n', js.indexOf('  function next() {', s)) + 4;
  vm.runInContext(js.slice(s, e), ctx);
  return { ctx, timers, body };
}
test('theme, emoji and option unlocks each show for 13.5 s, one after another', () => {
  const { ctx, timers, body } = run();
  ctx.popup({ emoji: '🌌', label: 'Theme', desc: 'Theme unlocked', bg: 'x', key: 'bg:x' });
  ctx.popup({ emoji: '🔒', label: 'Locked', at: 250 });
  ctx.popup({ icon: '⚡', label: 'Effects', title: 'New options unlocked', desc: '1000 questions solved' });
  for (let n = 0; n < 3; n++) {
    assert.equal(body.kids.length, 1, 'one at a time (queue kept)'); assert.equal(timers.length, n + 1); assert.equal(timers[n].ms, 13500);
    timers[n].f();
  }
  assert.equal(body.kids.length, 0); assert.equal(timers.length, 3, 'multiplier applied once, no extra timers');
});
test('the fade-out ends just before removal, as before (3.9 s + 0.5 s < 4.5 s → 12.9 s + 0.5 s < 13.5 s)', () => {
  assert.match(css, /#pt2-unlock-popup\{[^}]*animation:pt2UnlockIn \.4s ease-out,pt2UnlockOut \.5s ease-in 12\.9s forwards\}/);
  assert.equal((js.match(/UNLOCK_POPUP_MS/g) || []).length, 2);
  assert.ok(!/4500\)/.test(js));
});
