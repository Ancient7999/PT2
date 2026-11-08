/* Medical Physics: every typed-answer question lives only in Mixed Chapters. Run with node --test tests/*.test.cjs. */
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
const fns = ['isMatching','isStepped','isTypedStepDef','isOrder','isLabel','isMulti','isSaq','isTypedQuestion','catLabelOf','cardCopyOf','buildGroupedCards','buildCards','cardGroupsFor'];
function engine(bank) {
  const ctx = { BANK: bank }; vm.createContext(ctx);
  vm.runInContext(src.match(/\nconst CARD_SPLIT_OVER=.*\n/)[0] + fns.map(grab).join('\n'), ctx);
  return ctx;
}
function cardsOf(bankJson) {
  const ctx = engine(bankJson);
  const all = bankJson.bank.A.map(q => Object.assign({}, q, { __id: q.id, __form: 'A' }));
  return { ctx, all, cards: ctx.buildGroupedCards(all, bankJson.cards) };
}
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8').replace(/^window\.studyBundle = /, '').replace(/;\s*$/, ''));
for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundle['banks/medphys/pt2.json']]]) {
  test(name + ': typed questions only in Mixed Chapters, each question exactly once', () => {
    const { ctx, all, cards } = cardsOf(bank);
    const typed = all.filter(q => ctx.isTypedQuestion(q));
    assert.ok(typed.length > 50);
    const mixed = cards.find(c => c.label === 'Mixed Chapters');
    for (const c of cards) if (c !== mixed) assert.equal(c.pool.filter(q => ctx.isTypedQuestion(q)).length, 0, c.label);
    const ids = cards.flatMap(c => c.pool.map(q => q.id)).concat(all.filter(q => q.formula).map(q => q.id));
    assert.equal(ids.length, all.length); assert.equal(new Set(ids).size, all.length);
    for (const q of typed.filter(q => !q.formula)) assert.ok(mixed.pool.includes(all.find(a => a.id === q.id)) || mixed.pool.some(p => p.id === q.id), q.id);
    // stepped questions move whole, untouched
    for (const q of mixed.pool.filter(q => ctx.isStepped(q))) assert.deepEqual(q.steps, all.find(a => a.id === q.id).steps);
    // existing mixed items stay; label and multi-choice questions stay in chapters
    for (const q of all.filter(q => /^Mixed Chapters/.test(q.cat))) assert.ok(mixed.pool.some(p => p.id === q.id));
    for (const q of all.filter(q => ctx.isLabel(q) || ctx.isMulti(q) || ctx.isMatching(q))) if (!/^Mixed/.test(q.cat)) assert.ok(!mixed.pool.some(p => p.id === q.id));
  });
}
test('banks without the typed flag keep chapter routing', () => {
  const bank = { cards: [{ id: 'a', title: 'A', cats: ['A'] }, { id: 'm', title: 'M', cats: ['M'] }],
    bank: { A: [{ id: 's', cat: 'A', type: 'saq', answer: 'x' }, { id: 'c', cat: 'A', options: ['1', '2'], correct: 0 }] } };
  const { cards } = cardsOf(bank);
  assert.deepEqual(cards[0].pool.map(q => q.id), ['s', 'c']); assert.equal(cards[1].pool.length, 0);
});
test('a saved chapter run does not bring back questions that moved to Mixed Chapters', () => {
  const body = grab('restoreRun');
  assert.match(body, /const inCard=runCard && Array\.isArray\(runCard\.pool\) \? new Set\(runCard\.pool\.map\(q=>q\.__id\)\) : null;/);
  assert.match(body, /const base=inCard && !inCard\.has\(d\.id\) \? null : byId\[d\.id\];/);
  // behaviour: run the deck-filtering part against the real Chapter 5 card
  const { ctx, all, cards } = cardsOf(fileBank);
  const ch5 = cards.find(c => /^Chapter 5/.test(c.label));
  const moved = all.filter(q => /^Chapter 5/.test(q.cat) && ctx.isTypedQuestion(q));
  assert.ok(moved.length > 0);
  const oldDeck = all.filter(q => /^Chapter 5/.test(q.cat)).map(q => ({ id: q.id }));
  const inCard = new Set(ch5.pool.map(q => q.__id));
  const kept = oldDeck.filter(d => inCard.has(d.id));
  assert.equal(kept.length, ch5.pool.length);
  for (const q of moved) assert.ok(!kept.some(d => d.id === q.id), q.id);
});

const CALC = { ch3: ['PHY30041','PHY30052'], ch4: ['PHY40008','PHY40014','PHY40010','PHY40011','PHY40035','PHY40044','PHY40045','PHY40046','PHY40048','PHY40066','PHY40074'],
  ch5: ['PHY50002','PHY50010','PHY50011','PHY50017','PHY50020','PHY50021','PHY50027','PHY50062','PHY50084','PHY50089','PHY50090'],
  ch6: ['PHY60006','PHY60046'] };
// numbers in the question but recall, units, trends or naming: these stay in the chapters
const STAY = ['PHY30029','PHY30047','PHY30055','PHY40015','PHY40016','PHY40017','PHY40020','PHY40021','PHY40025','PHY40049','PHY40053','PHY40055','PHY40082','PHY50004','PHY50068','PHY50100','PHY50106','PHY60037'];
for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundle['banks/medphys/pt2.json']]]) {
  test(name + ': calculation registry moves exactly the listed questions to the Formulas section', () => {
    const { all, cards } = cardsOf(bank);
    const reg = all.filter(q => q.formula);
    assert.deepEqual(reg.map(q => q.id).sort(), Object.values(CALC).flat().sort());
    const gen = fs.readFileSync(path.join(root, 'js/formula-gen-pt2.js'), 'utf8');
    for (const [ch, ids] of Object.entries(CALC)) for (const id of ids) {
      const q = all.find(x => x.id === id); assert.equal(q.formula.chapter, ch, id);
      assert.equal(q.formula.chapter, 'ch' + q.cat.match(/^Chapter (\d)/)[1], id + ' keeps its chapter');
      assert.ok(new RegExp('\\b' + q.formula.key + ':').test(gen) || bank.formulaNames[q.formula.key], id + ' formula named');
      assert.ok(Array.isArray(q.options) && Number.isInteger(q.correct), id + ' is answerable as a choice');
    }
    const pooled = new Set(cards.flatMap(c => c.pool.map(q => q.id)));
    for (const q of reg) assert.ok(!pooled.has(q.id), q.id + ' not in a quiz card');
    for (const id of STAY) assert.ok(pooled.has(id), id + ' stays in a card');
  });
}
test('formula practice serves the chapter bank questions first, each once, then generated ones', () => {
  const src2 = fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8');
  const els = {}; const mk = id => (els[id] ||= { id, textContent: '', innerHTML: '', className: '', disabled: false, hidden: false, children: [], title: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild(c) { this.children.push(c); }, addEventListener() {}, replaceChildren() { this.children = []; } });
  const store = new Map();
  const ctx = { console, Math, JSON, Date, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    document: { readyState: 'complete', getElementById: mk, createElement: () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, set textContent(v) {} }), querySelectorAll: () => [], addEventListener() {} },
    addEventListener() {} };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/formula-gen-pt2.js'), 'utf8'), ctx);
  const { all } = cardsOf(fileBank);
  ctx.StudyQuiz = { formulaBank: () => ({ questions: all.filter(q => q.formula), names: fileBank.formulaNames }) };
  ctx.__activeMaterial = { formulas: { gen: 'Pt2FormulaGen', key: 't' } };
  vm.runInContext(src2, ctx);
  const fp = ctx.FormulaPractice, seen = [];
  fp.start(['refractiveIndex', 'snell', 'criticalAngle'], 'ch5');
  for (let i = 0; i < 14; i++) { seen.push(fp.question.bankId || null); fp.next(); }
  assert.deepEqual(seen.slice(0, 11).sort(), CALC.ch5.slice().sort());
  assert.deepEqual(seen.slice(11), [null, null, null]);
  fp.start(['snell'], 'ch5'); const q = fp.question, orig = all.find(x => x.id === q.bankId);
  assert.equal(q.options[q.correct], orig.options[orig.correct]); assert.equal(q.q, orig.q);
});

test('final routing: 26 calculations; chapter card sizes', () => {
  const { all, cards } = cardsOf(fileBank);
  assert.equal(all.filter(q => q.formula).length, 26);
  const size = l => cards.find(c => c.label.startsWith(l)).pool.length;
  assert.deepEqual([size('Chapter 3'), size('Chapter 4'), size('Chapter 5'), size('Chapter 6'), size('Mixed')], [95, 82, 45, 70, 54]);
  const per = ch => all.filter(q => q.formula && q.formula.chapter === ch).length;
  assert.deepEqual([per('ch3'), per('ch4'), per('ch5'), per('ch6')], [2, 11, 11, 2]);
});
test('registered optics diagrams: exact givens, answer matches the correct choice at its precision', () => {
  const { all } = cardsOf(fileBank);
  const withDia = all.filter(q => q.formula && q.formula.diagram).map(q => q.id).sort();
  assert.deepEqual(withDia, ['PHY50020', 'PHY50021', 'PHY50027', 'PHY50090']);
  for (const id of withDia) {
    const q = all.find(x => x.id === id), d = q.formula.diagram;
    assert.ok(!(d.target in d.values));
    const shown = d.answerValue.toFixed(d.precision);
    assert.ok(q.options[q.correct].startsWith(shown), id + ' ' + shown + ' vs ' + q.options[q.correct]);
    const v = { ...d.values, [d.target]: d.answerValue }, R = Math.PI / 180;
    if (d.kind === 'snell') assert.ok(Math.abs(v.n1 * Math.sin(v.t1 * R) - v.n2 * Math.sin(v.t2 * R)) < 1e-9);
    else assert.ok(Math.abs(Math.sin(v.t1 * R) - v.n2 / v.n1) < 1e-9);
  }
  for (const k of ['surfaceTensionUnits', 'soundSpeedTemp']) assert.ok(fileBank.formulaNames[k].description);
});

test('extra banks (Diagrams) keep their typed stepped questions; Mixed stays 54', async () => {
  const main = JSON.parse(JSON.stringify(fileBank)), extra = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/diagrams.json'), 'utf8'));
  let ingested = null;
  const ctx = { console, fetch: async p => ({ ok: true, json: async () => JSON.parse(JSON.stringify(p === 'main' ? main : extra)) }),
    ingestBank: d => { ingested = d; } }; ctx.window = ctx;
  vm.createContext(ctx); vm.runInContext(src.slice(src.indexOf('\nasync function loadBankWithExtras('), src.indexOf('\n(function wireQuizPrefs')), ctx);
  await ctx.loadBankWithExtras('main', ['extra']);
  assert.ok(ingested.bank.A.filter(q => q.__extra).length === extra.bank.A.length);
  assert.ok(!fileBank.bank.A.some(q => q.__extra), 'main questions untouched');
  const { ctx: e, cards } = cardsOf(ingested);
  const mixed = cards.find(c => c.label === 'Mixed Chapters'), dia = cards.find(c => c.label === 'Diagrams');
  assert.equal(mixed.pool.length, 54); assert.ok(!mixed.pool.some(q => q.__extra));
  const extraIds = new Set(extra.bank.A.map(q => q.id));
  const placed = cards.flatMap(c => c.pool).filter(q => extraIds.has(q.id));
  assert.equal(placed.length, extra.bank.A.length, 'every Diagrams question still placed once');
  assert.ok(dia.pool.length >= 38);
});

test('formula card count includes bank-only formulas', () => {
  const src2 = fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8');
  assert.match(src2, /formulaCount\(ch\) \+ ' formulas'/);
  const ctx = { document: { readyState: 'loading', addEventListener() {} }, addEventListener() {} }; ctx.window = ctx; vm.createContext(ctx);
  const { all } = cardsOf(fileBank);
  ctx.StudyQuiz = { formulaBank: () => ({ questions: all.filter(q => q.formula), names: fileBank.formulaNames }) };
  vm.runInContext(src2, ctx);
  const fc = ctx.FormulaPractice.formulaCount;
  assert.equal(fc({ id: 'ch5', keys: ['refractiveIndex', 'snell', 'criticalAngle'] }), 6); // + law of reflection, mirror equation, mirror focal length
  assert.equal(fc({ id: 'ch3', keys: ['poiseuille', 'surfaceTension'] }), 3); // + surface tension units
  assert.equal(fc({ id: 'ch4', keys: ['waveSpeed', 'periodFreq', 'mach', 'tempConvert'] }), 5); // + sound speed and temperature
});
