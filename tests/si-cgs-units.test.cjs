/* SI unit questions also teach the CGS unit; two Mixed linking questions: quantity + system → unit. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const Q = id => bank.bank.A.find(x => x.id === id);
const src = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('\nfunction saqNorm('), src.indexOf('\n', src.indexOf('\nfunction saqMatches(') + 1)), ctx);
test('typed SI steps now have a CGS step with strict spelling and real symbols', () => {
  const v = Q('PHY30011').steps[2];
  assert.equal(v.prompt, 'What is the CGS unit of viscosity?');
  for (const t of ['poise', 'Poise', 'P', 'poise (P)']) assert.ok(ctx.saqMatches(v, t), t);
  for (const t of ['p', 'pois', 'poize', 'stokes', 'Pa·s']) assert.ok(!ctx.saqMatches(v, t), t);
  assert.ok(ctx.saqMatches(Q('PHY30011').steps[1], 'Pa·s'), 'SI step unchanged');
  const st = Q('PHY30080'); assert.equal(st.type, 'stepped');
  assert.equal(st.steps[0].answer, 'N/m'); assert.deepEqual(st.steps[0].accept.slice(0, 4), ['N m⁻¹', 'Nxm⁻¹', 'N.m⁻¹', 'N*m⁻¹']);
  for (const t of ['dyne/cm', 'dyn/cm', 'dyne cm⁻¹']) assert.ok(ctx.saqMatches(st.steps[1], t), t);
  for (const t of ['dyne', 'dyne/cm²', 'N/m', 'dine/cm']) assert.ok(!ctx.saqMatches(st.steps[1], t), t);
});
test('SI choice questions gained a CGS step; others explain the CGS unit', () => {
  const ans = s => s.options[s.correct];
  assert.deepEqual(Q('PHY30050').steps.map(ans), ['N/m', 'dyne/cm']);
  assert.deepEqual(Q('PHY40078').steps.map(ans), ['Metre (m)', 'Centimetre (cm)']);
  for (const id of ['PHY30050', 'PHY40078']) { assert.equal(Q(id).cat.startsWith('Chapter'), true); assert.doesNotMatch(Q(id).q, /N\/m|dyne|metre|centimetre/i); }
  assert.match(Q('PHY30013').explain, /1 P = 1 g·cm⁻¹·s⁻¹ = 0\.1 Pa·s/);
  assert.match(Q('PHY30051').explain, /1 dyne\/cm = 1 erg\/cm²/);
  assert.match(Q('PHY00237').explain, /g\/s \(1 kg\/s = 1000 g\/s\)/);
  assert.match(Q('PHY30063').explain, /1 Pa·s = 10 P/);
});
test('linking questions: quantity and system on the left, one unit each on the right', () => {
  for (const [id, sys] of [['PHY90033', 'SI'], ['PHY90034', 'CGS']]) {
    const q = Q(id);
    assert.equal(q.type, 'matching'); assert.equal(q.cat, 'Mixed Chapters: Cross-Chapter');
    assert.ok(q.leftItems.every(l => l.text.startsWith(sys + ' unit of ')));
    const rights = q.rightItems.map(r => r.text), used = Object.values(q.correct_pairs);
    assert.equal(new Set(rights).size, rights.length); assert.equal(new Set(used).size, used.length, 'one-to-one');
    assert.equal(rights.length, q.leftItems.length + 1, 'one distractor');
    assert.doesNotMatch(q.q, /Pa|poise|dyne|kg|cm/);
  }
  const pair = (id, l) => { const q = Q(id), L = q.leftItems.find(x => x.text.endsWith(l)); return q.rightItems.find(r => r.id === q.correct_pairs[L.id]).text; };
  assert.equal(pair('PHY90033', 'dynamic viscosity'), 'Pa·s'); assert.equal(pair('PHY90034', 'dynamic viscosity'), 'poise (P)');
  assert.equal(pair('PHY90033', 'mass flow rate'), 'kg/s'); assert.equal(pair('PHY90033', 'volume flow rate'), 'm³/s');
  assert.equal(pair('PHY90034', 'pressure'), 'dyne/cm²'); assert.equal(pair('PHY90034', 'surface tension'), 'dyne/cm');
  assert.match(Q('PHY90034').explain, /stokes.*kinematic viscosity/);
});
test('conversion factors quoted are right', () => {
  const g = 1e-3, cm = 1e-2, dyne = g * cm, close = (a, b) => Math.abs(a / b - 1) < 1e-12;
  assert.ok(close(dyne, 1e-5)); assert.ok(close(g / (cm), 0.1)); assert.ok(close(dyne / cm, 1e-3));
  assert.ok(close(dyne / cm ** 2, 0.1)); assert.ok(close(g / cm ** 3, 1000)); assert.ok(close(cm ** 3, 1e-6));
  const e = Q('PHY90034').explain;
  for (const s of ['10⁻⁵ N', '0.1 Pa·s', '10⁻³ N/m', '(= 0.1 Pa)', '1000 kg/m³', '10⁻⁶ m³/s', '10⁻³ kg/s']) assert.ok(e.includes(s), s);
});
test('bundle matches the bank for every changed or new question', () => {
  const c = { window: {} }; c.self = c.window; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8'), c);
  const B = (c.window.studyBundle || c.studyBundle)['banks/medphys/pt2.json'];
  for (const id of ['PHY30011', 'PHY30080', 'PHY30050', 'PHY40078', 'PHY30013', 'PHY30051', 'PHY00237', 'PHY30063', 'PHY90033', 'PHY90034'])
    assert.equal(JSON.stringify(B.bank.A.find(x => x.id === id)), JSON.stringify(Q(id)), id);
});

test('PHY30011 SI step: every written form of Pa·s the live site accepted still passes', () => {
  const s = Q('PHY30011').steps[1];
  const ok = ["Pa·s", "Pa s", "Pa.s", "Pa*s", "Pa x s", "Pa×s", "Pas", "N·s/m²", "N·s·m⁻²", "N.s/m2", "N.s/m²", "Ns/m2", "Ns/m²", "N s/m2", "N s/m²", "N*s/m2", "N*s/m²", "N x s/m2", "pascal-second", "Pascal-second", "pascal second", "Pascal second", "pascal*second", "Pascal*second", "pascal x second", "Pascal x second", "pascal×second", "Pascal×second", "kg m-1 s-1", "kg·m⁻¹·s⁻¹", "kg/(m·s)", "kg/m·s", "kg/m s", "kg x m^-1 s^-1", "kg*m^-1 s^-1", "kg x m-1 s-1", "kg*m-1 s-1", "kg x m⁻¹ s⁻¹", "kg*m⁻¹ s⁻¹", "kg x m^-1*s^-1", "kg*m^-1*s^-1"];
  for (const x of ok) assert.ok(ctx.saqMatches(s, x), x);
  // wrong dimensions, wrong symbols or misspelt words stay wrong
  for (const x of ['Pa', 'Pa/s', 'Pa·s⁻¹', 'N/m', 'N·s/m', 'N/m²', 'kg·m⁻¹·s⁻²', 'kg*s/m', 'kg·s/m', 'kg m s-1', 'pa·s', 'PA S', 'pascal', 'pascal-seconds', 'pascal secnd', 'paskal second', 'poise', 'P'])
    assert.ok(!ctx.saqMatches(s, x), x);
});
test('bank and bundle keep the same answer lists (the bundle extras were merged, not dropped)', () => {
  const c = { window: {} }; c.self = c.window; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8'), c);
  const B = (c.window.studyBundle || c.studyBundle)['banks/medphys/pt2.json'];
  for (const [id, k] of [['PHY30011', 1], ['PHY30080', 0]])
    assert.equal(JSON.stringify(B.bank.A.find(x => x.id === id).steps[k].accept), JSON.stringify(Q(id).steps[k].accept));
  for (const x of ['newton per meter', 'Nm-1', 'N/meter']) assert.ok(ctx.saqMatches(Q('PHY30080').steps[0], x), x);
});
