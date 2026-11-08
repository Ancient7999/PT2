/* No auto-next bar on questions that show a diagram (svg figures, law cards with diagrams). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/quiz-engine.js'), 'utf8');
const fn = name => { const i = src.indexOf('\nfunction ' + name + '('); assert.ok(i >= 0, name); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };
function env(qs, answered = true) {
  const started = [];
  const host = { insertAdjacentElement: (_, w) => { started.push(w); w.isConnected = true; } };
  const ctx = { questions: qs, current: 0, answers: qs.map(() => answered ? 1 : null), BANK: { lawPanels: { re: { title: 'Reynolds', diagram: { src: 'x', label: 'y' } }, plain: { title: 'Plain' } } },
    isStep: () => false, isTypedStep: () => true, isMatching: () => false, window: {}, isAnswered: a => a != null, quizActive: true, goNext() { ctx.went = true; },
    performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, timers: [], setTimeout(f) { ctx.timers.push(f); return 1; }, clearTimeout() {},
    document: { getElementById: id => id === 'feedback' ? host : null, createElement: () => ({ set innerHTML(v) {}, querySelector: () => ({ style: {} }), remove() { this.isConnected = false; } }) } };
  vm.createContext(ctx);
  vm.runInContext('let kbAdv=null;' + src.match(/\nconst HAS_DIAGRAM=.*\n/)[0] + 'const LESSON_SRC={};' + ['lawPanelsFor', 'lessonsFor', 'lawPanelReady', 'lessonExcerpt', 'lessonSource', 'lessonMarkdown', 'lawDiagramFrom', 'clearKbAdvance', 'showsDiagram', 'startKbAdvance'].map(fn).join('\n') + ';this.kb=()=>kbAdv;', ctx);
  return { ctx, started };
}
test('plain question: the bar starts and advances', () => {
  const { ctx, started } = env([{ q: 'a' }]); ctx.startKbAdvance();
  assert.equal(started.length, 1); ctx.timers[0](); assert.equal(ctx.went, true);
});
test('svg diagram question and its expanded steps: no bar', () => {
  for (const q of [{ svg: '<svg/>' }, { __bone: { svg: '<svg/>' } }]) { const { ctx, started } = env([q]); ctx.startKbAdvance(); assert.equal(started.length, 0); assert.equal(ctx.kb(), null); }
});
test('answered question with a law card diagram: no bar, even before the diagram loads; card without diagram keeps it', () => {
  let e = env([{ lawPanel: 're' }]); e.ctx.startKbAdvance(); assert.equal(e.started.length, 0);
  e = env([{ lawPanel: ['plain', 're'] }]); e.ctx.startKbAdvance(); assert.equal(e.started.length, 0);
  e = env([{ lawPanel: 'plain' }]); e.ctx.startKbAdvance(); assert.equal(e.started.length, 1);
});
test('suppression does not stick: the next plain question gets the bar', () => {
  const { ctx, started } = env([{ svg: '<svg/>' }, { q: 'b' }]);
  ctx.startKbAdvance(); assert.equal(started.length, 0);
  vm.runInContext('current=1', ctx); ctx.startKbAdvance(); assert.equal(started.length, 1);
});
test('a late-loading law diagram cancels any running countdown', () => {
  const body = fn('renderLawPanel');
  assert.match(body, /d\.innerHTML=h;\n\s*clearKbAdvance\(\);/);
  assert.match(fn('startKbAdvance'), /clearKbAdvance\(\);\n\s*if\(showsDiagram\(questions\[current\]\)\) return;/);
});
