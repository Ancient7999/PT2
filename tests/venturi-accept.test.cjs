/* PHY30076: "Venturi" alone is accepted (the stem already says mask); nothing looser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/quiz-engine.js'), 'utf8');
const bankQ = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8')).bank.A.find(q => q.id === 'PHY30076');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('\nfunction saqNorm('), src.indexOf('\n', src.indexOf('\nfunction saqMatches(') + 1)), ctx);
test('bank and bundled copy agree', () => {
  assert.equal(bankQ.answer, 'Venturi mask'); assert.deepEqual(bankQ.accept, ['Venturi']);
  const b = fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8');
  assert.ok(b.includes('"id":"PHY30076","type":"saq"') && b.includes('"answer":"Venturi mask","accept":["Venturi"],"explain":"The Venturi mask'));
});
test('Venturi and Venturi mask accepted, case as before; misspellings rejected', () => {
  for (const t of ['Venturi mask', 'venturi mask', 'Venturi', 'venturi', ' VENTURI ']) assert.ok(ctx.saqMatches(bankQ, t), t);
  for (const t of ['Ventury', 'Venturi mas', 'Venture', 'Ventri', 'mask', 'Venturi tube', '']) assert.ok(!ctx.saqMatches(bankQ, t), t);
});
