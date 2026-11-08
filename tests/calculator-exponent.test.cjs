/* Calculator: an exponent ends at the next + − × ÷ (as shown on screen), so 2.2×10⁹×1000 is 2.2 × 10¹², not ∞.
   Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/vendor/calculator-core.js'), 'utf8');
function fn(name) {
  const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name);
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); }
}
const ctx = { S: { vars: { x: 0, y: 0, z: 0 }, lastAns: 0, angleMode: 'DEG' }, Math };
vm.createContext(ctx);
vm.runInContext(src.match(/const FRAC_OPEN=[^;]*;/)[0] + ['toRad', 'fromRad', 'findFracParts', 'findRadParts', 'parseExponents', 'evaluate', 'exprToUnicode', 'findSupEnd'].filter(n => src.includes('function ' + n + '(')).map(fn).join('\n') + ';this.ev=evaluate;this.pe=parseExponents;this.uni=exprToUnicode;', ctx);
const val = e => { const r = ctx.ev(e); return r && r.val; };
const close = (a, b) => assert.ok(Math.abs(a - b) <= Math.abs(b) * 1e-12, a + ' ≈ ' + b);

test('the reported expression: 2.2×10⁹×1000 = 2.2 × 10¹²', () => {
  // ^ key (Shift+6 or the xʸ button): what the calculator stores for 2.2×10⁹×1000
  close(val('2.2×10^9×1000'), 2.2e12);
  assert.equal(ctx.uni('2.2×10^9×1000'), '2.2×10⁹×1000', 'the screen shows the same expression');
  assert.equal(ctx.ev('2.2×10^9×1000').disp, '2200000000000');
  // ×10ⁿ button: ×10^( … ) then → out of the exponent
  close(val('2.2×10^(9)×1000'), 2.2e12);
});
test('exponent ends at + − × ÷ like the display; brackets and negation stay inside', () => {
  close(val('10^9÷1000'), 1e6);
  close(val('3×10^8÷1.5'), 2e8);
  close(val('10^2+5'), 105); close(val('10^2−5'), 95);
  close(val('2^3×2'), 16);
  close(val('10^(9×2)'), 1e18, 'brackets keep a product in the exponent');
  close(val('10^⁻3×2'), 2e-3, 'negation (⁻) starts the exponent');
  close(val('1.5×10^⁻4×2×10^3'), 0.3);
  close(val('2^3^2'), 512, 'right-associative tower unchanged');
  close(val('5×10^3+2×10^2'), 5200);
});
test('normal arithmetic is unchanged', () => {
  close(val('2+3×4'), 14); close(val('(2+3)×4'), 20); close(val('10÷4'), 2.5); close(val('7−10'), -3);
  close(val('3²×2'), 18);
});
test('a real overflow is still reported as ∞', () => {
  const r = ctx.ev('10^400'); assert.equal(r.val, Infinity); assert.equal(r.disp, '∞');
  assert.equal(ctx.ev('10^(9×1000)').disp, '∞', 'a product written inside brackets is honoured');
});
