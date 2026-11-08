/* Chapter 4 temperature-scales diagram shows unitless values; scale names stay as label answers. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const ROWS = [['373.15', '100', '212'], ['310.15', '37', '98.6'], ['273.16', '0.01', '32.02'], ['273.15', '0', '32'], ['0', '−273.15', '−459.67']];
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data/bundle.js'), 'utf8').replace(/^window\.studyBundle = /, '').replace(/;\s*$/, ''));
for (const [name, bank] of [['bank file', JSON.parse(fs.readFileSync(path.join(root, 'banks/medphys/diagrams.json'), 'utf8'))], ['offline bundle', bundle['banks/medphys/diagrams.json']]]) {
  test(name + ': CH4_TEMP rows show K / C / F values without units', () => {
    const q = bank.bank.A.find(x => x.id === 'CH4_TEMP');
    const texts = [...q.svg.matchAll(/<text x="(\d+)" y="(\d+)"[^>]*font-size="11\.5"[^>]*>([^<]*)<\/text>/g)].map(m => ({ x: +m[1], y: +m[2], t: m[3] }));
    assert.equal(texts.length, 15);
    ROWS.forEach((row, r) => row.forEach((v, c) => {
      const t = texts[r * 3 + c]; assert.equal(t.t, v); assert.equal(t.x, [290, 410, 530][c]);
    }));
    for (const t of texts) assert.doesNotMatch(t.t, /[°KCF]/, 'no units');
    assert.doesNotMatch(q.svg, />\s*(Kelvin|Celsius|Fahrenheit)\s*</, 'scale names not prefilled');
    assert.deepEqual(q.labels.map(l => l.answer), ['Kelvin', 'Celsius', 'Fahrenheit']);
    for (const t of texts) assert.ok(t.y > 60, 'values sit below the label slots');
    // readable: dark text on opaque bars that cover the column outlines
    assert.equal((q.svg.match(/font-size="11\.5" font-weight="700"/g) || []).length, 15);
    assert.equal((q.svg.match(/fill="var\(--col-bg-main,#0d0d0d\)" font-family="Outfit,sans-serif" font-size="11\.5"/g) || []).length, 15);
    assert.equal((q.svg.match(/width="92" height="20" rx="5" fill="var\(--accent-\d\)"/g) || []).length, 15);
    assert.doesNotMatch(q.svg, /width="92" height="20" rx="5" fill="rgba/);
    assert.ok(q.svg.indexOf('width="28"') < q.svg.indexOf('width="92"'), 'columns painted before bars');
    // values agree with the study notes (same numbers, notes carry units)
    const notes = fs.readFileSync(path.join(root, 'content/medphys/pt2/chapter-4.md'), 'utf8');
    for (const v of ROWS.flat()) assert.ok(notes.includes('>' + v + ' '), v);
    // physics: rows are consistent conversions
    for (const [k, c, f] of ROWS.map(r => r.map(x => +x.replace('−', '-')))) {
      assert.ok(Math.abs(k - c - 273.15) < 0.011); assert.ok(Math.abs(f - (c * 9 / 5 + 32)) < 0.011);
    }
  });
}
