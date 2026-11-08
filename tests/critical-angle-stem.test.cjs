/* PHY90021 asks for the name of the angle, says it is the angle of incidence and that the refracted ray is at 90° to the normal. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const STEM = 'What is the name of the angle of incidence in the denser medium for which the refracted ray, passing into the less optically dense medium, travels at 90° to the normal?';
test('bank and bundle: new stem, same answers, no answer leak', () => {
  const q = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8')).bank.A.find(x => x.id === 'PHY90021');
  assert.equal(q.q, STEM); assert.equal(q.answer, 'Critical angle'); assert.deepEqual(q.accept, ['critical angle', 'θc']);
  assert.equal(q.lawPanel, 'criticalAngle'); assert.doesNotMatch(q.q, /critical/i);
  const b = fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8');
  assert.ok(b.includes('"id":"PHY90021","type":"saq","cat":"Mixed Chapters: Linking and Short Answers","q":' + JSON.stringify(STEM) + ',"answer":"Critical angle"'));
  assert.ok(!b.includes('Which angle makes the refracted ray'));
});

test('PHY50100 also asks for the name of the angle of incidence', () => {
  const S = 'What is the name of the angle of incidence at which the angle of refraction is 90° to the normal when light passes from an optically denser to an optically rarer medium?';
  const q = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8')).bank.A.find(x => x.id === 'PHY50100');
  assert.equal(q.q, S); assert.equal(q.answer, 'Critical angle'); assert.doesNotMatch(q.q, /critical/i);
  const b = fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8');
  assert.ok(b.includes('"q":' + JSON.stringify(S))); assert.ok(!b.includes('Which angle gives an angle of refraction'));
});

test('PHY90020 asks for the name of the quantity n = c / v', () => {
  const S = 'What is the name of the quantity defined as the speed of light in vacuum divided by its speed in a medium?';
  const q = JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/pt2.json'), 'utf8')).bank.A.find(x => x.id === 'PHY90020');
  assert.equal(q.q, S); assert.equal(q.answer, 'Index of refraction');
  assert.deepEqual(q.accept, ['index of refraction', 'Refractive index', 'refractive index', 'n']);
  assert.doesNotMatch(q.q, /index|refract/i);
  const b = fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8');
  assert.ok(b.includes('"q":' + JSON.stringify(S))); assert.ok(!b.includes('Which ratio is light speed'));
});
