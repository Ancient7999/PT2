const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { window: {} }; require('vm').runInNewContext(rd('data/bundle.js'), ctx); const B = ctx.window.studyBundle;
const J = f => JSON.parse(rd(f));
test('0.47 is the newest release with exactly the two lines', () => {
  const c = {}; require('vm').runInNewContext(rd('js/app-info.js') + ';this.A=APP_INFO', c);
  assert.equal(c.A.releases[0].version, '0.47');
  assert.deepEqual(Array.from(c.A.releases[0].changes), ['Enhanced user experience.', 'Finalized Medical Physics section.']);
  assert.ok(!c.A.releases.some(r => r.version === '0.462'));
});
test('Medical Physics: no draft flag anywhere (cards, diagrams, formulas, material); other subjects untouched', () => {
  for (const f of ['banks/medphys/pt2.json', 'banks/medphys/diagrams.json']) { assert.doesNotMatch(rd(f), /"draft": true/, f); assert.deepEqual(B[f], J(f), f + ' bundle'); }
  const cat = J('data/catalog.json'); assert.deepEqual(B['data/catalog.json'], cat);
  const m = cat.subjects.flatMap(s => s.materials).find(x => x.id === 'medphys-pt2');
  assert.ok(!m.draft && !(m.formulas && m.formulas.draft));
});
test('Study Interface: Mixed summary right after Chapter 6, offline, definitions/units/uses only', () => {
  const m = J('data/catalog.json').subjects.flatMap(s => s.materials).find(x => x.id === 'medphys-pt2');
  assert.deepEqual(m.study.chapters.map(c => c.id), ['ch3', 'ch4', 'ch5', 'ch6', 'mixed']);
  const md = rd('content/medphys/pt2/mixed.md'); assert.equal(B['content/medphys/pt2/mixed.md'], md);
  for (const h of ['Units at a glance', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6']) assert.ok(md.includes(h), h);
  assert.match(md, /\| Viscosity \| η \| pascal-second.*\| poise/); assert.match(md, /dyne\/cm/);
  assert.match(md, /Q = ρAv \(also ṁ\)/); assert.match(md, /\\\(Q_V = A v\\\) \| m³\/s/);
  for (const lit of ['\\(Q_V = \\pi r^4 \\Delta P / (8 \\eta L)\\)', 'Q = ρ\\(Q_V\\)', '(\\(n_1 > n_2\\)), the angle of incidence, measured from the normal']) assert.ok(md.includes(lit), lit);
  assert.doesNotMatch(md, /343 m\/s|\| Loudness \||\| Pitch \||\| Blood, air/);
  assert.doesNotMatch(md, /\| Cornea \|[^\n]*\| D \|/, 'an organ has no unit');
  assert.doesNotMatch(md, /\| Ultrasound imaging \|[^\n]*\| MHz \|/);
  assert.match(md, /steady, incompressible, non-viscous flow[^|]*at equal height/);
  assert.match(md, /steady incompressible flow/); assert.match(md, /Laplace's law \(sphere\) \| For a spherical surface such as an alveolus, P = 2T \/ r/);
  assert.match(md, /no net heat flow/); assert.match(md, /change in the speed of light[^|]*usually changes its direction/);
  assert.match(md, /\| Snell's law \| At a boundary, the product/);
  assert.ok(md.includes('| Term | Definition | Unit | Uses |'));
  for (const lit of ['\\(Q_V = \\pi r^4 \\Delta P / (8 \\eta L)\\)', 'Q = ρ\\(Q_V\\)', '(\\(n_1 > n_2\\)), the angle of incidence, measured from the normal', '| Term | Definition | Unit | Uses |', 'no net heat flow', "Laplace's law (sphere) | For a spherical surface such as an alveolus, P = 2T / r", 'steady incompressible flow', "| Snell's law | At a boundary, the product"]) assert.ok(md.includes(lit), lit);
  assert.match(md, /steady, incompressible, non-viscous flow[^|]*at equal height/); assert.match(md, /change in the speed of light[^|]*usually changes its direction/);
  assert.doesNotMatch(md, /343 m\/s|\| Loudness \||\| Pitch \||\| Blood, air/);
  assert.doesNotMatch(md, /\| Cornea \|[^\n]*\| D \|/, 'an organ has no unit'); assert.doesNotMatch(md, /\| Ultrasound imaging \|[^\n]*\| MHz \|/);
  assert.doesNotMatch(md, /```example|^#+ .*(Worked|Practice)|<input|<button/im);
});
test('t114: numeric recall of sound speeds / refractive indices removed; given-value questions kept', () => {
  for (const f of ['banks/medphys/pt2.json']) for (const bank of [J(f), B[f]]) {
    const ids = new Set(bank.bank.A.map(q => q.id));
    for (const id of ['PHY40017', 'PHY40018', 'PHY40081', 'PHY50068', 'PHY60014']) assert.ok(!ids.has(id), id);
    for (const id of ['PHY40010', 'PHY40013', 'PHY40015', 'PHY40016', 'PHY40066', 'PHY50017', 'PHY50020', 'PHY50027', 'PHY50089', 'PHY40012', 'PHY50018']) assert.ok(ids.has(id), id);
  }
});
