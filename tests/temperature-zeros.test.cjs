/* Medical Physics temperature questions: no trailing ".0" on whole numbers. Run with node --test tests/*.test.cjs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const fileBank = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8').replace(/^window\.studyBundle = /, '').replace(/;\s*$/, ''));
for (const [name, bank] of [['bank file', fileBank], ['offline bundle', bundle['banks/medphys/pt2.json']]]) {
  test(name + ': temperature questions show whole numbers without trailing zeros', () => {
    const temp = bank.bank.A.filter(q => /°[CF]|Fahrenheit|Celsius|kelvin/i.test(JSON.stringify(q)));
    for (const q of temp) for (const s of [q.q, q.explain || ''].concat(q.options || []))
      assert.doesNotMatch(s, /(?<![\d.])\d+\.0+(?!\d)\s*°?[CFK]?/, q.id + ': ' + s);
    const a = bank.bank.A.find(q => q.id === 'PHY40048');
    assert.equal(a.q, 'Normal body temperature is 37°C. What is this in degrees Fahrenheit?');
    assert.deepEqual(a.options, ['98.6 °F', '100.4 °F', '95 °F', '104 °F']); assert.equal(a.options[a.correct], '98.6 °F');
    const b = bank.bank.A.find(q => q.id === 'PHY40044');
    assert.deepEqual(b.options, ['102.2 °F', '99 °F', '107.6 °F', '93.2 °F']); assert.equal(b.options[b.correct], '102.2 °F');
  });
}
test('temperature generator already trims zeros (fmtSci)', () => {
  const src = fs.readFileSync(path.join(root, 'js/formula-gen-pt2.js'), 'utf8');
  assert.match(src, /toFixed\(d\)\.replace\(\/\\\.\?0\+\$\/, ''\)/);
});
