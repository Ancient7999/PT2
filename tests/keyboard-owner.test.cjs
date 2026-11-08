/* Keyboard: Tab owner switching (calculator ⇄ questions), Tab kept in the question area, formula arrows / Enter.
   Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
const fp = fs.readFileSync(path.join(root, 'js/formula-practice.js'), 'utf8');
function grabFrom(src, name) {
  const i = src.search(new RegExp('\\n\\s*function ' + name + '\\(')); assert.ok(i >= 0, name);
  let depth = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1); }
}

/* tiny DOM: elements with ids, classes, parents, focus */
function makeDom() {
  const doc = { body: null, activeElement: null, all: [] };
  class El {
    constructor(tag, o = {}) { Object.assign(this, { tagName: tag.toUpperCase(), id: o.id || '', cls: new Set(o.cls || []), parent: null, kids: [], disabled: !!o.disabled, readOnly: false, hidden: !!o.hidden, attrs: Object.assign({}, o.attrs), style: { display: o.display || '' }, tabIndex: o.tabIndex != null ? o.tabIndex : (/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(tag.toUpperCase()) ? 0 : -1), clicks: 0, shown: o.shown !== false });
      this.classList = { contains: c => this.cls.has(c), add: (...c) => c.forEach(x => this.cls.add(x)), remove: (...c) => c.forEach(x => this.cls.delete(x)), toggle: (c, on) => on ? this.cls.add(c) : this.cls.delete(c) };
      doc.all.push(this); }
    add(...k) { k.forEach(c => { c.parent = this; this.kids.push(c); }); return this; }
    contains(x) { for (let n = x; n; n = n.parent) if (n === this) return true; return false; }
    hasAttribute(a) { return a in this.attrs; } setAttribute(a, v) { this.attrs[a] = String(v); if (a === 'tabindex') this.tabIndex = +v; } getAttribute(a) { return this.attrs[a]; }
    focus() { doc.activeElement = this; } blur() { if (doc.activeElement === this) doc.activeElement = doc.body; }
    click() { if (!this.disabled) { this.clicks++; this.onclick && this.onclick(); } }
    scrollIntoView() {} getClientRects() { return this.shown ? [1] : []; }
    matches(sel) { return sel.split(',').some(s => { const parts = s.trim().split(/\s+/); if (!match(this, parts.pop())) return false;
      let n = this.parent; while (parts.length && n) { if (n.matches && match(n, parts[parts.length - 1])) parts.pop(); n = n.parent; } return !parts.length; }); }
    closest(sel) { for (let n = this; n && n !== doc; n = n.parent) if (n.matches && n.matches(sel)) return n; return null; }
    querySelectorAll(sel) { const out = []; const walk = n => n.kids.forEach(k => { if (k.matches(sel)) out.push(k); walk(k); }); walk(this); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  }
  function match(el, s) {
    if (s === '*') return true;
    const not = []; s = s.replace(/:not\(([^)]*)\)/g, (_, x) => { not.push(x); return ''; });
    if (not.some(x => match(el, x))) return false;
    if (s === ':disabled') return el.disabled;
    const attr = []; s = s.replace(/\[([^\]=]+)(?:="([^"]*)")?\]/g, (_, a, v) => { attr.push([a, v]); return ''; });
    for (const [a, v] of attr) { if (a === 'contenteditable') return false; if (!(a in el.attrs) || (v != null && el.attrs[a] !== v)) return false; }
    if (s.includes(':disabled')) { if (!el.disabled) return false; s = s.replace(':disabled', ''); }
    const m = /^([a-z]*)((?:[#.][\w-]+)*)$/i.exec(s); if (!m) return false;
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    for (const p of m[2].match(/[#.][\w-]+/g) || []) { if (p[0] === '#' ? el.id !== p.slice(1) : !el.cls.has(p.slice(1))) return false; }
    return true;
  }
  doc.body = new El('body');
  doc.activeElement = doc.body;
  doc.getElementById = id => doc.all.find(e => e.id === id && (e === doc.body || doc.body.contains(e))) || null;
  doc.querySelector = s => doc.body.querySelector(s); doc.querySelectorAll = s => doc.body.querySelectorAll(s);
  return { doc, El };
}
function keyEv(key, o = {}) { return Object.assign({ key, code: o.code || '', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, prevented: false, stopped: false,
  preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } }, o); }

/* page: a normal quiz panel or the formula panel, a calculator, a footer emoji */
function page({ mode = 'quiz', calcOpen = false, saq = false, quizActive = true } = {}) {
  const { doc, El } = makeDom();
  const panel = new El('div', { id: mode === 'quiz' ? 'mainPanel' : 'formulaPanel' });
  const opts = [0, 1, 2, 3].map(i => new El('button', { cls: ['opt'] }));
  const input = new El('input', { cls: ['saq-input'] });
  const optsBox = new El('div', { id: mode === 'quiz' ? 'options' : 'formulaOptions' }).add(...(saq ? [input] : opts));
  const next = new El('button', { id: mode === 'quiz' ? 'nextBtn' : 'formulaRollBtn' }), backB = new El('button', { id: mode === 'quiz' ? 'backBtn' : 'formulaBackBtn' });
  const diagram = new El('aside', { id: 'formulaDiagram', hidden: true });
  panel.add(optsBox, next, backB); if (mode === 'formula') panel.add(diagram);
  const view = new El('div', { id: mode === 'quiz' ? 'quizView' : 'formulaView', cls: quizActive ? ['active'] : [] }).add(panel);
  const calcDisplay = new El('div', { id: 'calcDisplay' });
  const calc = new El('div', { id: 'calculator-widget', display: calcOpen ? 'block' : 'none' }).add(calcDisplay);
  const hidden = new El('input', { id: 'answer-input' });
  const emoji = new El('button', { id: 'emoji' });
  doc.body.add(view, calc, new El('div', { id: 'answer-entry' }).add(hidden), new El('footer').add(emoji));
  return { doc, panel, opts, input, next, backB, diagram, calc, calcDisplay, hidden, emoji };
}
function tabEngine(p, { runActive = true, pending = false } = {}) {
  const win = { lastInputTarget: 'answer', updates: 0 };
  win.updateInputTargets = () => win.updates++;
  win.FormulaPractice = { drawingPending: () => pending };
  const ctx = { document: p.doc, window: win, runKeysActive: () => runActive,
    getComputedStyle: el => ({ display: el.style.display === 'none' || el.hidden ? 'none' : 'block', visibility: 'visible' }) };
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(['kbShown', 'calcOpen', 'tabScope', 'tabStops', 'questionFocusTarget', 'calcTab', 'tabKey'].map(n => grabFrom(eng, n)).join('\n'), ctx);
  return { ctx, win };
}

test('calculator open: Tab hands real focus to the question, Tab again back to the calculator display', () => {
  for (const mode of ['quiz', 'formula']) {
    const p = page({ mode, calcOpen: true }); const { ctx, win } = tabEngine(p);
    win.lastInputTarget = 'calc'; p.calcDisplay.focus();
    const e = keyEv('Tab'); assert.equal(ctx.tabKey(e), true);
    assert.ok(e.prevented && e.stopped, 'consumed before the calculator\'s own Tab');
    assert.equal(win.lastInputTarget, 'answer'); assert.equal(p.doc.activeElement, p.panel, mode + ': focus is on the question panel, not the hidden field');
    assert.notEqual(p.doc.activeElement, p.hidden);
    const e2 = keyEv('Tab', { shiftKey: true }); ctx.tabKey(e2);
    assert.equal(win.lastInputTarget, 'calc'); assert.equal(p.doc.activeElement, p.calcDisplay);
    assert.ok(win.updates >= 2);
  }
});
test('calculator open, typed question: focus goes to the editable answer box', () => {
  const p = page({ calcOpen: true, saq: true }); const { ctx, win } = tabEngine(p);
  win.lastInputTarget = 'calc'; ctx.tabKey(keyEv('Tab'));
  assert.equal(p.doc.activeElement, p.input);
  p.input.disabled = true; win.lastInputTarget = 'calc'; ctx.tabKey(keyEv('Tab'));
  assert.equal(p.doc.activeElement, p.panel, 'a locked box is skipped');
});
test('calculator open, diagram still to draw: focus goes to the drawing tool', () => {
  const p = page({ mode: 'formula', calcOpen: true });
  p.diagram.hidden = false;
  const { doc } = p; const tool = doc.all.find(() => false);
  const t1 = new (Object.getPrototypeOf(p.panel).constructor)('button', { cls: ['fd-tool'], attrs: { 'aria-pressed': 'true' } });
  p.diagram.add(t1);
  const { ctx, win } = tabEngine(p, { pending: true });
  win.lastInputTarget = 'calc'; ctx.tabKey(keyEv('Tab'));
  assert.equal(p.doc.activeElement, t1);
});
test('calculator closed, active run: Tab cycles inside the question area and never reaches the footer emoji', () => {
  for (const mode of ['quiz', 'formula']) {
    const p = page({ mode }); const { ctx } = tabEngine(p);
    const seen = [];
    for (let k = 0; k < 7; k++) { const e = keyEv('Tab'); assert.equal(ctx.tabKey(e), true); assert.ok(e.prevented); seen.push(p.doc.activeElement); }
    assert.ok(seen.every(el => p.panel.contains(el)), mode);
    assert.ok(!seen.includes(p.emoji));
    assert.equal(seen[6], seen[0], 'wraps');
    p.emoji.focus(); ctx.tabKey(keyEv('Tab')); assert.ok(p.panel.contains(p.doc.activeElement), 'focus on the footer comes back in');
  }
});
test('calculator closed, no active run (menus, results, study): Tab is left alone', () => {
  const p = page({ quizActive: false }); const { ctx } = tabEngine(p, { runActive: false });
  const e = keyEv('Tab'); assert.equal(ctx.tabKey(e), false); assert.equal(e.prevented, false);
});
test('dialogs, settings, text fields elsewhere and modifier keys keep normal Tab', () => {
  const p = page(); const { ctx } = tabEngine(p);
  const C = Object.getPrototypeOf(p.panel).constructor;
  const field = new C('input'); p.doc.body.add(new C('div', { id: 'chat' }).add(field)); field.focus();
  assert.equal(ctx.tabKey(keyEv('Tab')), false, 'text field outside the area');
  p.doc.body.add(new C('div', { id: 'settings-modal' })); p.doc.activeElement = p.doc.body;
  assert.equal(ctx.tabKey(keyEv('Tab')), false, 'settings open');
  const p2 = page(); const t2 = tabEngine(p2);
  const C2 = Object.getPrototypeOf(p2.panel).constructor; p2.doc.body.add(new C2('div', { cls: ['modal-overlay', 'show'] }));
  assert.equal(t2.ctx.tabKey(keyEv('Tab')), false, 'modal open');
  const p3 = page(); const t3 = tabEngine(p3);
  for (const m of ['ctrlKey', 'altKey', 'metaKey']) assert.equal(t3.ctx.tabKey(keyEv('Tab', { [m]: true })), false, m);
});

/* formula keys */
function formula({ solved = false, pending = false, calcOwns = false } = {}) {
  const p = page({ mode: 'formula' });
  const state = { picked: [], nexts: 0, backs: 0, locked: solved };
  p.opts.forEach((b, i) => { b.onclick = () => state.picked.push(i); });
  p.next.onclick = () => state.nexts++; p.backB.onclick = () => state.backs++;
  p.backB.disabled = false; p.next.disabled = pending;
  const ctx = { document: p.doc, window: { PT2CalcKeysBlocked: () => calcOwns }, $: id => p.doc.getElementById(id),
    active: () => true, leave: () => {}, pending: () => pending, get locked() { return state.locked; } };
  vm.createContext(ctx);
  vm.runInContext(grabFrom(fp, 'onKey') + grabFrom(fp, 'kbHighlight'), ctx);
  return { p, ctx, state };
}
test('formula: ↑ ↓ highlight, Enter picks the highlighted choice (no letters)', () => {
  const { p, ctx, state } = formula();
  ctx.onKey(Object.assign(keyEv('ArrowDown'), { target: p.panel }));
  ctx.onKey(Object.assign(keyEv('ArrowDown'), { target: p.panel }));
  assert.ok(p.opts[1].classList.contains('kb-hl'));
  assert.equal(p.doc.activeElement, p.opts[1], 'focus ring follows the highlight');
  ctx.onKey(Object.assign(keyEv('ArrowUp'), { target: p.panel })); ctx.onKey(Object.assign(keyEv('ArrowUp'), { target: p.panel }));
  assert.ok(p.opts[3].classList.contains('kb-hl'), 'wraps');
  ctx.onKey(Object.assign(keyEv('Enter'), { target: p.panel })); assert.deepEqual(state.picked, [3]);
  for (const k of ['a', 'B', 'c', 'D']) ctx.onKey(Object.assign(keyEv(k), { target: p.panel }));
  assert.deepEqual(state.picked, [3], 'A-D do nothing');
  ctx.onKey(Object.assign(keyEv('2', { code: 'Numpad2' }), { target: p.panel })); assert.deepEqual(state.picked, [3, 1], 'numbers / numpad unchanged');
  assert.doesNotMatch(grabFrom(fp, 'onKey'), /a-dA-D/);
});
test('formula: Enter / → go Next once solved, from the panel or a clicked choice; ← goes Back', () => {
  const { p, ctx, state } = formula({ solved: true });
  ctx.onKey(Object.assign(keyEv('Enter'), { target: p.panel })); assert.equal(state.nexts, 1);
  ctx.onKey(Object.assign(keyEv('Enter'), { target: p.opts[0] })); assert.equal(state.nexts, 2, 'focused choice does not swallow Enter');
  ctx.onKey(Object.assign(keyEv('ArrowRight'), { target: p.panel })); assert.equal(state.nexts, 3);
  ctx.onKey(Object.assign(keyEv('Enter'), { target: p.next })); assert.equal(state.nexts, 3, 'focused Next: the browser click is the only advance');
  ctx.onKey(Object.assign(keyEv('ArrowLeft'), { target: p.panel })); assert.equal(state.backs, 1);
});
test('formula: Enter before solving never advances; an unfinished diagram blocks Next', () => {
  const a = formula(); a.ctx.onKey(Object.assign(keyEv('Enter'), { target: a.p.panel })); assert.equal(a.state.nexts, 0);
  const b = formula({ solved: true, pending: true });
  b.ctx.onKey(Object.assign(keyEv('Enter'), { target: b.p.panel })); b.ctx.onKey(Object.assign(keyEv('ArrowRight'), { target: b.p.panel }));
  assert.equal(b.state.nexts, 0);
});
test('formula: diagram handles keep their arrows; typing fields are left alone', () => {
  const { p, ctx, state } = formula({ solved: true });
  const C = Object.getPrototypeOf(p.panel).constructor; const h = new C('circle', { cls: ['fd-handle'] }); p.diagram.add(h);
  const e = Object.assign(keyEv('ArrowRight'), { target: h }); ctx.onKey(e); assert.equal(state.nexts, 0); assert.equal(e.prevented, false);
  const inp = new C('input'); p.panel.add(inp);
  ctx.onKey(Object.assign(keyEv('Enter'), { target: inp })); assert.equal(state.nexts, 0);
});
test('formula: while the calculator owns the keys, Enter / numbers / arrows never touch the question', () => {
  const { p, ctx, state } = formula({ solved: true, calcOwns: true });
  for (const k of ['Enter', 'ArrowRight', '1', 'ArrowDown']) ctx.onKey(Object.assign(keyEv(k), { target: p.calcDisplay }));
  assert.equal(state.nexts, 0); assert.deepEqual(state.picked, []);
});
test('wiring: Tab handler runs first (window capture); formula keys use the named handler', () => {
  assert.match(eng, /window\.addEventListener\('keydown', tabKey, true\);/);
  assert.match(fp, /window\.addEventListener\('keydown', onKey\);/);
  // calculator core keeps owning its keys in capture and stops them reaching the quiz
  const core = fs.readFileSync(path.join(root, 'js/vendor/calculator-core.js'), 'utf8');
  assert.match(core, /if\(lastInputTarget!=='calc'\|\|e\.isComposing\|\|e\.defaultPrevented\)return;/);
});

test('Tab key hint shows only while the calculator is open, in every section', () => {
  const html = fs.readFileSync(path.join(root, 'quiz.html'), 'utf8');
  const hints = html.match(/<div class="kbd-hint">.*?<\/div>/g);
  assert.equal(hints.length, 2, 'normal quiz and formulas');
  for (const h of hints) { assert.match(h, /<span class="kbd-calc-only"> · <span class="kbd">Tab<\/span> move focus<\/span>/); assert.doesNotMatch(h, /A–D/); }
  const css = fs.readFileSync(path.join(root, 'css/quiz-pt1.css'), 'utf8');
  assert.match(css, /\.kbd-calc-only\{display:none\}/); assert.match(css, /body\.pt2-calc-shown \.kbd-calc-only\{display:inline\}/);
  // the class follows open / close / view changes
  const calc = fs.readFileSync(path.join(root, 'js/pt2-calculator.js'), 'utf8');
  const cls = new Set(); const w = { style: { display: 'none' } };
  const ctx = { document: { getElementById: id => id === 'calculator-widget' ? w : null, body: { classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c) } } } };
  vm.createContext(ctx); vm.runInContext(grabFrom(calc, 'calcEl') + grabFrom(calc, 'syncCalcShown') + grabFrom(calc, 'syncPressed'), ctx);
  ctx.syncPressed(); assert.ok(!cls.has('pt2-calc-shown'));
  w.style.display = 'block'; ctx.syncPressed(); assert.ok(cls.has('pt2-calc-shown'));
  w.style.display = 'none'; ctx.syncPressed(); assert.ok(!cls.has('pt2-calc-shown'));
  for (const f of ['openCalc', 'closeCalc']) assert.match(grabFrom(calc, f), /syncPressed\(\)/);
  assert.match(calc, /window\.showView = function \(\) \{[\s\S]*?syncPressed\(\);/);
});
test('calculator handoff works in the normal quiz as well (typed answer, choices)', () => {
  const p = page({ mode: 'quiz', calcOpen: true, saq: true }); const { ctx, win } = tabEngine(p);
  win.lastInputTarget = 'calc'; ctx.tabKey(keyEv('Tab')); assert.equal(p.doc.activeElement, p.input);
  ctx.tabKey(keyEv('Tab')); assert.equal(win.lastInputTarget, 'calc'); assert.equal(p.doc.activeElement, p.calcDisplay);
});
