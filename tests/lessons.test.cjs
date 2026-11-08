/* Full lessons under every solved Mixed Chapters question. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
function grab(name) { const i = src.search(new RegExp('\\nfunction ' + name + '\\(')); assert.ok(i >= 0, name); let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } }
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const bundleCtx = { window: {} }; vm.createContext(bundleCtx); vm.runInContext(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8'), bundleCtx);
const SB = bundleCtx.window.studyBundle, bundleBank = SB['banks/medphys/pt2.json'];
const cardFns = ['isMatching','isStepped','isTypedStepDef','isOrder','isLabel','isMulti','isSaq','isTypedQuestion','catLabelOf','cardCopyOf','buildGroupedCards','buildCards','cardGroupsFor'];
function mixedOf(bank) {
  const ctx = { BANK: bank }; vm.createContext(ctx);
  vm.runInContext(src.match(/\nconst CARD_SPLIT_OVER=.*\n/)[0] + cardFns.map(grab).join('\n'), ctx);
  const all = bank.bank.A.map(q => Object.assign({}, q, { __id: q.id, __form: 'A' }));
  return ctx.buildGroupedCards(all, bank.cards).find(c => c.label === 'Mixed Chapters').pool;
}
/* the real lesson code, with the real notes renderer (js/study-app.js) and the offline bundle */
function lessonEngine(bank) {
  const el = () => ({ addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, style: {}, setAttribute() {} });
  const c = { console, document: { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: el, readyState: 'loading', documentElement: el(), body: el() },
    addEventListener() {}, location: { search: '', hash: '' }, localStorage: { getItem: () => null, setItem() {} }, fetch: () => Promise.resolve({ ok: false }) };
  c.window = c; vm.createContext(c);
  c.studyBundle = SB; c.BANK = bank;
  try { vm.runInContext(fs.readFileSync(path.join(root, 'js/study-app.js'), 'utf8'), c); } catch (e) {}
  vm.runInContext('const escapeHtml=s=>String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[m]));const LESSON_SRC={};' + src.match(/\nconst HAS_DIAGRAM=.*\n/)[0]
    + ['lawDiagramFrom', 'lessonExcerpt', 'lessonSource', 'lessonMarkdown', 'lessonHTMLFrom'].map(grab).join('\n') + ';this.md=lessonMarkdown;this.html=lessonHTMLFrom;', c);
  return c;
}
for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundleBank]]) {
  test(name + ': every Mixed Chapters question (58, chapter SAQs included) has a lesson that exists', () => {
    const pool = mixedOf(bank); assert.equal(pool.length, 58);
    for (const q of pool) { assert.ok(Array.isArray(q.lessons) && q.lessons.length, q.id); for (const k of q.lessons) assert.ok(bank.lessons[k], q.id + ' → ' + k); }
    assert.ok(!bank.bank.A.some(q => q.lessons && !pool.some(p => p.id === q.id)), 'lessons only on Mixed questions');
  });
}
test('bank and bundle carry identical lessons and lesson maps; the notes in the bundle match the files', () => {
  assert.equal(JSON.stringify(bundleBank.lessons), JSON.stringify(fileBank.lessons));
  for (const q of fileBank.bank.A) assert.equal(JSON.stringify(bundleBank.bank.A.find(x => x.id === q.id).lessons), JSON.stringify(q.lessons), q.id);
  for (const n of [3, 4, 5, 6]) { const k = 'content/medphys/pt2/chapter-' + n + '.md'; assert.equal(SB[k], fs.readFileSync(path.join(root, k), 'utf8')); }
});
test('each lesson is a full lesson: real notes sections, key ideas where the notes are thin, three exam questions', () => {
  const c = lessonEngine(fileBank);
  for (const [k, l] of Object.entries(fileBank.lessons)) {
    for (const n of l.notes) assert.equal(fs.readFileSync(path.join(root, n.src), 'utf8').split('\n').filter(x => x.trim() === n.heading).length, 1, k + ': ' + n.heading);
    const md = c.md(l, []); assert.equal(typeof md, 'string');
    assert.ok(md.length > (l.notes.length ? 1500 : 1200), k + ' is ' + md.length + ' chars');
    assert.deepEqual(l.exam.map(e => e.kind), ['define', 'why', 'relation'], k);
    for (const e of l.exam) { assert.ok(e.q.length > 12 && e.a.length > 80, k + ' ' + e.kind); }
    const h = c.html(md);
    for (const t of ['<h2>Exam practice</h2>', '<h3>Definition question</h3>', '<h3>Why question</h3>', '<h3>Relationship question</h3>', '<strong>Model answer:</strong>']) assert.ok(h.includes(t), k + ' ' + t);
    assert.doesNotMatch(JSON.stringify(l), /teacher|lecturer|instructor|doctor said/i);
    const ex = h.slice(h.indexOf('<h2>Exam practice</h2>'));
    assert.doesNotMatch(ex, /<input|<button|<details|<textarea|<select|onclick/i, k + ': exam samples are pre-answered text');
  }
});
test('pole lesson: P vs C, principal axis, measuring point, normal at the pole, and its exam answers', () => {
  const l = fileBank.lessons.sphericalMirrors, md = lessonEngine(fileBank).md(l, []);
  for (const re of [/pole \(P\)\*\*, also called the vertex/, /centre of curvature \(C\)/, /principal axis\*\* is the straight line through \*\*P and C/, /measured \*\*from the pole\*\*/, /at P the normal is the principal axis/, /f = r \/ 2/, /Concave Mirror Image Positions/, /Car side mirrors are convex mirrors/])
    assert.match(md, re);
  assert.equal(l.exam[0].q, 'Define the pole of a spherical mirror.');
  assert.match(l.exam[0].a, /centre point of the mirror's reflecting surface/);
  assert.match(l.exam[1].q, /different from the centre of curvature/); assert.match(l.exam[2].a, /f = r\/2/);
});
test('viscosity lesson derives the unit step by step and compares CGS', () => {
  const md = lessonEngine(fileBank).md(fileBank.lessons.viscosity, []);
  for (const s of ['F = \\eta A v / y', 'N/m²', '**1/s**', '**Pa × s = Pa·s**', '**N·s/m²**', '**kg/(m·s)**', 'not three different units', 'kg·s/m would be a different, wrong dimension', '**0.1 Pa·s**', '**1 Pa·s = 10 P**', 'Kinematic viscosity', 'Polycythemia'])
    assert.ok(md.includes(s), s);
  assert.match(fileBank.lessons.viscosity.exam[1].q, /Pa·s, N·s\/m² and kg\/\(m·s\)/);
});
test('water / mercury: the lesson teaches cause before effect, and direction vs size', () => {
  const md = lessonEngine(fileBank).md(fileBank.lessons.surfaceTension, []);
  for (const s of ['adhesion (liquid–glass attraction) with cohesion', 'θ < 90°', 'θ > 90°', 'cos θ < 0 for mercury', 'set **how far**, not which way', '1 dyne/cm = 10⁻⁵/10⁻² N/m = **10⁻³ N/m**', 'Capillarity', 'Pulmonary surfactant'])
    assert.ok(md.includes(s), s);
});
test('units lesson explains formula-derived units rather than repeating the pairs; units questions carry it, not law cards', () => {
  const md = lessonEngine(fileBank).md(fileBank.lessons.units, []);
  for (const s of ['**Base and derived units.**', '| Dynamic viscosity | η = (F/A)·(y/v) |', '10⁻⁵ N ÷ 10⁻⁴ m² = 0.1 N/m² = 0.1 Pa', 'stokes', '\\(Q_V = A v\\)']) assert.ok(md.includes(s), s);
  for (const id of ['PHY90033', 'PHY90034']) { const q = fileBank.bank.A.find(x => x.id === id); assert.deepEqual(q.lessons, ['units']); assert.equal(q.lawPanel, undefined); }
  assert.match(fileBank.bank.A.find(x => x.id === 'PHY90033').explain, /\\\(Q_V = A v\\\)/);
});
test('a diagram already on the law card is not repeated in the lesson', () => {
  const p = fileBank.lawPanels.viscosity, c = lessonEngine(fileBank);
  const withIt = c.md(fileBank.lessons.viscosity, []), without = c.md(fileBank.lessons.viscosity, [p.diagram.label]);
  assert.ok(withIt.includes('aria-label="' + p.diagram.label + '"')); assert.ok(!without.includes('aria-label="' + p.diagram.label + '"'));
});

/* gating, Back and auto-next, with the real renderLawPanel */
function panelEngine() {
  const byId = {};
  const mk = id => { const el = { id, children: [], dataset: {}, attrs: {}, isConnected: true, _html: '', bodies: {},
    set innerHTML(v) { this._html = v; this.bodies = {}; }, get innerHTML() { return this._html; },
    setAttribute(k, v) { this.attrs[k] = v; }, remove() { delete byId[this.id]; this.isConnected = false; },
    insertAdjacentElement(_, e) { byId[e.id] = e; e.isConnected = true; },
    querySelector(s) { const m = s.match(/data-lesson="([^"]+)"/); if (m) return (this.bodies[m[1]] ||= { innerHTML: '' }); return null; },
    querySelectorAll() { return []; } }; return el; };
  byId.feedback = mk('feedback');
  const c = lessonEngine(fileBank);
  Object.assign(c, { questions: [], answers: [], current: 0, quizActive: true, kbCleared: 0, renderMathIn() {},
    isStep: q => !!(q && q.__step), isTypedStep: q => !!(q && q.__step && q.type === 'saq'), isMatching: q => !!(q && q.leftItems),
    isAnswered: (a, q) => a != null && (typeof a === 'number' || a === true || a.correct === true) });
  c.document = { getElementById: id => byId[id] || null, createElement: () => mk('') };
  vm.runInContext(src.match(/\nconst LAW_DIAGRAMS=.*\n/)[0] + ['lawPanelsFor', 'lessonsFor', 'lawPanelReady', 'lawPanelHTML', 'lawDiagram', 'renderLawPanel', 'showsDiagram'].map(grab).join('\n')
    + ';function clearKbAdvance(){ kbCleared++; }', c);
  return { c, byId };
}
const Q = id => fileBank.bank.A.find(x => x.id === id);
test('typed answer: nothing before the solve, the full lesson after it, math and all', () => {
  const { c, byId } = panelEngine();
  c.questions = [Q('PHY50107')]; c.answers = [null];
  c.renderLawPanel(); assert.equal(byId.lawPanel, undefined);
  c.answers[0] = { text: 'Pole', correct: false }; c.renderLawPanel(); assert.equal(byId.lawPanel, undefined, 'a wrong attempt shows nothing');
  c.answers[0] = { text: 'Pole', correct: true }; c.renderLawPanel();
  const box = byId.lawPanel; assert.ok(box); assert.match(box.innerHTML, /Lesson: Spherical mirrors/);
  assert.match(box.bodies.sphericalMirrors.innerHTML, /<h2>Key ideas<\/h2>/); assert.match(box.bodies.sphericalMirrors.innerHTML, /Define the pole/);
});
test('stepped: only after the last step; a wrong choice never opens it; matching: only when every link is right', () => {
  const { c, byId } = panelEngine();
  const bone = Q('PHY90032'), steps = bone.steps.map((s, k) => Object.assign({ __step: true, __bone: bone, __stepIdx: k, __stepCount: bone.steps.length }, s));
  c.questions = steps; c.answers = steps.map(s => s.correct);
  for (let k = 0; k < steps.length - 1; k++) { c.current = k; c.renderLawPanel(); assert.equal(byId.lawPanel, undefined, 'step ' + k); }
  c.current = steps.length - 1; c.answers[c.current] = (steps[c.current].correct + 1) % 4; c.renderLawPanel(); assert.equal(byId.lawPanel, undefined, 'wrong choice');
  c.answers[c.current] = steps[c.current].correct; c.renderLawPanel();
  assert.match(byId.lawPanel.innerHTML, /Lesson: Spherical mirrors[\s\S]*Lesson: Lenses/);
  const m = Q('PHY90031'); c.questions = [m]; c.current = 0; c.answers = [{ correct: false }];
  c.renderLawPanel(); assert.equal(byId.lawPanel, undefined);
  c.answers = [{ correct: true }]; c.renderLawPanel(); assert.ok(byId.lawPanel.bodies.surfaceTension.innerHTML.length > 3000);
});
test('Back restores the lesson, a new question clears it, and a lesson diagram stops auto-next', () => {
  const { c, byId } = panelEngine();
  c.questions = [Q('PHY90013'), Q('PHY40078')]; c.answers = [{ correct: true }, 0];
  c.renderLawPanel(); assert.ok(byId.lawPanel);
  c.current = 1; c.renderLawPanel(); assert.equal(byId.lawPanel, undefined, 'a chapter question has no lesson');
  c.current = 0; c.renderLawPanel(); assert.match(byId.lawPanel.innerHTML, /Lesson: Reynolds number/);
  assert.equal(c.showsDiagram(c.questions[0]), true, 'the Reynolds lesson has the notes diagram');
  c.kbCleared = 0; c.questions = [Q('PHY50107')]; c.answers = [{ correct: true }]; c.renderLawPanel();
  assert.ok(c.kbCleared > 0, 'inserting a lesson diagram cancels a countdown');
  const units = Q('PHY90033'); c.questions = [units]; c.answers = [{ correct: true }];
  assert.equal(c.showsDiagram(units), false, 'a lesson without a diagram keeps ordinary auto-next');
});
