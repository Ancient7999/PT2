/* Formulas "Show formula": worked help (formula → case → rearranged → givens → substitution → result).
   Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8').replace(/^window\.studyBundle = /, '').replace(/;\s*$/, ''));
const fp = fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8');
function gen() { const ctx = { Math, console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, 'js/formula-gen-pt2.js'), 'utf8'), ctx); return ctx.Pt2FormulaGen; }
const num = s => String(s).replace(/−/g, '-').match(/-?\d[\d,]*(?:\.\d+)?(?:\s*×\s*10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)?/)?.[0].replace(/,/g, '');
function rowsFor(q, level) {
  const ctx = { q }; vm.createContext(ctx);
  const m = fp.match(/\n  function workedRows\(level\) \{[\s\S]*?\n  \}\n/)[0];
  vm.runInContext(m + ";this.f=workedRows;", ctx); return JSON.parse(JSON.stringify(ctx.f(level)));
}

test('every bank calculation (25) carries worked help that ends on its correct answer', () => {
  const qs = fileBank.bank.A.filter(q => q.formula);
  assert.equal(qs.length, 25);
  for (const q of qs) {
    const w = q.formula.worked; assert.ok(w, q.id);
    for (const f of ['equation', 'substitution', 'result']) assert.ok(w[f] && w[f].length > 2, q.id + '.' + f);
    assert.ok(Array.isArray(w.givens) && w.givens.length, q.id + '.givens');
    const ans = q.options[q.correct], n = num(ans);
    assert.ok(w.result.replace(/−/g, '-').includes(n), q.id + ': result "' + w.result + '" matches "' + ans + '"');
  }
  assert.deepEqual(bundle['banks/medphys/pt2.json'].bank.A.filter(q => q.formula).map(q => q.formula.worked), qs.map(q => q.formula.worked));
});
test('scanner wavelength: units converted, rearranged, real numbers, answer precision', () => {
  const w = fileBank.bank.A.find(q => q.id === 'PHY40066').formula.worked;
  assert.equal(w.equation, 'v = f λ'); assert.equal(w.rearranged, 'λ = v / f');
  assert.deepEqual(w.givens, ['v = 1.5 km/s = 1500 m/s', 'f = 3.8 MHz = 3.8 × 10⁶ Hz']);
  assert.equal(w.substitution, 'λ = 1500 m/s / (3.8 × 10⁶ Hz)');
  assert.equal(w.result, 'λ ≈ 3.95 × 10⁻⁴ m ≈ 0.39 mm');
  assert.ok(Math.abs(1500 / 3.8e6 - 3.947e-4) < 1e-7);
});
test('rows are separate and ordered: original formula, case, rearranged, givens, then numbers', () => {
  const q = { formulaWorked: fileBank.bank.A.find(x => x.id === 'PHY40066').formula.worked };
  assert.deepEqual(rowsFor(q, 3).map(r => r.label), ['Formula', 'Rearrange', 'Given', 'Substitute', 'Result']);
  assert.deepEqual(rowsFor(q, 1).map(r => r.label), ['Formula', 'Rearrange', 'Given'], 'a first wrong answer: no numbers yet');
  assert.deepEqual(rowsFor(q, 2).map(r => r.label), ['Formula', 'Rearrange', 'Given', 'Substitute'], 'never the result before asked');
});
test('Show formula reveals everything on request; wrong answers stop short of the result; button stays usable', () => {
  assert.match(fp, /\$\('formulaShowBtn'\)\.addEventListener\('click', \(\) => \{ if \(q && !\$\('formulaShowBtn'\)\.disabled\) reveal\(3\); \}\);/);
  assert.match(fp, /wrong\+\+; reveal\(Math\.min\(wrong, 2\)\);/);
  assert.match(fp, /setShowUsed\(hintLevel >= 3\);/);
  assert.match(fp, /formulaWorked: b\.formula\.worked \|\| null/);
  assert.match(fp, /row\.className = 'fh-row'/);
});
test('generated families: worked help from the generator\'s own numbers, result = correct option', () => {
  const g = gen();
  for (const key of g.allKeys()) {
    const seen = new Set();
    for (let k = 0; k < 120; k++) {
      const q = g.generateQuestion([key]); const w = q.formulaWorked; assert.ok(w, key);
      seen.add(q._formulaVariant);
      assert.equal(w.equation, g.FORMULA_METADATA[key].description, key + ': original formula first');
      assert.ok(w.givens.length && w.givens.every(x => / = /.test(x)), key + ': givens as symbol = value');
      assert.ok(w.substitution.includes(q.formulaPlugIn), key);
      assert.equal(w.result.split(' = ').slice(1).join(' = '), q.options[q.correct], key + ' v' + q._formulaVariant + ': result is the answer label');
      if (q.formulaHint !== w.equation && !w.branch) assert.equal(w.rearranged, q.formulaHint, key + ': rearranged form shown');
    }
    assert.ok(seen.size >= 1);
  }
});
test('Doppler (source moving): original ∓ formula, then the sign case, then the variant', () => {
  const g = gen(); const by = {};
  for (let k = 0; k < 300 && Object.keys(by).length < 3; k++) { const q = g.generateQuestion(['dopplerSource']); by[q._formulaVariant] = q; }
  assert.deepEqual(Object.keys(by).sort(), ['0', '1', '2']);
  for (const v of ['0', '1', '2']) assert.equal(by[v].formulaWorked.equation, 'f′ = f × v / (v ∓ v_S)');
  assert.match(by[0].formulaWorked.caseNote, /towards.*minus sign, v − v_S/); assert.equal(by[0].formulaWorked.rearranged, 'f′ = f × v / (v − v_S)');
  assert.match(by[1].formulaWorked.caseNote, /away.*plus sign, v \+ v_S/); assert.equal(by[1].formulaWorked.rearranged, 'f′ = f × v / (v + v_S)');
  assert.equal(by[2].formulaWorked.branch, 'f′ = f × v / (v − v_S)', 'solving for the source speed shows the case first');
  assert.equal(by[2].formulaWorked.rearranged, 'v_S = v (1 − f / f′)');
  assert.deepEqual(rowsFor(by[2], 3).map(r => r.label), ['Formula', 'This case', 'Rearrange', 'Given', 'Substitute', 'Result']);
});
test('period and frequency keep their direct forms', () => {
  const g = gen(); const by = {};
  for (let k = 0; k < 100 && Object.keys(by).length < 2; k++) { const q = g.generateQuestion(['periodFreq']); by[q._formulaVariant] = q; }
  assert.equal(by[0].formulaWorked.rearranged, ''); assert.equal(by[1].formulaWorked.rearranged, 'f = 1 / T');
  const b = fileBank.bank.A.find(q => q.id === 'PHY40008').formula.worked;
  assert.deepEqual(b, { equation: 'T = 1 / f', rearranged: '', givens: ['f = 50 Hz'], substitution: 'T = 1 / 50 Hz', result: 'T = 0.02 s' });
});
test('answers and grading unchanged by worked help', () => {
  const q = fileBank.bank.A.find(x => x.id === 'PHY40066'); assert.equal(q.options[q.correct], '0.39 mm');
  assert.equal(fileBank.bank.A.find(x => x.id === 'PHY40008').correct, 1);
});
test('PHY50002 reflection: law, angles from the normal, surface → normal conversion, then the result', () => {
  for (const bank of [fileBank, bundle['banks/medphys/pt2.json']]) {
    const q = bank.bank.A.find(x => x.id === 'PHY50002'), w = q.formula.worked;
    assert.equal(q.options[q.correct], '55 degrees');
    assert.match(w.equation, /^\\\(\\theta_r = \\theta_i\\\), with both angles measured from the normal$/);
    assert.match(w.rearranged, /normal is at 90° to the mirror surface, so \\\(\\theta_i\\\) = 90° − \(angle to the surface\)/);
    assert.match(w.givens[0], /mirror surface = 35° \(measured from the surface, not the normal\)/);
    assert.equal(w.substitution, '\\(\\theta_i\\) = 90° − 35° = 55°');
    assert.equal(w.result, '\\(\\theta_r = \\theta_i\\) = 55°');
    assert.deepEqual(rowsFor({ formulaWorked: w }, 3).map(r => r.label), ['Formula', 'Rearrange', 'Given', 'Substitute', 'Result']);
  }
});
test('t113 thin lens: reciprocal row in cm⁻¹, result is the distance; 1/d_i and d_o render as subscripts', () => {
  const g = gen();
  for (let k = 0; k < 200; k++) {
    const q = g.generateQuestion(['thinLens']); const w = q.formulaWorked;
    const L = w.result.split(' = ')[0];
    assert.match(L, /^(d_i|d_o|f)$/, 'result labels the distance, never 1/x: ' + w.result);
    assert.match(w.substitution, /^1\/(d_i|d_o|f) = .* cm⁻¹, so (d_i|d_o|f) = 1 \/ \(/);
    assert.doesNotMatch(w.result, /^1\//);
  }
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'quiz-engine.js'), 'utf8');
  const ctx = {}; require('vm').runInNewContext(src.match(/\nconst MATH_SEG=.*\n/)[0] + src.match(/\nconst SUB_TOKEN=.*\n/)[0] + src.match(/\nfunction mathSubscripts[\s\S]*?\n}\n/)[0] + ';this.ms=mathSubscripts', ctx);
  assert.equal(ctx.ms('1/d_i = 1/f − 1/d_o'), '1/\\(d_i\\) = 1/f − 1/\\(d_o\\)');
  assert.equal(ctx.ms('n_core > n_cladding'), '\\(n_{\\mathrm{core}}\\) > \\(n_{\\mathrm{cladding}}\\)');
  assert.equal(ctx.ms('pt2_hide_quotes'), 'pt2_hide_quotes');
  assert.equal(ctx.ms('\\(Q_V\\)'), '\\(Q_V\\)');
});
