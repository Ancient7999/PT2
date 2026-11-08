/**
 * Formula practice screen (port of the Med Physics PT1 site's formula mode).
 * A material opts in with "formulas": { "gen": "Pt2FormulaGen", "key": "medphys/pt2", "title": "..." }
 * in data/catalog.json. The sets then shows a "Formulas" section with one card.
 * Flow (same as PT1): generated multiple-choice item; a wrong answer greys that option and
 * shows the formula, then more working on each further wrong answer; "Show formula" reveals
 * it on request. Next generates a question from the least-answered formula; Back
 * reviews this session. Relevant solved questions reveal an interactive ray sketch.
 * Counts are kept per material in localStorage (fp_count:<key>, fp_family:<key>).
 */
(function () {
  'use strict';
  let cfg = null, gen = null, q = null, keys = [], curKey = '', wrong = 0, hintLevel = 0, locked = false;
  let bankQueue = [], bankKeys = [], clock = null, started = 0, diagram = null, history = [], historyIndex = -1;

  const $ = id => document.getElementById(id);
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function countKey() { return 'fp_count:' + cfg.key; }
  function familyKey() { return 'fp_family:' + cfg.key; }
  function total() { const n = parseInt(ls(countKey()) || '0', 10); return n > 0 ? n : 0; }
  function families() { try { return JSON.parse(ls(familyKey()) || '{}') || {}; } catch (e) { return {}; } }
  function famCount(k) { const m = families(); return (m[k] && m[k].total) || 0; }
  function famTitle(k) { const md = (gen && gen.FORMULA_METADATA[k]) || bankNames()[k]; return (md && md.name) || k || 'Formulas'; }
  /* Calculation questions from the bank, registered per chapter with "formula": {chapter, key}. */
  function bankSource() { return (window.StudyQuiz && typeof StudyQuiz.formulaBank === 'function') ? StudyQuiz.formulaBank() : { questions: [], names: {} }; }
  function bankNames() { return bankSource().names || {}; }
  function bankFor(chId) { return chId ? bankSource().questions.filter(b => b.formula && b.formula.chapter === chId) : []; }
  /* formulas on a chapter card: generated ones plus bank-only ones */
  function formulaCount(ch) { const ks = ch.keys.slice(); bankFor(ch.id).forEach(b => { if (ks.indexOf(b.formula.key) < 0) ks.push(b.formula.key); }); return ks.length; }
  function fromBank(b) {
    const key = b.formula.key, md = (gen && gen.FORMULA_METADATA[key]) || bankNames()[key] || {};
    const order = b.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { id: b.__id || b.id, bankId: b.id, q: b.q, options: order.map(i => b.options[i]), correct: order.indexOf(b.correct),
      explain: b.explain || '', formulaKey: key, formulaEq: md.description || '', _formulaVariant: 'bank',
      // registered optics givens: the same drawing task as generated questions
      formulaDiagram: b.formula.diagram ? { kind: b.formula.diagram.kind, values: Object.assign({}, b.formula.diagram.values), target: b.formula.diagram.target, precision: b.formula.diagram.precision } : undefined,
      answerValue: b.formula.diagram ? b.formula.diagram.answerValue : undefined };
  }
  function bump(k, variant) {
    const m = families(); if (!m[k]) m[k] = { total: 0, byVariant: {} };
    m[k].total++; const vk = String(variant == null ? 0 : variant); m[k].byVariant[vk] = (m[k].byVariant[vk] || 0) + 1;
    ls(familyKey(), JSON.stringify(m)); ls(countKey(), String(total() + 1));
  }
  function leastKey() {
    const m = families(); let min = Infinity;
    keys.forEach(k => { const t = (m[k] && m[k].total) || 0; if (t < min) min = t; });
    const c = keys.filter(k => (((m[k] && m[k].total) || 0) === min));
    return c[Math.floor(Math.random() * c.length)] || keys[0];
  }
  function configFor(mat) { return mat && mat.formulas && window[mat.formulas.gen] ? mat.formulas : null; }

  /* —— set cards — one per PT2 chapter —— */
const PT2_CHAPTERS = [
  { id: 'ch3', title: 'Chapter 3', subtitle: 'Fluids · rheology · surface tension',
    keys: ['continuity','massFlow','bernoulli','viscosity','poiseuille','laplaceCylinder','wallStress','reynolds','surfaceTension','alveolus'] },
  { id: 'ch4', title: 'Chapter 4', subtitle: 'Waves · sound · temperature',
    keys: ['waveSpeed','periodFreq','soundSpeed','dopplerSource','mach','tempConvert'] },
  { id: 'ch5', title: 'Chapter 5', subtitle: 'Ray optics',
    keys: ['refractiveIndex','snell','criticalAngle'] },
  { id: 'ch6', title: 'Chapter 6', subtitle: 'Optical instruments',
    keys: ['mirrorFocal','thinLens','magnification','lensPower','powerSum','separatedLenses','simpleMagnifier'] }
];

function appendSetsSection(host) {
  const mat = window.__activeMaterial; const c = mat && mat.formulas;
  if (!c) return;
  cfg = c; gen = window[c.gen] || null;
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:12px;margin-bottom:8px';
  const h = document.createElement('div'); h.className = 'section-h'; h.textContent = 'Formulas';
  const desc = document.createElement('div'); desc.className = 'card-desc-formula'; desc.textContent = 'Unlimited practice with formula hints';
  desc.style.margin = '0';
  header.appendChild(h);
  header.appendChild(desc);
  host.appendChild(header);
  const grid = document.createElement('div'); grid.className = 'grid';

  if (!gen) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'card formula-card'; btn.disabled = true;
    btn.innerHTML = '<div class="card-top"><span class="form-letter">Formulas</span></div><div class="card-desc-formula">Generator failed to load</div>';
    grid.appendChild(btn);
  } else {
    PT2_CHAPTERS.forEach(ch => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'card formula-card';
      btn.dataset.card = 'formulas-' + ch.id;
      const extraBadge = (ch.id === 'ch3')
        ? '<span class="card-badge note-badge amber" title="Told not to be on the exam">Off-exam</span>'
        : '';
      const badgeHtml = extraBadge ? '<div class="card-badges">' + extraBadge + '</div>' : '';
      const titleWithBadge = '<span class="form-letter">' + ch.title + '</span>' +
  (extraBadge ? '<span class="card-badge note-badge amber" title="Told not to be on the exam" style="margin-left:8px">Off-exam</span>' : '');

btn.innerHTML = '<div class="card-top">' + titleWithBadge + '</div>' +
  '<div class="card-sub">' + formulaCount(ch) + ' formulas' + (bankFor(ch.id).length ? ' · ' + bankFor(ch.id).length + ' bank questions' : '') + ' · ' + ch.subtitle + '</div>' +
  '<div class="card-stats"><div class="card-pct">' + total() + ' answered</div></div>';
      btn.addEventListener('click', () => start(ch.keys, ch.id));
      grid.appendChild(btn);
    });
  }
  host.appendChild(grid);
}

  /* —— run —— */
  function start(ks, chId) {
    bankQueue = bankFor(chId).slice();
    bankKeys = bankQueue.map(b => b.formula.key).filter((k, i, a) => a.indexOf(k) === i);
    const mat = window.__activeMaterial; const c = configFor(mat); if (!c) return;
    cfg = c; gen = window[c.gen];
    keys = (ks && ks.length) ? ks.slice() : gen.allKeys();
    history = []; historyIndex = -1;
    $('formulaTitle').textContent = (c.title || 'Formulas');
    started = Date.now(); clearInterval(clock);
    clock = setInterval(() => { const e = Math.floor((Date.now() - started) / 1000); $('formulaElapsed').textContent = String(Math.floor(e / 60)).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0'); }, 1000);
    $('formulaElapsed').textContent = '00:00';
    if (typeof showView === 'function') showView('formulaView');
    next(false);
  }
  function next(random) {
    wrong = 0; hintLevel = 0; locked = false;
    saveDrawing(); q = bankQueue.length ? fromBank(bankQueue.shift()) : random ? gen.generateQuestion(keys) : gen.generateQuestion([leastKey()]);
    history = history.slice(0, historyIndex + 1);
    history.push({ question: q, solved: false, drawing: null, credited: false }); historyIndex++;
    curKey = q.formulaKey;
    render();
  }
  function back() {
    if (historyIndex <= 0) return;
    saveDrawing();
    const entry = history[--historyIndex]; q = entry.question; locked = entry.solved;
    wrong = 0; hintLevel = 0; curKey = q.formulaKey; render();
  }
  function solvedUI() {
    const btns = document.querySelectorAll('#formulaOptions .opt');
    btns.forEach((b, k) => { b.disabled = true; if (k === q.correct) b.classList.add('correct'); });
    const fb = $('formulaFeedback'); fb.className = 'feedback good'; fb.textContent = '✓ ' + (q.explain || ''); if (typeof renderMathIn === 'function') renderMathIn(fb);
    if (diagram) diagram.show();
    $('formulaWorkspace').classList.toggle('has-diagram', !!diagram);
    gateNext();
  }
  /* A question with a diagram counts once the drawing is complete; Next waits for it. */
  function pending() { return !!(locked && diagram && !diagram.done); }
  function gateNext() {
    const b = $('formulaRollBtn'); b.disabled = pending();
    b.title = b.disabled ? 'Finish the diagram to continue' : '';
  }
  function saveDrawing() { if (diagram && history[historyIndex]) history[historyIndex].drawing = diagram.getState(); }
  function credit() {
    const entry = history[historyIndex]; if (!entry || entry.credited) return;
    entry.credited = true;
    bump(q.formulaKey, q._formulaVariant);
    if (window.PT2Unlocks && PT2Unlocks.formulaSolved && cfg) PT2Unlocks.formulaSolved(cfg.key);
    chrome();
  }
  function drawingDone() {
    saveDrawing(); gateNext(); credit();
    const panel = $('formulaPanel'); panel.classList.add('correct-pulse'); setTimeout(() => panel.classList.remove('correct-pulse'), 650);
    if (typeof spawnConfetti === 'function') { try { spawnConfetti(); } catch (e) {} }
  }
  function render() {
    if (diagram) diagram.destroy();
    const entry = history[historyIndex];
    diagram = window.FormulaDiagram ? FormulaDiagram.mount($('formulaDiagram'), q, drawingDone, entry && entry.drawing) : null;
    $('formulaDiagram').hidden = true;
    $('formulaWorkspace').classList.remove('has-diagram');
    $('formulaBackBtn').disabled = historyIndex <= 0;
    $('formulaQText').textContent = q.q;
    const opts = $('formulaOptions'); opts.innerHTML = '';
    q.options.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.key = String.fromCharCode(65 + i);
      b.textContent = o; b.addEventListener('click', () => select(i)); opts.appendChild(b);
    });
    const fb = $('formulaFeedback'); fb.className = 'feedback idle'; fb.textContent = '';
    $('formulaHintBox').classList.remove('show');
    setShowUsed(false);
    if (locked) solvedUI(); else gateNext();
    chrome();
  }
  function chrome() {
    const strip = $('formulaFamilyStrip'); strip.innerHTML = '';
    // bank-only formulas (no generator) are listed too, but never generated
    keys.concat(bankKeys.filter(k => keys.indexOf(k) < 0)).forEach(k => {
      const s = document.createElement('span'); s.className = 'ff-title' + (k === curKey ? ' active' : '');
      const n = famCount(k); s.textContent = famTitle(k) + ' ' + n; s.title = famTitle(k) + ' · ' + n + ' answered';
      strip.appendChild(s);
    });
    $('formulaStatus').textContent = 'Formulas · ' + famTitle(curKey) + ' · ' + famCount(curKey) + ' answered · total ' + total();
  }
  function hintText(level) {
    const lines = [q.formulaHint || q.formulaEq || ''];
    if (q.formulaMap && q.formulaMap.length) { lines.push(''); q.formulaMap.forEach(l => lines.push(l)); }
    if (q.formulaPlugIn) { lines.push(''); lines.push(q.formulaPlugIn); }
    const steps = (q.formulaSteps || []).filter(x => x !== q.formulaHint);
    if (level >= 2 && steps.length) { lines.push(''); steps.slice(0, Math.min(steps.length, level - 1)).forEach(s => lines.push(s)); }
    return lines.join('\n');
  }
  function reveal(level) {
    hintLevel = Math.max(hintLevel, level | 0);
    $('formulaHintText').textContent = hintText(hintLevel);
    $('formulaHintBox').classList.add('show');
    setShowUsed(true);
  }
  function setShowUsed(u) { const b = $('formulaShowBtn'); b.disabled = !!u; b.classList.toggle('used', !!u); }
  function select(i) {
    if (locked || !q) return;
    const btns = document.querySelectorAll('#formulaOptions .opt'); const fb = $('formulaFeedback');
    if (i !== q.correct) {
      const b = btns[i]; if (b) { b.disabled = true; b.classList.add('wrong', 'soft-wrong'); setTimeout(() => b.classList.remove('soft-wrong'), 480); }
      fb.className = 'feedback soft'; fb.textContent = 'Not that one. Try again.';
      wrong++; reveal(wrong);
      if (window.StudyAchievements && typeof StudyAchievements.recordWrong === 'function') StudyAchievements.recordWrong();
      return;
    }
    locked = true;
    history[historyIndex].solved = true;
    solvedUI();
    const panel = $('formulaPanel'); panel.classList.add('correct-pulse'); setTimeout(() => panel.classList.remove('correct-pulse'), 650);
    if (typeof spawnConfetti === 'function') { try { spawnConfetti(); } catch (e) {} }
    if (!diagram) credit(); else chrome();
  }
  function active() { const v = $('formulaView'); return !!(v && v.classList.contains('active')); }
  function leave() {
    clearInterval(clock);
    if (diagram) diagram.destroy(); diagram = null; q = null;
    $('formulaOptions').innerHTML = ''; $('formulaFeedback').className = 'feedback idle'; $('formulaFeedback').textContent = '';
    $('formulaWorkspace').classList.remove('has-diagram');
    if (window.StudyQuiz && StudyQuiz.renderSets) StudyQuiz.renderSets();
    if (typeof showView === 'function') showView('setsView');
  }

  function wire() {
    $('formulaShowBtn').addEventListener('click', () => { if (q && !$('formulaShowBtn').disabled) reveal(Math.max(1, hintLevel || 1)); });
    $('formulaRollBtn').addEventListener('click', () => { if (q && !pending()) { saveDrawing(); next(false); } });
    $('formulaBackBtn').addEventListener('click', back);
    $('formulaSetsBtn').addEventListener('click', leave);
    window.addEventListener('keydown', e => {
      if (!active()) return;
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      // Calculator owns numpad / letter keys while focused (Tab switches back to formulas)
      if (typeof window.PT2CalcKeysBlocked === 'function' && window.PT2CalcKeysBlocked()) return;
      if (e.key === 'Escape') { e.preventDefault(); leave(); return; }
      if (/^[a-dA-D1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = /\d/.test(e.key) ? +e.key - 1 : e.key.toUpperCase().charCodeAt(0) - 65;
        const b = document.querySelectorAll('#formulaOptions .opt')[i]; if (b && !b.disabled) { e.preventDefault(); b.click(); }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  window.FormulaPractice = { formulaCount, appendSetsSection, start, next: () => next(false), back, get question() { return q; }, get active() { return active(); }, leave, totalAnswered: () => cfg ? total() : 0 };
})();
