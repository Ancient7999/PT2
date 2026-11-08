/* Diagrams section: naming question inline under the diagram, content-specific prompts, follow-up select-all,
   lessons, field geometry (inside the picture, no overlaps, leader lines), answer mask and placed-word style. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/quiz-pt1.css'), 'utf8');
function grab(name) { const i = src.search(new RegExp('\\nfunction ' + name + '\\(')); assert.ok(i >= 0, name); let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } }
const file = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/diagrams.json'), 'utf8'));
const SB = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8'), c); return c.window.studyBundle; })();
const mainBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const Qs = file.bank.A, byId = Object.fromEntries(Qs.map(q => [q.id, q]));
const stepOf = (q, t) => q.steps.find(s => s.type === t);
const E = (() => {
  const c = { console, BANK: { lessons: mainBank.lessons }, localStorage: { getItem: () => null, setItem() {} } }; vm.createContext(c);
  vm.runInContext(src.match(/\nconst SAQ_GENERIC=.*\n/)[0] + ['shuffle', 'isMatching', 'isStepped', 'isStep', 'isTypedStepDef', 'isOrder', 'isLabel', 'isMulti', 'isSaq', 'isSaqMulti', 'saqNorm', 'saqKey', 'saqAccepts',
    'saqBlankAlts', 'saqStem', 'saqWordBase', 'saqStemNames', 'saqCompletions', 'saqResult', 'saqMatches', 'typeOnlyOn', 'typeOnlyKey', 'expandDeck', 'labelCands', 'labelInBounds', 'labelDoneCount', 'labelAllDone',
    'labelMaskTerms', 'labelMaskRegex', 'labelAnchors', 'labelLeaderStart', 'labelLeadersSVG', 'escapeHtml'].map(grab).join('\n') + ';this.api={expandDeck,labelInBounds,labelAllDone,labelMaskTerms,labelMaskRegex,saqResult,labelLeadersSVG};', c);
  return c.api;
})();
const entries = q => E.expandDeck([Object.assign(JSON.parse(JSON.stringify(q)), { __id: q.id, __form: 'A', labels: q.labels.map(E.labelInBounds) })]);
const words = s => String(s).toLowerCase().replace(/[’']/g, "'");

test('bank file and offline bundle carry the same Diagrams bank and lessons', () => {
  assert.equal(JSON.stringify(SB['banks/medphys/diagrams.json']), JSON.stringify(file));
  assert.equal(JSON.stringify(SB['banks/medphys/pt2.json'].lessons), JSON.stringify(mainBank.lessons));
  assert.equal(Qs.length, 39);
});

test('every naming question is asked under its diagram: one page, label then name, then the select-all page', () => {
  for (const q of Qs) {
    const e = entries(q), nm = stepOf(q, 'saq');
    if (!nm) { assert.equal(q.id, 'CH4_FREQ'); assert.equal(e.length, 2); continue; }
    assert.equal(nm.inline, true, q.id);
    assert.equal(e.length, 2, q.id + ': label+name page and the select-all page');
    assert.equal(e[0].type, 'label'); assert.equal(e[0].__stepCount, 2);
    assert.equal(e[0].__name.prompt, nm.prompt); assert.equal(e[0].__name.answer, nm.answer);
    assert.equal(e[1].type, 'multi');
    assert.ok(E.saqResult(e[0].__name, nm.answer), q.id + ' answer accepted');
    assert.equal(E.saqResult(e[0].__name, 'zzz'), null);
  }
});

test('prompts follow the content: "law" only for real laws; eye, myopia, hyperopia, retina-type answers never asked as a law', () => {
  const LAWS = new Set(['DIAG_LAPLACE', 'DIAG_POISE', 'CH4_ZEROTH', 'CH4_ZEROTH2', 'CH5_REFL']);
  for (const q of Qs) {
    const nm = stepOf(q, 'saq'); if (!nm) continue;
    assert.doesNotMatch(nm.prompt, /law or principle/i, q.id);
    assert.ok(nm.ask, q.id + ' has explicit metadata');
    assert.equal(/\blaws?\b/i.test(nm.prompt), LAWS.has(q.id) || q.id === 'DIAG_TIA' || q.id === 'DIAG_SURF', q.id + ': ' + nm.prompt);
    assert.doesNotMatch(q.q, /law\/principle|its uses/i, q.id);
  }
  // the eye asks for the STRUCTURE (retina) by its function, never "law or principle"
  const eye = stepOf(byId.CH6_EYE, 'saq');
  assert.equal(eye.ask, 'structure'); assert.equal(eye.answer, 'Retina'); assert.match(eye.prompt, /structure/); assert.doesNotMatch(eye.prompt, /retina/i);
  assert.ok(E.saqResult(entries(byId.CH6_EYE)[0].__name, 'retina'));
  for (const t of ['cornea', 'lens', 'eye', 'iris']) assert.equal(E.saqResult(entries(byId.CH6_EYE)[0].__name, t), null, 'not the image structure: ' + t);
  for (const id of ['CH6_MYOPIA', 'CH6_HYPER']) { assert.equal(stepOf(byId[id], 'saq').prompt, 'Which vision defect is shown?'); assert.equal(stepOf(byId[id], 'saq').ask, 'defect'); }
  assert.equal(stepOf(byId.CH6_EYE, 'multi').prompt, 'Select all correct statements about how the eye forms an image.');
  assert.equal(stepOf(byId.CH6_EYE, 'multi').ask, 'facts');
});

test('no prompt, stem or word-bank chip gives the naming answer away; accepted forms are synonyms only', () => {
  for (const q of Qs) {
    const nm = stepOf(q, 'saq'); if (!nm) continue;
    const ans = [nm.answer].concat(nm.accept || []).filter(a => a.length > 3).map(words);
    for (const a of ans) {
      assert.ok(!words(nm.prompt).includes(a), q.id + ' prompt names ' + a);
      assert.ok(!words(q.q).includes(a), q.id + ' stem names ' + a);
      // the eye is the one deliberate exception: placing "Retina" tests WHERE it is, the name tests WHAT it does (user t94)
      if (q.id !== 'CH6_EYE') for (const l of q.labels) assert.notEqual(words(l.answer), a, q.id + ': chip "' + l.answer + '" is an accepted answer');
    }
  }
});

test('select-all follow-ups: content-specific heading, medical wording only for real clinical uses, no off-topic filler distractors', () => {
  for (const q of Qs) {
    const m = stepOf(q, 'multi');
    assert.ok(['clinical', 'facts', 'applications'].includes(m.ask), q.id);
    if (m.ask === 'facts') assert.doesNotMatch(m.prompt, /medical|clinical/i, q.id + ': ' + m.prompt);
    else assert.match(m.prompt, /medical|clinical|body|therapy|treatment|endoscopy|lungs|condition|used/i, q.id + ': ' + m.prompt);
    assert.ok(m.correct.length >= 2 && m.correct.length < m.options.length, q.id);
    assert.equal(new Set(m.options).size, m.options.length, q.id);
    for (const o of m.options) assert.doesNotMatch(o, /^(ECG electrode placement|Bone density( measurement)?|Lens refraction|Measuring blood glucose|Blood glucose testing)$/, q.id);
  }
  // Bernoulli's own uses; the aneurysm belongs to Laplace's law in the notes
  const b = stepOf(byId.DIAG001, 'multi'); assert.ok(b.correct.every(k => !/aneurysm/i.test(b.options[k])));
  const lp = stepOf(byId.DIAG_LAPLACE, 'multi'); assert.ok(lp.correct.some(k => /aneurysm/i.test(lp.options[k])));
});

test('every Diagrams question opens full topic lessons after the whole question (pre-answered exam Q&As)', () => {
  for (const q of Qs) {
    assert.ok(Array.isArray(q.lessons) && q.lessons.length, q.id);
    for (const k of q.lessons) { const l = mainBank.lessons[k]; assert.ok(l, q.id + ' → ' + k); assert.deepEqual(l.exam.map(e => e.kind), ['define', 'why', 'relation']); }
  }
  for (const k of ['waves', 'soundRanges', 'shockWaves', 'zerothLaw', 'temperature', 'magnifier', 'microscope']) assert.ok(mainBank.lessons[k], k);
  assert.match(grab('lawPanelReady'), /__stepIdx!==q.__stepCount-1/);
});

test('every field lies inside its picture and no two fields overlap (all diagrams, as rendered)', () => {
  for (const q of Qs) {
    const L = q.labels.map(E.labelInBounds);
    for (const l of L) { assert.ok(l.x >= 0 && l.y >= 0 && l.x + l.w <= 100.001 && l.y + l.h <= 100.001, q.id + ' ' + l.id); }
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      assert.ok(!(ox > 0 && oy > 0), q.id + ': ' + a.id + ' overlaps ' + b.id);
    }
  }
  // the engine moves (never shrinks) a box that was drawn past the edge
  const r = E.labelInBounds({ id: 'f', x: 96.2, y: 33.4, w: 24, h: 7 }); assert.deepEqual([r.x, r.w], [76, 24]);
  assert.match(src, /copy\.labels=copy\.labels\.map\(labelInBounds\)/);
});

test('wave types: crest and trough lines end on the exact peak and lowest point of the drawn wave', () => {
  const q = byId.CH4_WAVES, [, , vw, vh] = q.svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const pts = q.svg.match(/<path d="(M[^"]+)"/)[1].replace(/[ML]/g, ' ').trim().split(/\s+/).map(p => p.split(',').map(Number));
  const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
  const at = (id) => q.labels.find(l => l.id === id);
  for (const [id, y] of [['crest', minY], ['trough', maxY]]) {
    const a = at(id).anchor, px = a.x / 100 * vw, py = a.y / 100 * vh;
    assert.equal(at(id).leader, 'show');
    assert.ok(Math.abs(py - y) < 0.6, id + ' y ' + py + ' vs ' + y);
    assert.ok(pts.some(p => Math.abs(p[1] - y) < 0.01 && Math.abs(p[0] - px) < 2), id + ' x on a ' + id);
  }
  const svg = E.labelLeadersSVG(q); assert.match(svg, /class="label-leader shown" data-id="crest"/); assert.match(svg, /class="label-leader shown" data-id="trough"/);
});

/* visible drawing text as the quiz shows it before the page is solved */
function quizText(q) {
  const e = entries(q)[0], re = E.labelMaskRegex(E.labelMaskTerms(e)), out = [];
  for (const m of q.svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    if (/data-quiz-hide|data-under-label/.test(m[1])) continue;
    out.push(m[2].replace(/<[^>]+>/g, '').replace(re, (x, pre) => pre + '▪▪▪'));
  }
  return out.join(' | ');
}
test('quiz answer mask: no field answer or naming answer is readable in any drawing until it is solved', () => {
  for (const q of Qs) {
    const t = words(quizText(q)), e = entries(q)[0];
    const terms = q.labels.map(l => l.answer).concat(e.__name ? [e.__name.answer].concat(e.__name.accept) : []).filter(x => x.length >= 3).map(x => words(x.replace(/\s*\([^)]*\)$/, '')));
    for (const a of terms) assert.ok(!new RegExp('(^|[^a-z0-9])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(t), q.id + ' shows "' + a + '": ' + t);
  }
  const near = words(quizText(byId.CH6_NEAR));
  for (const w of ['presbyopia', 'near point', 'far point']) assert.ok(!near.includes(w), w);
  assert.match(near, /25 cm/); assert.match(near, /18 cm/); // distance clues stay; the "moves away with age" caption answers the select-all step, so it waits (data-quiz-hide="later")
  assert.ok(!words(quizText(byId.CH5_TIR)).includes('total internal reflection'));
  assert.ok(!words(quizText(byId.CH6_MAG)).includes('virtual'));
  // text nodes only: attributes and ids are never rewritten, and the mask lifts on solve
  assert.match(grab('labelMaskApply'), /n\.nodeValue=re \? n\.__orig\.replace/);
  assert.match(grab('labelFinish'), /labelMaskApply\(document\.querySelector\('#options \.label-figure'\), q, false\)/);
  assert.match(css, /\.label-figure\.quiz-masked \[data-quiz-hide\],\.label-figure \[data-under-label\]\{visibility:hidden\}/);
  assert.match(src, /c\.split\(':'\)\[0\]/, 'the chapter tag keeps the topic hidden until it is named');
});

test('display notation: no bare underscores in the drawings (n_core / n_cladding are real subscripts)', () => {
  for (const q of Qs) for (const m of q.svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) assert.doesNotMatch(m[1].replace(/<[^>]+>/g, ''), /[A-Za-zθ]_[A-Za-z{]/, q.id);
  assert.match(byId.CH5_FIBER.svg, /n<tspan baseline-shift="sub" font-size="75%">core<\/tspan> &gt; |n<tspan baseline-shift="sub" font-size="75%">core<\/tspan> > n<tspan baseline-shift="sub" font-size="75%">cladding<\/tspan>/);
});

test('credit only when every label is placed AND the name is right, in either order', () => {
  const e = entries(byId.CH5_TIR)[0], all = Object.fromEntries(e.labels.map(l => [l.id, l.answer]));
  assert.equal(E.labelAllDone(e, { slots: all }), false);
  assert.equal(E.labelAllDone(e, { slots: {}, name: { text: 'TIR' } }), false);
  assert.equal(E.labelAllDone(e, { slots: { below: 'Below critical angle' }, name: { text: 'TIR' } }), false);
  assert.equal(E.labelAllDone(e, { slots: all, name: { text: 'Total internal reflection' } }), true);
  const lock = grab('labelLock'), sub = grab('submitLabelName');
  assert.match(lock, /if\(k>=n && labelAllDone\(q, a\)\)\{ labelFinish\(q, a\); return; \}/);
  assert.match(lock, /now answer the question under the diagram/);
  assert.match(sub, /if\(!r\)\{ saqSoftWrong\(input, saqHint\(q\.__name, typed\), o\); return; \}/, 'a wrong name is refused, nothing is credited');
  assert.match(sub, /if\(labelAllDone\(q, a\)\)\{ labelFinish\(q, a\); return; \}/);
  assert.match(sub, /if\(!quizActive \|\| locked\) return;/);
});

test('saved runs and Back keep partial progress: labels and the name are saved and restored, old "law" step answers carry over', () => {
  assert.match(src, /a\.name\?\{name:Object\.assign\(\{\}, a\.name\)\}:\{\}/);
  const rr = grab('restoreRun');
  assert.match(rr, /ans\[q\.__id\+'#'\+q\.__name\.id\]/);
  assert.match(rr, /saqMatches\(q\.__name, src\.text\)/);
  assert.match(rr, /answers\[i\]\.correct=labelAllDone\(q, answers\[i\]\)/);
  const mount = grab('mountLabelName');
  assert.match(mount, /if\(done\)\{ input\.value=a\.name\.text; input\.disabled=true;/);
  assert.match(mount, /saqHintToggle\(\)/); // the typing-hints setting applies here too
  assert.match(grab('renderLabel'), /h\+=labelNameHTML\(q,a\);/); // directly under the picture, before the word bank
  assert.match(grab('showsDiagram'), /q\.__bone && q\.__bone\.svg/); // a diagram page never auto-advances
});

test('placed words: green text in a transparent field, no mint fill or glow; leader lines kept on when asked', () => {
  const r = css.match(/\.label-slot\.locked\{[^}]*\}/)[0];
  assert.match(r, /background:transparent/); assert.match(r, /box-shadow:none/); assert.match(r, /color:var\(--success\)/);
  assert.doesNotMatch(r, /color-mix\(in srgb,var\(--success\) 22%,#fff\)/);
  assert.match(css, /\.label-leader\.shown polyline,\.label-leader\.shown line\{opacity:\.8;stroke-width:1\.6px\}/);
});

// —— t115: captions that answer the LATER select-all step stay hidden until that step is answered ——
const svgOf = q => { const l = q.steps.find(s => s.type === 'label'); return (l && l.svg) || q.svg || ''; };
const textNodes = q => [...svgOf(q).matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)].map(m => ({ attrs: m[1], text: m[2].replace(/<[^>]+>/g, '').replace(/&gt;/g, '>') }));
const later = q => textNodes(q).filter(n => /data-quiz-hide="later"/.test(n.attrs)).map(n => n.text);
test('t115: every caption that states a correct select-all option is held back until the select-all step is answered', () => {
  const must = { CH5_CURVED: ['r = 2f', 'f = r/2', 'Concave, converging mirror', 'Convex, diverging mirror'], CH6_LASERPARTS: ['Medical: microsurgery', 'Energy → Excitation', 'back and forth'],
    CH6_LASERLIGHT: ['Medical: bloodless knife'], CH6_NEAR: ['moves farther away with age', 'Normal adult: near point', 'Presbyopia'], CH6_MYOPIA: ['Correction: concave'], CH6_HYPER: ['Correction: convex'],
    CH5_REFL: ['θi = θr', 'one plane'], CH5_MIRROR: ['laterally inverted', '= d'], CH6_MAG: ['M = θ/θ₀', 'object between the lens and F'], CH6_MICRO: ['eyepiece = simple magnifier'],
    CH4_ZEROTH: ['no heat flows', 'equilibrium too'], DIAG_TIA: ['narrow → v↑'], DIAG_LAPLACE: ['rupture risk'], CH5_FIBER: ['endoscopes'], CH5_LENS: ['P = 1/f'], CH4_SHOCK2: ['ESWL ='] };
  for (const [id, frags] of Object.entries(must)) for (const f of frags) assert.ok(later(byId[id]).some(t => t.includes(f)), id + ' must hold back "' + f + '"');
  const STOP = new Set('the a an of to in and is are it its by for on at with from as or be into this that their than which'.split(' '));
  const W = s => new Set((s.toLowerCase().match(/[a-z]{3,}/g) || []).filter(w => !STOP.has(w)));
  const AXES = new Set(['CH4_PHASE', 'CH4_TEMP', 'CH4_FREQ']); // figure-reading axes/rows are the figure itself
  for (const q of Qs) {
    if (AXES.has(q.id)) continue;
    const m = q.steps.find(s => s.type === 'multi'); const ok = m.correct.map(i => m.options[i]);
    for (const n of textNodes(q)) if (!/data-quiz-hide|data-under-label/.test(n.attrs)) for (const o of ok) {
      const a = W(n.text), b = W(o); const shared = [...a].filter(w => b.has(w));
      assert.ok(shared.length < 3, q.id + ': visible "' + n.text + '" gives away "' + o + '"');
    }
  }
});
test('t115: the later mask is quiz-only runtime wiring; study notes keep every caption', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'quiz-engine.js'), 'utf8');
  assert.match(src, /function labelLaterPending\(q\)/);
  assert.match(src, /classList\.toggle\('quiz-masked-later', !!on \|\| labelLaterPending\(q\)\)/);
  const css = fs.readFileSync(path.join(root, 'css', 'quiz-pt1.css'), 'utf8');
  assert.match(css, /\.label-figure\.quiz-masked-later \[data-quiz-hide="later"\]\{visibility:hidden\}/);
  for (const ch of [3, 4, 5, 6]) assert.ok(!/data-quiz-hide/.test(fs.readFileSync(path.join(root, 'content/medphys/pt2/chapter-' + ch + '.md'), 'utf8')));
});
test('t115: two-mirror figure asks for the collective name; spherical/curved mirrors accepted, typos not', () => {
  const nm = entries(byId.CH5_CURVED)[0].__name;
  assert.equal(nm.prompt, 'What is the collective name for these concave and convex mirrors?');
  for (const t of ['spherical mirrors', 'Spherical mirror', 'curved mirrors', 'curved mirror']) assert.ok(E.saqResult(nm, t), t);
  for (const t of ['sphrical mirrors', 'concave mirror', 'plane mirrors', 'mirror']) assert.equal(E.saqResult(nm, t), null, t);
});
test('t115: mirror/lens distances display as subscripts (bank, study notes, SVG)', () => {
  const bank = fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8');
  assert.doesNotMatch(bank, /1\/do\b|1\/di\b|\bdi (positive|negative)|distance do\b/);
  const ch5 = fs.readFileSync(path.join(root, 'content/medphys/pt2/chapter-5.md'), 'utf8');
  assert.doesNotMatch(ch5, />do = di<|>do<|>di<|\bdo = di\b/);
  assert.match(svgOf(byId.CH5_MIRROR), /d<tspan baseline-shift="sub" font-size="75%">o<\/tspan> = d<tspan baseline-shift="sub" font-size="75%">i<\/tspan>/);
});
