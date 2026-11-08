/* Assessed ray drawing for formula practice. After the choice is correct, the student draws the
   normal, the incident ray and the refracted ray from the incidence point. Lines follow the
   pointer; near the right angle a ghost guide appears and the line is pulled onto it, and a
   line released on the guide locks. Geometry follows the portal's SVG diagrams. */
(function (global) {
  'use strict';
  const RAD = Math.PI / 180, NS = 'http://www.w3.org/2000/svg';
  const W = 560, H = 320, OX = 280, OY = 160, LEN = 128;
  const GHOST = 18, SNAP = 8, NORMAL_SNAP = 10; // degrees from the target
  const STEPS = ['normal', 'incident', 'refracted'];
  const NAMES = { normal: 'Normal', incident: 'Incident ray', refracted: 'Refracted ray' };
  function trace(n1, n2, t1) {
    if (!(n1 > 0 && n2 > 0 && t1 >= 0 && t1 <= 90)) return null;
    const sin2 = n1 * Math.sin(t1 * RAD) / n2, critical = n1 > n2 ? Math.asin(n2 / n1) / RAD : null;
    if (sin2 > 1 + 1e-10) return { t1: t1, reflected: t1, t2: null, critical: critical, mode: 'tir' };
    const grazing = Math.abs(sin2 - 1) <= 1e-10;
    return { t1: t1, reflected: t1, t2: grazing ? 90 : Math.asin(sin2) / RAD, critical: critical, mode: grazing ? 'grazing' : 'refraction' };
  }
  /* Required angles from the normal: θ₁ in medium 1 (top), θ₂ in medium 2 (bottom). */
  function targets(question) {
    const m = question.formulaDiagram, v = Object.assign({}, m.values);
    v[m.target] = question.answerValue;
    if (m.kind === 'critical') return { kind: 'critical', n1: v.n1, n2: v.n2, t1: Math.asin(v.n2 / v.n1) / RAD, t2: 90 };
    return { kind: 'snell', n1: v.n1, n2: v.n2, t1: v.t1, t2: v.t2 };
  }
  /* Pointer position → line state. Normal: tilt from vertical. Rays: angle from the normal and side (−1 left, 1 right). */
  function lineFrom(name, x, y) {
    const dx = x - OX, dy = y - OY;
    if (name === 'normal') { const a = Math.abs(Math.atan2(dx, -dy) / RAD); return { a: Math.min(a, 180 - a) }; }
    const down = name === 'refracted';
    return { a: Math.atan2(Math.abs(dx), down ? dy : -dy) / RAD, s: dx < 0 ? -1 : 1 };
  }
  /* Distance in degrees from the correct line, or Infinity on the wrong side. */
  function error(name, line, goal, incidentSide) {
    if (!line) return Infinity;
    if (name === 'normal') return line.a;
    if (name === 'incident') return Math.abs(line.a - goal.t1);
    if (incidentSide != null && goal.t2 > 0.5 && line.s !== -incidentSide) return Infinity;
    return Math.abs(line.a - goal.t2);
  }
  function snapLimit(name) { return name === 'normal' ? NORMAL_SNAP : SNAP; }
  /* Magnetic pull: inside the snap band the line takes the exact target angle. */
  function guide(name, line, goal, incidentSide) {
    const e = error(name, line, goal, incidentSide);
    const out = { line: line, ghost: e <= GHOST, snapped: e <= snapLimit(name) };
    if (out.snapped) out.line = name === 'normal' ? { a: 0 } : { a: name === 'incident' ? goal.t1 : goal.t2, s: name === 'refracted' && incidentSide != null ? -incidentSide : line.s };
    return out;
  }
  function endpoint(name, line) {
    const t = line.a * RAD;
    if (name === 'normal') return { x: OX + LEN * Math.sin(t), y: OY - LEN * Math.cos(t) };
    const s = line.s || 1, dir = name === 'refracted' ? 1 : -1;
    return { x: OX + s * LEN * Math.sin(t), y: OY + dir * LEN * Math.cos(t) };
  }
  function fmt(n) { return Number(n.toFixed(1)).toString(); }
  function idx(n) { return Number(n.toFixed(3)).toString(); }
  function mount(host, question, onComplete, saved) {
    host.replaceChildren();
    const meta = question.formulaDiagram;
    host.hidden = true;
    if (!meta) return null;
    const goal = targets(question);
    const state = { normal: null, incident: null, refracted: null, locked: {}, hint: 0 };
    if (saved) { STEPS.forEach(k => { if (saved[k]) state[k] = Object.assign({}, saved[k]); }); Object.assign(state.locked, saved.locked); state.hint = saved.hint || 0; }
    let tool = null, drag = null, ghostFor = null, finished = STEPS.every(k => state.locked[k]);
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
    el('div', { class: 'fd-heading' }, host, goal.kind === 'critical' ? 'Draw the critical-angle diagram' : 'Draw the ray diagram');
    el('p', { class: 'fd-caption', id: 'fd-task' }, host, 'Pick a line, then drag from the incidence point. Lines lock when they reach their place.');
    const tools = el('div', { class: 'fd-tools', role: 'group', 'aria-label': 'Drawing tools' }, host);
    const toolButtons = {};
    STEPS.forEach(k => {
      const b = el('button', { type: 'button', class: 'nav-btn fd-tool', 'data-tool': k, 'aria-pressed': 'false' }, tools, NAMES[k]);
      b.addEventListener('click', () => choose(k, true));
      b.addEventListener('keydown', ev => { if (/^Arrow/.test(ev.key)) { ev.preventDefault(); choose(k, true); if (tool === k) key(k, ev); } });
      toolButtons[k] = b;
    });
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'fd-svg fd-draw', role: 'group', 'aria-labelledby': 'fd-title', 'aria-describedby': 'fd-task' }, host);
    svgEl('title', { id: 'fd-title' }, svg, 'Ray drawing area');
    svgEl('line', { x1: 20, y1: OY, x2: 540, y2: OY, class: 'fd-interface' }, svg);
    svgEl('text', { x: 24, y: 44, class: 'fd-label' }, svg, 'Medium 1 · n₁ = ' + idx(goal.n1));
    svgEl('text', { x: 24, y: 300, class: 'fd-label' }, svg, 'Medium 2 · n₂ = ' + idx(goal.n2));
    svgEl('text', { x: 536, y: OY - 8, 'text-anchor': 'end', class: 'fd-label fd-dim' }, svg, 'Boundary');
    const ghost = svgEl('line', { class: 'fd-ghost', x1: OX, y1: OY, x2: OX, y2: OY }, svg);
    const parts = {};
    STEPS.forEach(k => {
      const g = svgEl('g', { class: 'fd-line fd-' + k, 'data-line': k }, svg);
      const line = svgEl('line', { x1: OX, y1: OY, x2: OX, y2: OY }, g);
      const twin = k === 'normal' ? svgEl('line', { x1: OX, y1: OY, x2: OX, y2: OY }, g) : null;
      const arrow = k === 'normal' ? null : svgEl('path', { class: 'fd-arrow' }, g);
      const handle = svgEl('circle', { r: 13, class: 'fd-handle', tabindex: '0', role: 'slider', 'aria-label': NAMES[k] + ' angle from the normal',
        'aria-valuemin': '0', 'aria-valuemax': k === 'normal' ? '90' : '180', 'data-handle': k }, g);
      handle.addEventListener('pointerdown', ev => { if (!state.locked[k]) { choose(k); start(ev); } });
      handle.addEventListener('keydown', ev => key(k, ev));
      parts[k] = { g: g, line: line, twin: twin, arrow: arrow, handle: handle };
    });
    const readout = svgEl('text', { x: OX + 14, y: OY - 14, class: 'fd-label fd-readout' }, svg);
    svgEl('circle', { cx: OX, cy: OY, r: 5, class: 'fd-origin' }, svg);
    const status = el('p', { class: 'fd-caption fd-status', role: 'status', 'aria-live': 'polite' }, host);
    const actions = el('div', { class: 'fd-actions' }, host);
    const check = el('button', { type: 'button', class: 'nav-btn primary' }, actions, 'Check diagram');
    const hintButton = el('button', { type: 'button', class: 'nav-btn', 'aria-controls': 'fd-hint' }, actions, 'Diagram hint');
    const hint = el('p', { id: 'fd-hint', class: 'fd-caption fd-hint' }, host); hint.hidden = true;
    check.addEventListener('click', checkAll);
    hintButton.addEventListener('click', () => { state.hint++; showHint(); });

    function incidentSide() { return state.locked.incident && state.incident ? state.incident.s : null; }
    function nextStep() { return STEPS.find(k => !state.locked[k]) || null; }
    function available(k) { const i = STEPS.indexOf(k); return STEPS.slice(0, i).every(p => state.locked[p]); }
    function choose(k, focus) {
      if (finished || state.locked[k]) return;
      if (!available(k)) { status.textContent = 'Draw the ' + NAMES[nextStep()].toLowerCase() + ' first.'; return; }
      tool = k; paint();
      if (focus) {
        if (!state[k]) place(k, start0(k));
        paint(); status.textContent = NAMES[k] + ' selected · drag it into place, or use the arrow keys on its handle.';
        parts[k].handle.focus && parts[k].handle.focus();
      }
    }
    function point(ev) {
      const r = svg.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * W / (r.width || W), y: (ev.clientY - r.top) * H / (r.height || H) };
    }
    function place(k, raw) {
      const g = guide(k, raw, goal, incidentSide());
      state[k] = g.line; ghostFor = g.ghost && !state.locked[k] ? k : null;
      return g;
    }
    function start(ev) {
      if (!tool || finished) return;
      ev.preventDefault && ev.preventDefault();
      try { svg.setPointerCapture && svg.setPointerCapture(ev.pointerId); } catch (e) {}
      drag = { k: tool, raw: state[tool] }; move(ev);
    }
    function move(ev) {
      if (!drag) return;
      const p = point(ev); if (Math.hypot(p.x - OX, p.y - OY) < 6) return;
      drag.raw = lineFrom(drag.k, p.x, p.y);
      const g = place(drag.k, drag.raw);
      paint(g.snapped);
    }
    function end(ev) {
      if (!drag) return;
      const k = drag.k; drag = null; ghostFor = null;
      try { svg.releasePointerCapture && svg.releasePointerCapture(ev.pointerId); } catch (e) {}
      settle(k);
    }
    /* An interrupted gesture keeps the raw line, adjustable, and never locks. */
    function cancel(ev) {
      if (!drag) return;
      const k = drag.k; state[k] = drag.raw || null; drag = null; ghostFor = null;
      try { svg.releasePointerCapture && svg.releasePointerCapture(ev.pointerId); } catch (e) {}
      paint();
    }
    function settle(k) {
      if (state[k] && error(k, state[k], goal, incidentSide()) < 1e-6) lock(k);
      else { paint(); if (state[k]) status.textContent = NAMES[k] + ' placed · adjust it or check the diagram.'; }
    }
    function lock(k) {
      state.locked[k] = true; ghostFor = null;
      const n = nextStep(); tool = n;
      status.textContent = NAMES[k] + ' locked.' + (n ? ' Next: ' + NAMES[n].toLowerCase() + '.' : '');
      hint.hidden = true; state.hint = 0;
      if (!n) { finished = true; status.textContent = 'Diagram complete.'; paint(); if (onComplete) onComplete(); return; }
      paint();
    }
    function key(k, ev) {
      if (state.locked[k] || finished) return;
      const step = ev.shiftKey ? 5 : 1;
      const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[ev.key];
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); settle(k); return; }
      if (delta == null) return;
      ev.preventDefault(); choose(k); if (tool !== k) return;
      const cur = state[k] || start0(k);
      let raw = k === 'normal' ? { a: Math.max(0, Math.min(90, cur.a + delta)) } : { a: Math.max(0, Math.min(k === 'refracted' ? 120 : 90, cur.a + delta)), s: cur.s };
      place(k, raw); paint(); if (error(k, state[k], goal, incidentSide()) < 1e-6) lock(k);
    }
    /* Keyboard starting line, well away from the answer. */
    function start0(k) {
      if (k === 'normal') return { a: 35 };
      const t = k === 'incident' ? goal.t1 : goal.t2, s = k === 'incident' ? -1 : -(incidentSide() || -1);
      return { a: t > 45 ? t - 30 : t + 30, s: s };
    }
    function issue(k) {
      const line = state[k];
      if (!line) return 'Draw the ' + NAMES[k].toLowerCase() + '.';
      if (k === 'normal') return 'Normal: make it perpendicular to the boundary.';
      if (k === 'refracted' && goal.t2 > 0.5 && line.s !== -incidentSide()) return 'Refracted ray: it continues on the other side of the normal.';
      const want = k === 'incident' ? goal.t1 : goal.t2, sym = k === 'incident' ? 'θ₁' : 'θ₂';
      if (k === 'refracted' && goal.kind === 'critical') return 'Refracted ray: at the critical angle it runs along the boundary.';
      return NAMES[k] + ': ' + (line.a > want ? 'move it closer to the normal' : 'tilt it further from the normal') + ' · ' + sym + ' is measured from the normal.';
    }
    function checkAll() {
      if (finished) return;
      STEPS.forEach(k => { if (!state.locked[k] && available(k) && state[k] && error(k, state[k], goal, incidentSide()) <= snapLimit(k)) lock(k); });
      if (finished) return;
      const k = nextStep(); status.textContent = issue(k); tool = k; paint();
    }
    function showHint() {
      const k = nextStep(); if (!k) return;
      const lvl = state.hint, t1 = fmt(goal.t1), t2 = fmt(goal.t2);
      const toward = goal.n2 > goal.n1 ? 'toward' : 'away from';
      const lines = {
        normal: ['The normal is perpendicular to the boundary at the incidence point.', 'Drag straight up from the dot.'],
        incident: ['Use the incidence angle from the question: θ₁ = ' + t1 + '°, measured from the normal.', 'Draw it in medium 1, coming down to the dot.'],
        refracted: goal.kind === 'critical'
          ? ['At the critical angle the refracted ray grazes the boundary (θ₂ = 90°).', 'Drag along the boundary on the far side of the normal.']
          : ['The refracted ray crosses into medium 2 on the far side of the normal.', 'It bends ' + toward + ' the normal: θ₂ = ' + t2 + '°.']
      }[k];
      hint.textContent = lines.slice(0, Math.min(lines.length, lvl)).join(' ');
      hint.hidden = false;
    }
    function paint(snapped) {
      STEPS.forEach(k => {
        const p = parts[k], line = state[k];
        p.g.style.visibility = line ? 'visible' : 'hidden';
        p.g.classList.toggle('fd-locked', !!state.locked[k]);
        p.g.classList.toggle('fd-active', tool === k && !state.locked[k]);
        p.g.classList.toggle('fd-snapped', !!snapped && drag && drag.k === k);
        p.handle.setAttribute('tabindex', state.locked[k] || finished ? '-1' : '0');
        p.handle.setAttribute('aria-disabled', String(!!state.locked[k]));
        if (!line) { p.handle.setAttribute('cx', OX); p.handle.setAttribute('cy', OY); return; }
        const e = endpoint(k, line);
        p.line.setAttribute('x2', e.x); p.line.setAttribute('y2', e.y);
        p.handle.setAttribute('cx', e.x); p.handle.setAttribute('cy', e.y);
        p.handle.setAttribute('aria-valuenow', fmt(line.a));
        p.handle.setAttribute('aria-valuetext', fmt(line.a) + '° from the normal' + (state.locked[k] ? ', locked' : ''));
        if (p.twin) { p.twin.setAttribute('x2', 2 * OX - e.x); p.twin.setAttribute('y2', 2 * OY - e.y); }
        if (p.arrow) {
          // Arrowhead at the midpoint pointing along the light's travel.
          const inc = k === 'incident', ux = (inc ? OX - e.x : e.x - OX) / LEN, uy = (inc ? OY - e.y : e.y - OY) / LEN;
          const mx = (OX + e.x) / 2, my = (OY + e.y) / 2, px = -uy, py = ux;
          p.arrow.setAttribute('d', 'M' + (mx - 8 * ux + 6 * px) + ' ' + (my - 8 * uy + 6 * py) + ' L' + mx + ' ' + my + ' L' + (mx - 8 * ux - 6 * px) + ' ' + (my - 8 * uy - 6 * py));
        }
      });
      if (ghostFor) {
        const target = guide(ghostFor, { a: ghostFor === 'normal' ? 0 : ghostFor === 'incident' ? goal.t1 : goal.t2, s: state[ghostFor].s }, goal, incidentSide()).line;
        const e = endpoint(ghostFor, target); ghost.setAttribute('x2', e.x); ghost.setAttribute('y2', e.y); ghost.style.visibility = 'visible';
      } else ghost.style.visibility = 'hidden';
      const live = drag ? drag.k : tool;
      readout.textContent = live && state[live] && live !== 'normal' ? (live === 'incident' ? 'θ₁ ' : 'θ₂ ') + Math.round(state[live].a) + '°' : '';
      STEPS.forEach(k => { const b = toolButtons[k]; b.setAttribute('aria-pressed', String(tool === k)); b.disabled = finished || !!state.locked[k] || !available(k); b.classList.toggle('done', !!state.locked[k]); });
      check.disabled = finished; hintButton.disabled = finished;
      svg.classList.toggle('fd-complete', finished);
    }
    svg.addEventListener('pointerdown', ev => { if (!drag) start(ev); });
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', cancel);
    tool = finished ? null : nextStep();
    if (finished) status.textContent = 'Diagram complete.';
    paint();
    return {
      show: () => { host.hidden = false; },
      get done() { return finished; },
      getState: () => JSON.parse(JSON.stringify({ normal: state.normal, incident: state.incident, refracted: state.refracted, locked: state.locked, hint: state.hint })),
      destroy: () => { drag = null; host.replaceChildren(); host.hidden = true; }
    };
  }
  global.FormulaDiagram = { mount: mount, trace: trace, targets: targets, lineFrom: lineFrom, guide: guide, error: error, GHOST: GHOST, SNAP: SNAP };
})(typeof window !== 'undefined' ? window : globalThis);
