/* Disabling the Pomodoro timer hides only the timer; quotes follow their own Hide quotes setting. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'quiz.html'), 'utf8'), pt2css = fs.readFileSync(path.join(root, 'css/pt2.css'), 'utf8');
const css = (html + '\n' + pt2css).replace(/\/\*[\s\S]*?\*\//g, '');
const rulesFor = sel => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(m => m[1].split(',').map(x => x.trim()).includes(sel)).map(m => m[2]);
const hides = sel => rulesFor(sel).some(b => /display:\s*none/.test(b));
test('timer off hides the countdown and reset, never the quote or its author', () => {
  assert.ok(hides('.timer-dock.is-pomo-off #globalTimerDisplay')); assert.ok(hides('html.pt2-pomo-off #globalTimerDisplay'));
  assert.ok(hides('.timer-dock.is-pomo-off #timerResetBtn'));
  for (const sel of ['.timer-dock.is-pomo-off .timer-copy', '.timer-dock.is-pomo-off #globalTimerMode', '.timer-dock.is-pomo-off #globalTimerAuthor', 'html.pt2-pomo-off #globalTimerMode', 'html.pt2-pomo-off .timer-copy'])
    assert.ok(!hides(sel), sel);
  assert.ok(!rulesFor('.timer-dock.is-pomo-off').some(b => /width:auto/.test(b)), 'the dock keeps its size while the quote shows');
});
test('Hide quotes still hides them, and with the timer also off the dock shrinks to the emoji', () => {
  assert.ok(hides('html.pt2-hide-quotes #globalTimerMode')); assert.ok(hides('html.pt2-hide-quotes #globalTimerAuthor'));
  assert.ok(hides('html.pt2-hide-quotes .timer-dock.is-pomo-off .timer-copy'));
  assert.ok(rulesFor('html.pt2-hide-quotes .timer-dock.is-pomo-off').some(b => /width:auto/.test(b)));
});
test('the two settings are separate saved prefs, applied on reload', () => {
  const src = fs.readFileSync(path.join(root, 'js/pt2-offline.js'), 'utf8');
  assert.match(src, /\{ id: 'pt2PomoOff', key: 'pt2_pomo_disabled', cls: 'pt2-pomo-off' \}/);
  assert.match(src, /\{ id: 'pt2HideQuotes', key: 'pt2_hide_quotes', cls: 'pt2-hide-quotes' \}/);
  // reload: each class follows only its own key
  const cls = new Set(), ls = { pt2_pomo_disabled: '1', pt2_hide_quotes: '0' };
  const root2 = { classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c), add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, getAttribute: () => null, setAttribute() {} };
  const ctx = { document: { documentElement: root2, getElementById: () => null, addEventListener() {}, dispatchEvent() {} }, localStorage: { getItem: k => ls[k] ?? null, setItem: (k, v) => { ls[k] = v; }, removeItem: k => { delete ls[k]; } },
    CustomEvent: function () {}, MutationObserver: function () { this.observe = () => {}; }, addEventListener() {}, dispatchEvent() {}, navigator: {}, location: { protocol: 'https:' } };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  try { vm.runInContext(src, ctx); } catch (e) {}
  assert.ok(cls.has('pt2-pomo-off')); assert.ok(!cls.has('pt2-hide-quotes'));
});
test('turning the timer back on starts one interval only; turning it off clears it', () => {
  const i = html.indexOf('function setPomodoroEnabled(on, opts){'), body = html.slice(i, html.indexOf('\n}\n', i));
  assert.match(body, /if\(pomodoroEnabled\)\{\n\s*if\(!timerInterval\) startGlobalTimer\(\);\n\s*\} else \{\n\s*stopGlobalTimer\(\);/);
  assert.match(html, /function stopGlobalTimer\(\)\{\n\s*if\(timerInterval\)\{ clearInterval\(timerInterval\); timerInterval = null; \}/);
});
