/* PHY90027 step 1 names the drip, so it points to IV infusion (not injection); answers unchanged. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const P = "Type the drip delivery system whose design follows the radius-flow relation in Poiseuille's Law.";
test('bank and bundle: drip prompt, same answers, no injection synonym', () => {
  const q = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8')).bank.A.find(x => x.id === 'PHY90027');
  const s = q.steps[0];
  assert.equal(s.prompt, P); assert.equal(s.answer, 'IV infusion'); assert.deepEqual(s.accept, ['Intravenous infusion', 'IV infusion systems']);
  assert.ok(!JSON.stringify(q.steps).toLowerCase().includes('injection'));
  const b = fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8');
  assert.ok(b.includes(JSON.stringify({ id: '1', type: 'saq', prompt: P, answer: 'IV infusion', accept: ['Intravenous infusion', 'IV infusion systems'] })));
  assert.ok(!b.includes("Type the delivery system whose design follows"));
});
