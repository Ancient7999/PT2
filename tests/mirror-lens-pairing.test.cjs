/* PHY90032: concave mirror ↔ convex lens (converging), convex mirror ↔ concave lens (diverging). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const q = bank.bank.A.find(x => x.id === 'PHY90032');
const ans = s => s.options[s.correct];
test('Mixed Chapters, cross-chapter choice question (not typed, not a formula)', () => {
  assert.equal(q.type, 'stepped'); assert.equal(q.cat, 'Mixed Chapters: Cross-Chapter'); assert.equal(q.formula, undefined);
  assert.ok(bank.cards.find(c => c.id === 'mixed').cats.includes(q.cat));
  assert.ok(q.steps.every(s => Array.isArray(s.options) && s.options.length === 4 && !s.type && new Set(s.options).size === 4));
  assert.doesNotMatch(q.q, /converg|diverg|convex lens|concave lens/i, 'the stem does not give the pairing away');
});
test('both pairings are asked, one correct answer each', () => {
  const [m1, l1, m2, l2, why] = q.steps;
  assert.match(m1.prompt, /concave mirror/); assert.equal(ans(m1), 'Converge to a real focus in front of the mirror');
  assert.match(l1.prompt, /concave mirror/); assert.equal(ans(l1), 'Convex lens');
  assert.match(m2.prompt, /convex mirror/); assert.equal(ans(m2), 'Spread out as if coming from a virtual focus behind the mirror');
  assert.match(l2.prompt, /convex mirror/); assert.equal(ans(l2), 'Concave lens');
  assert.match(ans(why), /real or a virtual image, depending on where the object is/);
});
test('explanation covers rays, reflection vs refraction, real vs virtual focus and object position', () => {
  for (const re of [/reflect/, /refract/, /real principal focus/, /virtual focus/, /backward extensions/, /beyond the focus/, /inside the focus/, /not by always forming the same image/])
    assert.match(q.explain, re);
});
test('bundled copy matches the bank', () => {
  const c = { window: {} }; c.self = c.window; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8'), c);
  const sb = c.window.studyBundle || c.studyBundle, B = sb['banks/medphys/pt2.json'];
  assert.deepEqual(JSON.parse(JSON.stringify((typeof B === 'string' ? JSON.parse(B) : B).bank.A.find(x => x.id === 'PHY90032'))), q);
});
