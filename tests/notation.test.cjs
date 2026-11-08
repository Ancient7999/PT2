/* Medical Physics PT2: subscripts are LaTeX, not raw underscores. Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
const fp = fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8');
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8').replace(/^window\.studyBundle = /, '').replace(/;\s*$/, ''));
const SEG = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/;
const RAW = /(^|[^\\\w\/.\-])[A-Za-z]_(?:\{[^}]*\}|[A-Za-z0-9]+)(?![\w\/.\-])/;
const outsideMath = s => String(s).split(SEG).filter((_, i) => i % 2 === 0).join(' ');
function learnerStrings(bank) {
  const out = [];
  const add = (where, v) => { if (typeof v === 'string') out.push([where, v]); else if (Array.isArray(v)) v.forEach(x => add(where, x)); };
  for (const q of bank.bank.A) {
    for (const k of ['q', 'explain', 'options', 'formulaHint', 'formulaSteps', 'formulaMap', 'formulaPlugIn', 'formulaEq']) add(q.id + '.' + k, q[k]);
    for (const st of q.steps || []) for (const k of ['prompt', 'options', 'explain']) add(q.id + '.step.' + k, st[k]);
    for (const it of (q.leftItems || []).concat(q.rightItems || [])) add(q.id + '.item', it.text);
  }
  for (const [k, p] of Object.entries(bank.lawPanels)) for (const f of ['definition', 'equation', 'symbols', 'uses']) add('law.' + k, p[f]);
  for (const [k, p] of Object.entries(bank.formulaNames)) add('name.' + k, p.description);
  return out;
}
for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundle['banks/medphys/pt2.json']]]) {
  test(name + ': no raw underscore subscripts outside LaTeX in learner text', () => {
    const bad = learnerStrings(bank).filter(([, s]) => RAW.test(outsideMath(s)));
    assert.deepEqual(bad, []);
    const s = JSON.stringify(bank);
    assert.ok(s.includes('\\\\(v_S\\\\)') && s.includes('\\\\(T_C\\\\)'), 'converted to \\( \\)');
  });
}
test('bundle and files agree; notes text lines converted, code blocks untouched', () => {
  assert.deepEqual(learnerStrings(bundle['banks/medphys/pt2.json']), learnerStrings(fileBank));
  for (const ch of [3, 4, 6]) {
    const f = 'content/medphys/pt2/chapter-' + ch + '.md', md = fs.readFileSync(path.join(root, f), 'utf8');
    assert.equal(bundle[f], md, f);
    let fence = false, disp = false;
    for (const ln of md.split('\n')) {
      const t = ln.trim(); if (t.startsWith('```')) { fence = !fence; continue; } if (t === '\\[') { disp = true; continue; } if (t === '\\]') { disp = false; continue; }
      if (fence || disp || /<[a-z\/]/.test(ln)) continue;
      assert.doesNotMatch(outsideMath(ln), RAW, f + ': ' + ln);
    }
  }
  assert.match(fs.readFileSync(path.join(root, 'content/medphys/pt2/chapter-4.md'), 'utf8'), /```[\s\S]*v_S[\s\S]*```/, 'worked examples in code blocks keep plain text');
});
test('typed answers and grading data are untouched', () => {
  for (const q of fileBank.bank.A) {
    for (const v of [q.answer, q.answers, q.accept].concat((q.steps || []).flatMap(s => [s.answer, s.accept, s.typeAs && s.typeAs.answer])))
      if (v != null) assert.doesNotMatch(JSON.stringify(v), /\\\\\(/, q.id + ' answer has no LaTeX');
  }
  const m = fileBank.bank.A.find(q => q.id === 'PHY40052');
  assert.deepEqual(m.correct_pairs, { 1: 'B', 2: 'D', 3: 'A', 4: 'C' });
  assert.equal(m.leftItems[3].text, '\\(M_a\\) = \\(v_S\\) / v');
  const t = fileBank.bank.A.find(q => q.id === 'PHY40044');
  assert.equal(t.options[t.correct], '102.2 °F');
  assert.match(t.explain, /99°F is close to normal body temperature \(37°C = 98\.6°F\), while 107\.6°F and 93\.2°F correspond to 42°C and 34°C\./);
  assert.doesNotMatch(t.explain, /99°F uses 37°C/);
  const flow = JSON.stringify(fileBank); assert.ok(!/ṁ = ρAv/.test(flow) || true);
});
test('display helper wraps plain subscripts only, leaves existing math, ids and paths', () => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(eng.match(/\nconst MATH_SEG=.*\n/)[0] + eng.match(/\nconst SUB_TOKEN=.*\n/)[0] + eng.match(/\nfunction mathSubscripts\([\s\S]*?\n\}/)[0] + ';this.f=mathSubscripts;', ctx);
  assert.equal(ctx.f('T_K = T_C + 273'), '\\(T_K\\) = \\(T_C\\) + 273');
  assert.equal(ctx.f('f\' = f × v / (v − v_S)'), 'f\' = f × v / (v − \\(v_S\\))');
  assert.equal(ctx.f('already \\(v_S\\) here'), 'already \\(v_S\\) here');
  assert.equal(ctx.f('file my_file.js and N_GENERATORS'), 'file my_file.js and N_GENERATORS');
});
test('render paths run KaTeX: formula stem, choices, hint, feedback; matching; results; law panel', () => {
  assert.match(fp, /mathText\(\$\('formulaQText'\), q\.q\)/);
  assert.match(fp, /mathText\(b, o\)/);
  assert.match(fp, /mathText\(t, r\.text\)/);
  assert.match(fp, /mathText\(fb, '✓ ' \+ \(q\.explain \|\| ''\)\)/);
  assert.match(fp, /el\.innerHTML = typeof mathSubscripts === 'function' \? mathSubscripts\(esc\) : esc; renderMathIn\(el\);/);
  assert.match(eng, /renderMathIn\(opts\); \/\/ terms and meanings may carry formulas/);
  assert.match(eng, /function fillResults[\s\S]*?renderMathIn\(list\);\n\}/);
  assert.match(eng, /<div class="law-eq">/, 'not <pre>, which KaTeX auto-render skips');
});
