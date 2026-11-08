/* Opt-in ray sketches for formula practice. Geometry follows the portal's SVG diagrams. */
(function (global) {
  'use strict';
  const RAD = Math.PI / 180;
  const LABELS = { n1: 'n₁', n2: 'n₂', t1: 'θ₁', t2: 'θ₂' };
  const NS = 'http://www.w3.org/2000/svg';
  function valid(key, value) {
    return Number.isFinite(value) && (key[0] === 'n' ? value > 0 : value >= 0 && value <= 90);
  }
  function parse(key, raw) {
    if (String(raw).trim() === '') return null;
    const n = Number(raw);
    return valid(key, n) ? n : null;
  }
  function accepts(value, answer, precision) {
    return Number.isFinite(value) && Math.abs(value - answer) <= 0.5 * Math.pow(10, -precision) + 1e-9;
  }
  function trace(n1, n2, t1) {
    if (!valid('n1', n1) || !valid('n2', n2) || !valid('t1', t1)) return null;
    const sin2 = n1 * Math.sin(t1 * RAD) / n2;
    const critical = n1 > n2 ? Math.asin(n2 / n1) / RAD : null;
    if (sin2 > 1 + 1e-10) return { t1: t1, reflected: t1, t2: null, critical: critical, mode: 'tir' };
    const grazing = Math.abs(sin2 - 1) <= 1e-10;
    return { t1: t1, reflected: t1, t2: grazing ? 90 : Math.asin(sin2) / RAD, critical: critical,
      mode: grazing ? 'grazing' : 'refraction' };
  }
  function number(n, digits) { return Number(n.toFixed(digits)).toString(); }
  function mount(host, question, onCorrect) {
    host.replaceChildren();
    const meta = question.formulaDiagram;
    host.hidden = !meta;
    if (!meta) return null;
    let solved = false, explored = false, pending = null;
    const values = Object.assign({}, meta.values), fields = {};
    function el(tag, attrs, parent, text) {
      const node = document.createElement(tag);
      Object.keys(attrs || {}).forEach(k => node.setAttribute(k, attrs[k]));
      if (text != null) node.textContent = text;
      (parent || host).appendChild(node); return node;
    }
    function svgEl(tag, attrs, parent, text) {
      const node = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(k => node.setAttribute(k, attrs[k]));
      if (text != null) node.textContent = text;
      parent.appendChild(node); return node;
    }
    el('div', { class: 'fd-heading' }, host, meta.kind === 'critical' ? 'Critical-angle sketch' : 'Ray sketch');
    const caption = el('p', { class: 'fd-caption', id: 'formulaSketchCaption' }, host,
      'Angles are measured from the normal. Explore the solved sketch below.');
    const svg = svgEl('svg', { viewBox: '0 0 560 320', class: 'fd-svg', role: 'img',
      'aria-labelledby': 'formulaSketchTitle formulaSketchDescription' }, host);
    svgEl('title', { id: 'formulaSketchTitle' }, svg, 'Incident, reflected and refracted rays');
    const description = svgEl('desc', { id: 'formulaSketchDescription' }, svg);
    svgEl('line', { x1: 20, y1: 160, x2: 540, y2: 160, class: 'fd-interface' }, svg);
    svgEl('line', { x1: 280, y1: 38, x2: 280, y2: 286, class: 'fd-normal' }, svg);
    svgEl('text', { x: 280, y: 24, 'text-anchor': 'middle', class: 'fd-label' }, svg, 'Normal');
    const medium1 = svgEl('text', { x: 24, y: 44, class: 'fd-label' }, svg);
    const medium2 = svgEl('text', { x: 24, y: 282, class: 'fd-label' }, svg);
    // Stable SVG groups rotate about the incidence point for smooth updates.
    function ray(name, base, incoming, dashed) {
      const g = svgEl('g', { class: 'fd-ray fd-' + name, 'data-ray': name }, svg);
      svgEl('line', { x1: 280, y1: 160, x2: 280, y2: base, 'stroke-dasharray': dashed ? '6 5' : 'none' }, g);
      const y = base < 160 ? 82 : 238;
      svgEl('path', { d: incoming ? 'M275 ' + (y - 7) + ' L280 ' + y + ' L285 ' + (y - 7) :
        'M275 ' + (y + (base < 160 ? 7 : -7)) + ' L280 ' + y + ' L285 ' + (y + (base < 160 ? 7 : -7)) }, g);
      return g;
    }
    const incident = ray('incident', 48, true), reflected = ray('reflected', 48, false, true), refracted = ray('refracted', 272, false);
    const arc1 = svgEl('path', { class: 'fd-arc fd-incident', fill: 'none' }, svg);
    const arc2 = svgEl('path', { class: 'fd-arc fd-refracted', fill: 'none' }, svg);
    svgEl('text', { x: 245, y: 128, class: 'fd-label' }, svg, 'θ₁');
    svgEl('text', { x: 308, y: 202, class: 'fd-label' }, svg, 'θ₂');
    const rayStatus = el('p', { class: 'fd-caption', 'aria-live': 'polite' }, host);
    const form = el('form', { class: 'fd-form', 'aria-describedby': caption.id }, host);
    const grid = el('div', { class: 'fd-fields' }, form);
    ['n1', 'n2', 't1', 't2'].forEach(key => {
      const label = el('label', { class: 'fd-field', for: 'fd-' + key }, grid);
      const target = key === meta.target;
      el('span', {}, label, LABELS[key] + (key[0] === 't' ? ' (°)' : ' (index)'));
      const input = el('input', { id: 'fd-' + key, type: 'number', inputmode: 'decimal', step: 'any',
        min: key[0] === 'n' ? '0.000001' : '0', 'aria-describedby': 'fd-state-' + key }, label);
      if (key[0] === 't') input.max = '90';
      input.readOnly = !target;
      input.required = target;
      if (!target) input.value = String(values[key]);
      const state = el('span', { class: 'fd-field-state', id: 'fd-state-' + key }, label, target ? 'Find and lock · ' + meta.precision + ' d.p.' : 'Given · locked');
      fields[key] = { input: input, state: state };
    });
    const check = el('button', { type: 'submit', class: 'nav-btn' }, form, 'Check & lock');
    const feedback = el('p', { class: 'fd-caption', role: 'status' }, form);
    const explore = el('div', { class: 'fd-explore' }, host); explore.hidden = true;
    el('label', { for: 'fd-explore-angle', class: 'fd-heading' }, explore, 'Explore incidence (°)');
    el('p', { class: 'fd-caption' }, explore, 'Question values stay locked. Change this angle to compare refraction and reflection.');
    const exploreControls = el('div', { class: 'fd-explore-controls' }, explore);
    const angle = el('input', { type: 'number', id: 'fd-explore-angle', min: '0', max: '90', step: 'any', inputmode: 'decimal' }, exploreControls);
    const slider = el('input', { type: 'range', min: '0', max: '90', step: '0.1', 'aria-label': 'Explore incidence in degrees' }, exploreControls);
    const criticalButton = el('button', { type: 'button', class: 'nav-btn' }, explore, 'At critical angle');
    const reset = el('button', { type: 'button', class: 'nav-btn' }, explore, 'Question sketch');
    const hintButton = el('button', { type: 'button', class: 'nav-btn', 'aria-expanded': 'false', 'aria-controls': 'fd-hint' }, host, 'Diagram hint');
    const hint = el('p', { id: 'fd-hint', class: 'fd-caption fd-hint' }, host,
      meta.kind === 'critical' ? 'Draw the boundary and its perpendicular normal. At θc, the refracted ray runs along the boundary (θ₂ = 90°). A larger incidence angle gives total internal reflection; the reflected angle equals the incident angle.' :
        'Draw the boundary and its perpendicular normal. Mark θ₁ and θ₂ from the normal, using n₁ sin θ₁ = n₂ sin θ₂. The ray bends toward the normal in the higher-index medium. Draw the reflected ray with θr = θ₁.');
    hint.hidden = true;
    hintButton.addEventListener('click', () => { hint.hidden = !hint.hidden; hintButton.setAttribute('aria-expanded', String(!hint.hidden)); });
    function rotate(g, degrees) {
      g.style.visibility = degrees == null ? 'hidden' : 'visible';
      if (degrees != null) g.style.transform = 'rotate(' + degrees + 'deg)';
    }
    function arc(path, t, bottom) {
      if (t == null || t === 0) { path.setAttribute('d', ''); return; }
      const r = 45, x = 280 + (bottom ? 1 : -1) * r * Math.sin(t * RAD);
      const y = 160 + (bottom ? 1 : -1) * r * Math.cos(t * RAD);
      path.setAttribute('d', 'M280 ' + (160 + (bottom ? r : -r)) + ' A45 45 0 0 0 ' + x + ' ' + y);
    }
    function draw() {
      const shown = Object.assign({}, values);
      const candidate = parse(meta.target, fields[meta.target].input.value);
      if (!solved && candidate != null) shown[meta.target] = candidate;
      const physical = solved && explored ? trace(values.n1, values.n2, Number(angle.value)) : null;
      const t1 = physical ? physical.t1 : shown.t1, t2 = physical ? physical.t2 : shown.t2;
      rotate(incident, t1 == null ? null : -t1);
      rotate(reflected, t1 == null ? null : t1);
      rotate(refracted, t2 == null ? null : -t2);
      arc(arc1, t1, false); arc(arc2, t2, true);
      medium1.textContent = 'Medium 1 · n₁ = ' + (shown.n1 == null ? '?' : number(shown.n1, 3));
      medium2.textContent = 'Medium 2 · n₂ = ' + (shown.n2 == null ? '?' : number(shown.n2, 3));
      svg.classList.toggle('fd-trial', !solved);
      let text;
      if (!solved) text = 'Trial sketch · check your value to confirm the rays. Dashed ray: reflection, θr = θ₁.';
      else if (physical) text = physical.mode === 'tir' ? 'Total internal reflection · θr = ' + number(t1, 1) + '° · no transmitted ray.' :
        (physical.mode === 'grazing' ? 'At the critical angle · ' : 'Refraction · ') + 'θ₁ = θr = ' + number(t1, 1) + '° · θ₂ = ' + number(t2, 1) + '°.';
      else text = 'Question sketch · θ₁ = θr = ' + number(values.t1, 1) + '° · θ₂ = ' + number(values.t2, 1) + '°.';
      rayStatus.textContent = text;
      description.textContent = text + ' ' + medium1.textContent + '. ' + medium2.textContent + '.';
    }
    function queueDraw() {
      if (pending != null) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => { pending = null; draw(); });
    }
    fields[meta.target].input.addEventListener('input', () => {
      fields[meta.target].input.removeAttribute('aria-invalid'); feedback.textContent = ''; queueDraw();
    });
    function complete() {
      if (solved) return;
      solved = true;
      values[meta.target] = question.answerValue;
      const target = fields[meta.target];
      target.input.value = number(question.answerValue, meta.precision);
      target.input.readOnly = true; target.state.textContent = 'Correct · locked';
      check.disabled = true; check.hidden = true; feedback.textContent = 'Values locked. Explore the rays or continue to the next question.';
      explore.hidden = false;
      angle.value = slider.value = String(values.t1);
      criticalButton.hidden = !(values.n1 > values.n2);
      draw();
    }
    form.addEventListener('submit', event => {
      event.preventDefault(); if (solved) return;
      const input = fields[meta.target].input, value = parse(meta.target, input.value);
      if (value == null || !accepts(value, question.answerValue, meta.precision)) {
        input.setAttribute('aria-invalid', 'true');
        feedback.textContent = value == null ? 'Enter a valid ' + (meta.target[0] === 'n' ? 'positive index.' : 'angle from 0° to 90°.') : 'Try again. Use the givens and round to ' + meta.precision + ' decimal ' + (meta.precision === 1 ? 'place.' : 'places.');
        return;
      }
      complete(); onCorrect();
    });
    function changeAngle(source) {
      const value = parse('t1', source.value);
      source.setAttribute('aria-invalid', value == null ? 'true' : 'false');
      if (value == null) return;
      angle.value = String(value); slider.value = String(value); explored = true; queueDraw();
    }
    angle.addEventListener('input', () => changeAngle(angle));
    slider.addEventListener('input', () => changeAngle(slider));
    criticalButton.addEventListener('click', () => {
      angle.value = String(trace(values.n1, values.n2, values.t1).critical); changeAngle(angle);
    });
    reset.addEventListener('click', () => { explored = false; angle.value = slider.value = String(values.t1); draw(); });
    draw();
    return { complete: complete, destroy: () => { if (pending != null) cancelAnimationFrame(pending); host.replaceChildren(); host.hidden = true; } };
  }
  global.FormulaDiagram = { mount: mount, trace: trace, parse: parse, accepts: accepts };
})(typeof window !== 'undefined' ? window : globalThis);
