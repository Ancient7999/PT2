/* Study Skills mixed linking bank (Lectures 5–10). Run with node --test tests/*.test.cjs. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const J = f => JSON.parse(rd(f));
const ctx = { window: {} }; require('vm').runInNewContext(rd('data/bundle.js'), ctx);
const B = ctx.window.studyBundle;
const BANK = 'banks/studyskills/pt2/mixed-5-10.json';

test('catalog lists the Study Skills mixed card after Lecture 10 and the bundle matches the files', () => {
  const cat = J('data/catalog.json');
  assert.deepEqual(B['data/catalog.json'], cat);
  const m = cat.subjects.flatMap(s => s.materials).find(x => x.id === 'studyskills-pt2');
  assert.ok(m, 'Study Skills material');
  const ids = m.lectures.map(l => l.id);
  const i10 = ids.indexOf('lec10'), im = ids.indexOf('mixed-studyskills-lec5-10');
  assert.ok(i10 >= 0 && im === i10 + 1, 'mixed card immediately after lec10, got ' + ids.join(','));
  const lec = m.lectures[im];
  assert.equal(lec.title, 'Mixed Study Skills – Lectures 5 to 10');
  assert.equal(lec.bank, BANK);
  assert.equal(lec.status, 'ready');
  assert.deepEqual(B[BANK], J(BANK));
});

test('mixed bank is 46 unique matching questions with engine-ready pairs and no id collisions', () => {
  const bank = J(BANK);
  assert.equal(bank.id, 'mixed-studyskills-lec5-10');
  assert.equal(bank.subject, 'Study Skills');
  assert.equal(bank.subjectId, 'study_skills');
  assert.equal(bank.title, 'Mixed Study Skills – Lectures 5 to 10');
  assert.deepEqual(bank.forms, ['A']);
  const qs = bank.bank.A;
  assert.equal(qs.length, 46);
  assert.equal(bank.formSize, 46);
  const ids = qs.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids in mixed bank');
  const others = [];
  const ssDir = path.join(root, 'banks/studyskills/pt2');
  for (const f of fs.readdirSync(ssDir)) {
    if (f === 'mixed-5-10.json' || !f.endsWith('.json')) continue;
    for (const form of Object.values(J(path.join('banks/studyskills/pt2', f)).bank || {})) {
      if (Array.isArray(form)) form.forEach(q => others.push(q.id));
    }
  }
  const collide = ids.filter(id => others.includes(id));
  assert.deepEqual(collide, [], 'ids collide with existing Study Skills questions');
  for (const q of qs) {
    assert.equal(q.type, 'matching', q.id);
    const L = q.leftItems, R = q.rightItems, P = q.correct_pairs;
    assert.ok(Array.isArray(L) && L.length >= 2, q.id + ' leftItems');
    assert.ok(Array.isArray(R) && R.length >= 2, q.id + ' rightItems');
    assert.ok(P && typeof P === 'object' && !Array.isArray(P), q.id + ' correct_pairs');
    const lids = new Set(L.map(x => String(x.id)));
    const rids = new Set(R.map(x => String(x.id)));
    assert.equal(lids.size, L.length, q.id + ' unique left ids');
    for (const lid of lids) {
      assert.ok(lid in P, q.id + ' missing pair for ' + lid);
      assert.equal(typeof P[lid], 'string', q.id + ' pair must be one right id');
      assert.ok(rids.has(P[lid]), q.id + ' pair points at unknown right ' + P[lid]);
    }
  }
});
