/* The "Disable typing hints" box uses the site's themed tick, not the browser default. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/quiz-pt1.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
const rule = sel => { const i = css.indexOf(sel + '{'); assert.ok(i >= 0, sel); return css.slice(i, css.indexOf('}', i)); };
test('hint checkbox is themed like the select-all ticks and keeps focus and label', () => {
  const base = rule('.pt1q .saq-hint-toggle input');
  assert.match(base, /appearance:none/); assert.match(base, /rgba\(var\(--accent-0-rgb\)/);
  const on = rule('.pt1q .saq-hint-toggle input:checked');
  assert.match(on, /linear-gradient\(135deg,var\(--accent-0\),var\(--accent-1\)\)/);
  assert.match(on, /%230a0e17/, 'same dark tick as .multi-opt.selected');
  assert.match(rule('.pt1q .saq-hint-toggle input:focus-visible'), /outline:2px solid/);
  assert.match(js, /lb\.className='saq-hint-toggle';\s*lb\.innerHTML='<input type="checkbox"><span>Disable typing hints<\/span>';/);
  assert.match(js, /localStorage.setItem\(SAQ_HINTS_KEY, cb.checked\?'1':'0'\)/, 'one shared saved preference');
  assert.equal((js.match(/className='saq-hint-toggle'/g) || []).length, 1, 'built in one place');
});
test('other checkboxes are not restyled', () => {
  assert.match(rule('.pt1q .card-type-only input'), /accent-color:var\(--accent-0\)/);
  assert.doesNotMatch(css, /(^|[}\s])input\[type="checkbox"\]\{[^}]*appearance:none/);
});
