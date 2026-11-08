/* Formulas Next: least-solved formula of the section first. Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
function env(families = {}, bankFilter = q => q.formula) {
  const els = {}; const mk = id => (els[id] ||= { id, textContent: '', innerHTML: '', className: '', disabled: false, hidden: false, children: [], title: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild(c) { this.children.push(c); }, addEventListener() {}, replaceChildren() { this.children = []; } });
  const store = new Map([['fp_family:t', JSON.stringify(families)]]);
  const ctx = { console, Math, JSON, Date, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    document: { readyState: 'complete', getElementById: mk, createElement: () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, set textContent(v) {} }), querySelectorAll: () => [], addEventListener() {} },
    addEventListener() {} };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/formula-gen-pt2.js'), 'utf8'), ctx);
  const all = fileBank.bank.A.filter(bankFilter).map(q => Object.assign({}, q, { __id: q.id }));
  ctx.StudyQuiz = { formulaBank: () => ({ questions: all, names: fileBank.formulaNames }) };
  ctx.__activeMaterial = { formulas: { gen: 'Pt2FormulaGen', key: 't' } };
  vm.runInContext(fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8'), ctx);
  return { fp: ctx.FormulaPractice, store, fam: () => JSON.parse(store.get('fp_family:t') || '{}') };
}
const famOf = q => q.formulaKey;

test('unequal counts: the least-solved family comes next, bank question first if it has one', () => {
  const { fp } = env({ waveSpeed: { total: 5 }, periodFreq: { total: 5 }, soundSpeed: { total: 0 }, dopplerSource: { total: 5 }, mach: { total: 5 }, tempConvert: { total: 5 } });
  fp.start(['waveSpeed', 'periodFreq', 'soundSpeed', 'dopplerSource', 'mach', 'tempConvert'], 'ch4');
  assert.equal(famOf(fp.question), 'soundSpeed');
  assert.equal(fp.question.bankId, undefined, 'soundSpeed has no bank question: generated');
  const b = env({ waveSpeed: { total: 0 }, periodFreq: { total: 3 }, soundSpeed: { total: 3 }, dopplerSource: { total: 3 }, mach: { total: 3 }, tempConvert: { total: 3 } });
  b.fp.start(['waveSpeed', 'periodFreq', 'soundSpeed', 'dopplerSource', 'mach', 'tempConvert'], 'ch4');
  assert.equal(famOf(b.fp.question), 'waveSpeed'); assert.ok(['PHY40010', 'PHY40011', 'PHY40066'].includes(b.fp.question.bankId), 'bank before generated');
});
test('bank vs generated in the same family: bank questions first, each once, then generated', () => {
  const { fp } = env({}, q => q.formula && q.formula.chapter === 'ch4');
  fp.start(['waveSpeed'], 'ch4');
  // only waveSpeed generated; ch4 bank also has periodFreq/mach/tempConvert bank-only items that tie at 0
  const seen = []; for (let i = 0; i < 60; i++) { seen.push(fp.question.bankId || ('gen:' + famOf(fp.question))); fp.next(); }
  const bank = seen.filter(x => !x.startsWith('gen:'));
  assert.equal(new Set(bank).size, bank.length, 'each bank question once');
  assert.deepEqual(bank.slice().sort(), ['PHY40008', 'PHY40010', 'PHY40011', 'PHY40035', 'PHY40044', 'PHY40045', 'PHY40046', 'PHY40048', 'PHY40066', 'PHY40074']);
  const firstGen = seen.findIndex(x => x === 'gen:waveSpeed'), waveBank = ['PHY40010', 'PHY40011', 'PHY40066'].map(id => seen.indexOf(id));
  assert.ok(waveBank.every(i => i < firstGen), 'waveSpeed bank items before generated waveSpeed');
});
test('an exhausted bank-only family is no longer picked and does not starve the others', () => {
  const { fp } = env({ waveSpeed: { total: 9 } }, q => q.id === 'PHY40008'); // periodFreq bank item, generator key not selected
  fp.start(['waveSpeed'], 'ch4');
  assert.equal(fp.question.bankId, 'PHY40008', 'bank-only family at 0 first');
  for (let i = 0; i < 10; i++) { fp.next(); assert.equal(famOf(fp.question), 'waveSpeed', 'then the remaining family, never an empty one'); }
});
test('section filter: other chapters never appear', () => {
  const { fp } = env();
  fp.start(['refractiveIndex', 'snell', 'criticalAngle'], 'ch5');
  for (let i = 0; i < 40; i++) { const q = fp.question; if (q.bankId) assert.match(fileBank.bank.A.find(x => x.id === q.bankId).formula.chapter, /^ch5$/); else assert.ok(['refractiveIndex', 'snell', 'criticalAngle'].includes(famOf(q))); fp.next(); }
});
test('ties are spread at random', () => {
  const firsts = new Set();
  for (let r = 0; r < 60; r++) { const { fp } = env({}, () => false); fp.start(['waveSpeed', 'periodFreq', 'soundSpeed', 'mach'], 'ch4'); firsts.add(famOf(fp.question)); }
  assert.ok(firsts.size >= 3, [...firsts].join());
});
test('only credited solves count; shown, skipped or Back-reviewed questions do not', () => {
  const { fp, fam } = env({}, () => false);
  fp.start(['waveSpeed', 'periodFreq'], 'ch4');
  for (let i = 0; i < 6; i++) fp.next();
  fp.back(); fp.back();
  assert.deepEqual(fam(), {}, 'nothing counted without a solve');
  const src = fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8');
  assert.match(src, /function credit\(\) \{\n    const entry = history\[historyIndex\]; if \(!entry \|\| entry\.credited\) return;/);
  assert.match(src, /if \(!diagram\) credit\(\); else chrome\(\);/, 'a diagram question counts only once the drawing is done');
  assert.match(src, /const c = famCount\(k\); if \(c < min\) min = c;/);
});
