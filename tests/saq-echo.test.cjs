/* Typing echo on every short-answer input; grading stays exact. Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/quiz-engine.js'), 'utf8');
// Pure helpers only: the echo renderer and the grader it must never change.
const names = ['escapeHtml','saqBlankAlts','saqNorm','saqKey','saqAccepts','saqStem','saqWordBase','saqStemNames','saqCompletions','saqResult','labelCands','labelEchoHTML','saqAnyOrderUsed','saqBlankHintAlts'];
function grab(name) {
  const i = src.search(new RegExp('\\nfunction ' + name + '\\(')); assert.ok(i >= 0, name);
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1); }
}
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src.match(/\nconst SAQ_BLANK_RE=.*\n/)[0] + src.match(/\nconst SAQ_GENERIC=.*\n/)[0] + names.map(grab).join('\n'), ctx);
const marks = h => (h.match(/<mark class="label-mark">/g) || []).length;
test('every short-answer path attaches the shared echo', () => {
  const body = grab('renderSaq'), multi = grab('renderSaqMulti');
  assert.doesNotMatch(body, /isTypedStep\(q\) && !done/, 'echo no longer limited to stepped typed steps');
  assert.match(body, /if\(!done\) saqAttachEcho\(wrap, input, \(\)=>\(\{answer:null, accept:saqAccepts\(q\)/);
  assert.match(multi, /if\(!done\) saqAttachEcho\(row, input, \(\)=>\(\{answer:null, accept:saqBlankHintAlts\(q,k,/);
  assert.match(grab('saqAttachEcho'), /labelEchoHTML\(cands\(\), input\.value\)/);
  assert.match(grab('submitSaqBlank'), /querySelector\('\.saq-echo'\); if\(ec\) ec\.remove\(\)/, 'a locked blank drops its echo');
  assert.match(grab('saqSolvedFx'), /#options \.saq-echo/);
});
test('standalone echo marks only the mistyped letters and blank shows nothing', () => {
  const q = { answer: 'Concave', accept: ['Concave mirror'] };
  const c = { answer: null, accept: ctx.saqAccepts(q) };
  assert.equal(ctx.labelEchoHTML(c, ''), '');
  assert.equal(marks(ctx.labelEchoHTML(c, 'Conca')), 0);
  const h = ctx.labelEchoHTML(c, 'Concariif'); assert.equal(marks(h), 4); assert.ok(!h.includes('ve'), 'answer not revealed');
  assert.equal(marks(ctx.labelEchoHTML(c, 'concave mirror')), 0, 'accepted form, case not graded');
});
test('multi-blank echo follows each blank, including any-order alternatives', () => {
  const q = { answers: [['phleb/o'], ['vein']] };
  assert.equal(marks(ctx.labelEchoHTML({ accept: ctx.saqBlankHintAlts(q, 0, [null, null]) }, 'phlab')), 1);
  assert.equal(marks(ctx.labelEchoHTML({ accept: ctx.saqBlankHintAlts(q, 1, [null, null]) }, 'vein')), 0);
  const any = { anyOrder: true, answers: [['red'], ['blue']] };
  assert.equal(marks(ctx.labelEchoHTML({ accept: ctx.saqBlankHintAlts(any, 0, [null, null]) }, 'blue')), 0);
});
test('grading stays exact: typos are rejected, configured forms still pass', () => {
  const q = { answer: 'Concave', accept: ['Concave mirror'] };
  assert.equal(ctx.saqResult(q, 'Concariif'), null);
  assert.equal(ctx.saqResult(q, 'Concav'), null);
  assert.equal(ctx.saqResult(q, 'Concaev'), null);
  assert.equal(ctx.saqResult(q, ' concave ').text, 'concave');
  assert.equal(ctx.saqResult(q, 'concave mirror').text, 'concave mirror');
});
test('typing hints switch: on by default, one saved preference, hides and restores echoes', () => {
  const store = new Map(), cls = new Set(), listeners = {};
  const cb = { checked: false, addEventListener: (k, f) => { listeners['cb' + k] = f; } };
  const label = { className: '', set innerHTML(v) { this.html = v; }, querySelector: () => cb, addEventListener: (k, f) => { listeners[k] = f; } };
  const c = { localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) },
    document: { documentElement: { classList: { toggle: (k, on) => on ? cls.add(k) : cls.delete(k) } }, createElement: () => label } };
  vm.createContext(c);
  vm.runInContext(src.match(/\nconst SAQ_HINTS_KEY=.*\n/)[0] + ['saqHintsOff', 'applySaqHints', 'saqHintToggle'].map(grab).join('\n'), c);
  assert.equal(c.saqHintsOff(), false);
  const lb = c.saqHintToggle();
  assert.match(lb.html, /Disable typing hints/); assert.equal(cb.checked, false); assert.ok(!cls.has('pt2-no-saq-hints'));
  let prevented = false; listeners.pointerdown({ preventDefault: () => { prevented = true; } }); assert.ok(prevented, 'answer box keeps focus');
  cb.checked = true; listeners.cbchange();
  assert.equal(store.get('pt2_saq_hints_off'), '1'); assert.ok(cls.has('pt2-no-saq-hints'), 'current echoes hidden at once');
  cb.checked = false; c.saqHintToggle(); assert.equal(cb.checked, true, 'persists to the next render');
  cb.checked = false; listeners.cbchange(); assert.ok(!cls.has('pt2-no-saq-hints')); assert.equal(c.saqHintsOff(), false);
  const css = fs.readFileSync(path.join(__dirname, '..', 'css/quiz-pt1.css'), 'utf8');
  assert.match(css, /\.pt2-no-saq-hints \.pt1q \.saq-echo\{display:none!important\}/);
  // one switch per question, never per blank; gone once solved
  assert.match(grab('renderSaq'), /if\(!done\) wrap\.appendChild\(saqHintToggle\(\)\);/);
  assert.match(grab('renderSaqMulti'), /if\(!a\.correct\) wrap\.appendChild\(saqHintToggle\(\)\);/);
  assert.equal((grab('renderSaqMulti').match(/saqHintToggle/g) || []).length, 1);
  assert.match(grab('saqSolvedFx'), /\.saq-hint-toggle/);
  // the switch only touches the display: grading code never reads it
  for (const f of ['saqResult', 'submitSaq', 'submitSaqBlank', 'labelEchoHTML']) assert.doesNotMatch(grab(f), /saqHints/);
});
