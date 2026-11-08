/* Medical Physics Mixed Chapters: law / principle card after a solved question. Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
function grab(name) {
  const i = src.search(new RegExp('\\nfunction ' + name + '\\(')); assert.ok(i >= 0, name);
  let depth = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1); }
}
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8').replace(/^window\.studyBundle = /, '').replace(/;\s*$/, ''));
const EXPECT = { PHY90010:'bernoulli', PHY90026:'bernoulli', PHY90011:'poiseuille', PHY90027:'poiseuille', PHY90012:'laplace',
  PHY90013:'reynolds', PHY90014:'continuity', PHY90015:'snell', PHY90016:'tir', PHY90017:'doppler', PHY90028:'doppler',
  PHY90020:'refractiveIndex', PHY90021:'criticalAngle', PHY90022:'surfaceTension', PHY90023:'viscosity', PHY90031:'surfaceTension',
  PHY50099:'tir', PHY50100:'criticalAngle', PHY50102:'snell', PHY50105:'refractiveIndex', PHY30011:'viscosity',
  PHY90005:['bernoulli','continuity','poiseuille','reynolds','doppler','surfaceTension'] };

/* a tiny DOM: enough for renderLawPanel */
function fakeDom() {
  const byId = {};
  const mk = (id) => { const el = { id, children: [], dataset: {}, attrs: {}, isConnected: true, innerHTML: '',
    setAttribute(k, v) { this.attrs[k] = v; }, remove() { delete byId[this.id]; this.isConnected = false; },
    insertAdjacentElement(_, e) { byId[e.id] = e; e.isConnected = true; },
    querySelector(s) { return s === '.law-diagram' ? (this._d ||= { innerHTML: '' }) : null; },
    querySelectorAll(s) { const n = (this.innerHTML.match(/law-diagram/g) || []).length; return (this._ds ||= Array.from({ length: n }, () => ({ innerHTML: '' }))); } }; return el; };
  byId.feedback = mk('feedback');
  return { byId, document: { getElementById: id => byId[id] || null, createElement: () => mk('') } };
}
function engine(bank, { fetchText = '' } = {}) {
  const dom = fakeDom(), math = [];
  const ctx = { window: {}, BANK: bank, questions: [], answers: [], current: 0, quizActive: true, document: dom.document,
    renderMathIn: el => math.push(el), escapeHtml: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    isAnswered: (a, q) => !!a && (a === true || a.correct === true || a === q.correct),
    fetch: () => Promise.resolve({ ok: true, text: () => Promise.resolve(fetchText) }) };
  vm.createContext(ctx);
  vm.runInContext(src.match(/\nconst LAW_DIAGRAMS=.*\n/)[0] + ['isStep','lawPanelsFor','lawPanelFor','lawPanelReady','lawPanelHTML','lawDiagramFrom','lawDiagram','renderLawPanel'].map(grab).join('\n'), ctx);
  return { ctx, dom, math };
}

for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundle['banks/medphys/pt2.json']]]) {
  test(name + ': every law / principle question maps to a complete card', () => {
    const qs = bank.bank.A, panels = bank.lawPanels;
    assert.deepEqual(Object.fromEntries(qs.filter(q => q.lawPanel).map(q => [q.id, q.lawPanel])), EXPECT);
    for (const q of qs.filter(q => q.lawPanel)) assert.ok(/^Mixed Chapters/.test(q.cat) || q.type === 'saq' || q.type === 'stepped', q.id);
    for (const [k, p] of Object.entries(panels)) {
      for (const f of ['title', 'definition', 'equation']) assert.ok(p[f] && p[f].length > 3, k + '.' + f);
      assert.ok(Array.isArray(p.symbols) && p.symbols.length, k + '.symbols');
      const md = fs.readFileSync(path.join(root, p.diagram.src), 'utf8');
      assert.ok(md.includes('<div class="optics-diagram" role="img" aria-label="' + p.diagram.label + '"'), k + ' diagram in ' + p.diagram.src);
    }
  });
}
test('file bank and bundle carry the same cards', () => assert.deepEqual(bundle['banks/medphys/pt2.json'].lawPanels, fileBank.lawPanels));
test('card stays hidden until the question is answered, then shows with math rendered', () => {
  const { ctx, dom, math } = engine(fileBank);
  const q = fileBank.bank.A.find(x => x.id === 'PHY90013');
  ctx.questions = [q]; ctx.answers = [null];
  ctx.renderLawPanel(); assert.equal(dom.byId.lawPanel, undefined);
  ctx.answers[0] = { text: 'Reynolds number', correct: true };
  ctx.renderLawPanel();
  const box = dom.byId.lawPanel; assert.ok(box); assert.equal(box.dataset.law, 'reynolds');
  assert.match(box.innerHTML, /Re = ρ v D \/ η/); assert.match(box.innerHTML, /Definition/);
  assert.ok(math.includes(box));
});
test('stepped question: only after the last step', () => {
  const { ctx, dom } = engine(fileBank);
  const bone = fileBank.bank.A.find(x => x.id === 'PHY90028');
  const steps = [0, 1, 2].map(k => ({ __step: true, __bone: bone, __stepIdx: k, __stepCount: 3 }));
  ctx.questions = steps; ctx.answers = [true, true, null];
  for (const c of [0, 1, 2]) { ctx.current = c; ctx.renderLawPanel(); assert.equal(dom.byId.lawPanel, undefined, 'step ' + c); }
  ctx.answers[2] = true; ctx.renderLawPanel();
  assert.equal(dom.byId.lawPanel.dataset.law, 'doppler');
});
test('navigation removes it; going Back to a solved question restores it; unmapped questions show none', () => {
  const { ctx, dom } = engine(fileBank);
  const a = fileBank.bank.A.find(x => x.id === 'PHY90015'), b = fileBank.bank.A.find(x => x.id === 'PHY90030');
  ctx.questions = [a, b]; ctx.answers = [{ correct: true }, { correct: true }];
  ctx.renderLawPanel(); assert.ok(dom.byId.lawPanel);
  ctx.current = 1; ctx.renderLawPanel(); assert.equal(dom.byId.lawPanel, undefined);
  ctx.current = 0; ctx.renderLawPanel(); assert.equal(dom.byId.lawPanel.dataset.law, 'snell');
});
test('diagram is copied from the notes by its exact label', async () => {
  const p = fileBank.lawPanels.tir;
  const md = fs.readFileSync(path.join(root, p.diagram.src), 'utf8');
  const { ctx } = engine(fileBank, { fetchText: md });
  const h = await ctx.lawDiagram(p.diagram.src, p.diagram.label);
  assert.ok(h.startsWith('<div class="optics-diagram"') && h.endsWith('</div>') && h.includes('<svg'));
  assert.equal(await engine(fileBank, { fetchText: md }).ctx.lawDiagram(p.diagram.src, 'no such label'), '');
});
test('the card is wired into every solve and redraw path', () => {
  assert.match(grab('renderStepRecap'), /renderLawPanel\(\)/g);
  assert.equal((grab('renderStepRecap').match(/renderLawPanel\(\)/g) || []).length, 2);
});

test('panels state formulas directly and never cite a person', () => {
  for (const p of Object.values(fileBank.lawPanels)) assert.doesNotMatch(JSON.stringify(p), /teacher|lecturer|instructor|says/i);
});
for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundle['banks/medphys/pt2.json']]]) {
  test(name + ': water vs mercury linking question is a clean one-to-one match', () => {
    const qs = bank.bank.A, q = qs.find(x => x.id === 'PHY90031');
    assert.equal(q.type, 'matching'); assert.match(q.cat, /^Mixed Chapters/);
    const L = q.leftItems.map(x => x.id), R = q.rightItems.map(x => x.id), pairs = q.correct_pairs;
    assert.deepEqual(Object.keys(pairs).sort(), L.slice().sort());
    assert.equal(new Set(Object.values(pairs)).size, L.length, 'each target used once');
    for (const r of Object.values(pairs)) assert.ok(R.includes(r));
    assert.equal(new Set(q.rightItems.map(x => x.text)).size, R.length, 'distinct targets');
    const text = Object.fromEntries(q.leftItems.map(l => [l.text, q.rightItems.find(r => r.id === pairs[l.id]).text]));
    assert.match(text['Cohesion compared with adhesion to glass'], /Water: adhesion .*mercury: cohesion/);
    assert.match(text['Meniscus shape'], /Water concave; mercury convex/);
    assert.match(text['Level in a capillary tube'], /Water rises; mercury falls/);
    assert.match(text['Surface tension'], /higher for mercury/);
    assert.match(text['Contact angle with glass'], /Water below 90°; mercury above 90°/);
    assert.doesNotMatch(q.explain, /surface tension (so|therefore|means|makes)/i);
    assert.match(text['Density'], /Mercury is much denser/);
    assert.ok(!/\n/.test(q.explain) && q.explain.length < 600);
    // the existing surface tension MCQ is untouched
    const mcq = qs.find(x => x.q === 'Why does mercury have a higher surface tension than water?');
    assert.match(mcq.options[mcq.correct], /cohesive forces are stronger/i);
  });
}

test('PHY90005 matching: no card until the whole match is solved, then one card per principle', () => {
  const { ctx, dom } = engine(fileBank);
  const q = fileBank.bank.A.find(x => x.id === 'PHY90005');
  ctx.questions = [q]; ctx.answers = [{ pairs: { 1: 'A', 2: 'B', 3: 'C' }, checked: false, correct: false }];
  ctx.renderLawPanel(); assert.equal(dom.byId.lawPanel, undefined, 'part-matched');
  ctx.answers[0] = { pairs: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' }, checked: true, correct: true };
  ctx.renderLawPanel();
  const box = dom.byId.lawPanel;
  assert.equal(box.dataset.law, 'bernoulli continuity poiseuille reynolds doppler surfaceTension');
  assert.equal((box.innerHTML.match(/class="law-card"/g) || []).length, 6);
  for (const t of ["Bernoulli's equation", "Poiseuille's law", 'Reynolds number', 'Doppler effect', 'Surface tension', 'Equation of continuity']) assert.ok(box.innerHTML.includes(t.replace(/'/g, "'")), t);
  ctx.current = 0; ctx.answers[0] = null; ctx.renderLawPanel(); assert.equal(dom.byId.lawPanel, undefined);
});
test('every Mixed naming answer that is a law or principle has a card', () => {
  const named = ["bernoulli", "poiseuille", "laplace", "reynolds", "continuity", "snell", "total internal reflection", "doppler", "index of refraction", "critical angle", "surface tension", "viscosity"];
  for (const q of fileBank.bank.A.filter(q => q.type === 'saq' && !q.formula)) {
    const a = String(q.answer || '').toLowerCase();
    if (named.some(n => new RegExp('^' + n + "('s)?( law| equation| effect| number| principle)?$").test(a.trim()))) assert.ok(q.lawPanel, q.id + ' ' + a);
  }
});
test('diagrams come from the bundled notes first, so they show offline', async () => {
  const p = fileBank.lawPanels.snell;
  const { ctx } = engine(fileBank, { fetchText: '' });
  ctx.window.studyBundle = { [p.diagram.src]: fs.readFileSync(path.join(root, p.diagram.src), 'utf8') };
  ctx.fetch = () => Promise.reject(new Error('offline'));
  const h = await ctx.lawDiagram(p.diagram.src, p.diagram.label);
  assert.ok(h.includes('<svg'));
  for (const k of new Set(Object.values(fileBank.lawPanels).map(x => x.diagram.src))) assert.equal(bundle[k], fs.readFileSync(path.join(root, k), 'utf8'), k + ' bundled copy matches');
});
test('solve paths that skip the recap still trigger the card', () => assert.match(grab('onQuestionSolved'), /renderLawPanel\(\)/));
