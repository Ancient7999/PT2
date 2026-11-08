/* PT2 host for Quantifier-30 calculator (https://ancient7999.github.io/calculator/).
   Toggle on Formulas (desktop + phone). Widget does not auto-close on navigation.
   Free drag on all devices (same as RSO desktop / free-drag behaviour). */
(function () {
  'use strict';

  function formulaActive() {
    var v = document.getElementById('formulaView');
    return !!(v && v.classList.contains('active'));
  }

  function calcEl() { return document.getElementById('calculator-widget'); }

  function ensureFallbacks() {
    var root = document.documentElement;
    var cs = getComputedStyle(root);
    function setIfEmpty(name, val) {
      if (!cs.getPropertyValue(name).trim()) root.style.setProperty(name, val);
    }
    setIfEmpty('--col-bg-input', '#111');
    setIfEmpty('--col-bg-input-rgb', '17, 17, 17');
    setIfEmpty('--col-bg-card', '#1a1a1a');
    setIfEmpty('--col-text-main', '#ccc');
    setIfEmpty('--col-text-muted', '#888');
    setIfEmpty('--col-error', '#ff4444');
    setIfEmpty('--radius-md', '8px');
    var a3 = cs.getPropertyValue('--accent-3-rgb').trim();
    setIfEmpty('--accent-5-rgb', a3 || '0, 68, 68');
  }

  function syncToggleVisibility() {
    var btn = document.getElementById('calc-toggle-btn');
    if (!btn) return;
    var show = formulaActive();
    btn.hidden = !show;
    btn.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.body.classList.toggle('pt2-formula-calc', show);
  }

  function syncPressed() {
    syncCalcShown();
    var btn = document.getElementById('calc-toggle-btn');
    var w = calcEl();
    if (!btn || !w) return;
    btn.setAttribute('aria-pressed', w.style.display === 'block' ? 'true' : 'false');
  }
  /* the "Tab move focus" key hint shows only while the calculator is on screen, in any section */
  function syncCalcShown() {
    var w = calcEl();
    document.body.classList.toggle('pt2-calc-shown', !!(w && w.style.display === 'block'));
  }

  function openCalc() {
    var w = calcEl(); if (!w) return;
    w.style.display = 'block';
    w.classList.remove('pt2-calc-sheet', 'mobile-docked');
    document.body.classList.remove('pt2-calc-open');
    window.lastInputTarget = 'calc';
    if (typeof window.updateInputTargets === 'function') window.updateInputTargets();
    if (typeof window.render === 'function') window.render();
    syncPressed();
  }

  function closeCalc() {
    var w = calcEl(); if (!w) return;
    w.style.display = 'none';
    window.lastInputTarget = 'answer';
    w.classList.remove('pt2-calc-sheet', 'mobile-docked');
    document.body.classList.remove('pt2-calc-open');
    if (typeof window.updateInputTargets === 'function') window.updateInputTargets();
    syncPressed();
  }

  function toggleCalc() {
    var w = calcEl();
    if (w && w.style.display === 'block') closeCalc();
    else openCalc();
  }

  window.PT2CalcKeysBlocked = function () {
    var w = calcEl();
    return !!(w && w.style.display === 'block' && window.lastInputTarget === 'calc');
  };

  // Allow free drag on phones too (calculator-core skips drag when _isMobileQuiz() is true)
  window._isMobileQuiz = function () { return false; };

  function wire() {
    ensureFallbacks();
    // Drop any leftover sheet backdrop from older builds
    document.querySelectorAll('.pt2-calc-sheet-backdrop').forEach(function (el) { el.remove(); });
    var w0 = calcEl();
    if (w0) w0.classList.remove('pt2-calc-sheet', 'mobile-docked');
    document.body.classList.remove('pt2-calc-open');

    // Pointer ownership covers the whole widget and every outside surface.
    function ownInput(event) {
      var w = calcEl();
      var inside = !!(w && w.style.display === 'block' && w.contains(event.target));
      window.lastInputTarget = inside ? 'calc' : 'answer';
      var active = document.activeElement;
      if (event.type === 'pointerdown' && active && active !== document.body &&
          (inside ? !w.contains(active) : w && w.contains(active))) active.blur();
      if (typeof window.updateInputTargets === 'function') window.updateInputTargets();
    }
    document.addEventListener('pointerdown', ownInput, true);
    document.addEventListener('focusin', ownInput, true);
    syncToggleVisibility();
    syncPressed();
    var btn = document.getElementById('calc-toggle-btn');
    if (btn && !btn.dataset.pt2Wired) {
      btn.dataset.pt2Wired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!formulaActive()) return;
        toggleCalc();
      });
    }
    var fv = document.getElementById('formulaView');
    if (fv) {
      new MutationObserver(function () {
        syncToggleVisibility();
        syncPressed();
      }).observe(fv, { attributes: true, attributeFilter: ['class'] });
    }
    if (typeof window.showView === 'function' && !window.showView._pt2Calc) {
      var orig = window.showView;
      window.showView = function () {
        var r = orig.apply(this, arguments);
        syncToggleVisibility();
        syncPressed();
        return r;
      };
      window.showView._pt2Calc = true;
    }
    window.addEventListener('resize', syncToggleVisibility);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.PT2Calculator = { open: openCalc, close: closeCalc, toggle: toggleCalc, sync: syncToggleVisibility };
})();
