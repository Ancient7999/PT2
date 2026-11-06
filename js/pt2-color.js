/* PT2 colour owner: the mood (Pomodoro timer box) and the theme accent drive the same colours.
   Last change wins: a mood change repaints the accent from the mood, an accent change repaints the
   mood colours from the accent. The winner is saved, so a reload keeps it.
   Settings → Accent Color → Lock accent: keep the accent through emoji / automatic colour changes. */
(function (global) {
  'use strict';
  var root = document.documentElement, KEY = 'pt2_color_owner', busy = false, last = '', ready = false;
  var MOOD_VARS = ['--cyan', '--cyan-bright', '--teal', '--gold', '--accent', '--border', '--mood-glow', '--bg-glow', '--bg', '--bg2'];
  function accentLocked() { try { return localStorage.getItem('pt2_accent_lock') === '1'; } catch (e) { return false; } }
  function owner() { try { return localStorage.getItem(KEY) || 'mood'; } catch (e) { return 'mood'; } }
  function setOwner(o) { try { localStorage.setItem(KEY, o); } catch (e) {} root.setAttribute('data-color-owner', o); }
  function cs(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
  function hex(c) {
    var p = document.createElement('span'); p.style.color = c; document.body.appendChild(p);
    var m = getComputedStyle(p).color.match(/\d+(\.\d+)?/g) || [34, 211, 238]; p.remove();
    return '#' + m.slice(0, 3).map(function (n) { return ('0' + Math.round(+n).toString(16)).slice(-2); }).join('');
  }
  function strength() {
    var s = document.getElementById('accent-strength-slider');
    var v = s ? +s.value : NaN; if (!(v > 0)) { try { v = +localStorage.getItem('atc_accent_strength'); } catch (e) {} }
    return v > 0 ? v : 62;
  }
  function repaintDeps() {
    try { if (global.StudyCursors && StudyCursors.onMoodChange) StudyCursors.onMoodChange(); } catch (e) {}
    try { if (typeof global.applyCursorSkin === 'function') global.applyCursorSkin(); } catch (e) {}
  }
  function clearMoodOverride() { MOOD_VARS.forEach(function (v) { root.style.removeProperty(v); }); }
  /* mood wins: accent palette follows the mood's main colour (skipped while accent is locked) */
  function fromMood() {
    if (accentLocked()) { repaintDeps(); return; }
    busy = true;
    try {
      clearMoodOverride();
      var h = hex(cs('--cyan') || '#22d3ee');
      if (typeof global.changeAccentColor === 'function') global.changeAccentColor(h, strength());
      var pk = document.getElementById('accent-color-picker'), hx = document.getElementById('accent-hex-input');
      if (pk) pk.value = h; if (hx) hx.value = h.toUpperCase();
    } finally { last = cs('--accent-0'); busy = false; }
    repaintDeps();
  }
  /* accent wins: mood colours follow the accent */
  function fromAccent() {
    busy = true;
    try {
      var a0 = cs('--accent-0'), rgb = cs('--accent-0-rgb') || '34, 211, 238';
      var a1 = cs('--accent-1') || a0, a2 = cs('--accent-2') || a0;
      var set = { '--cyan': a0, '--accent': a0, '--cyan-bright': a1, '--teal': a2, '--gold': a1,
        '--border': 'rgba(' + rgb + ',.4)', '--mood-glow': 'rgba(' + rgb + ',.26)', '--bg-glow': 'rgba(' + rgb + ',.07)',
        '--bg': '#05070c', '--bg2': '#080c14' };
      Object.keys(set).forEach(function (k) { root.style.setProperty(k, set[k]); });
    } finally { last = cs('--accent-0'); busy = false; }
    repaintDeps();
  }
  function onMood() { if (accentLocked()) { setOwner('accent'); return; } setOwner('mood'); fromMood(); }
  /* called by the page whenever the mood changes; start-up restores keep the saved winner */
  function moodChanged() {
    if (!ready) {
      if (accentLocked() || owner() === 'accent') fromAccent();
      else fromMood();
      return;
    }
    onMood();
  }
  /* Manual accent edits always apply; lock only blocks automatic mood→accent sync */
  function onAccent() { setOwner('accent'); fromAccent(); }
  function init() {
    setOwner(owner());
    if (accentLocked() || owner() === 'accent') fromAccent(); else fromMood();
    new MutationObserver(function () {
      if (busy) return;
      var a = cs('--accent-0'); if (a && a !== last) {
        last = a; onAccent();
      }
    }).observe(root, { attributes: true, attributeFilter: ['style'] });
    var arm = function () { setTimeout(function () { ready = true; }, 600); };
    if (document.readyState === 'complete') arm(); else global.addEventListener('load', arm, { once: true });
  }
  global.PT2Color = { moodChanged: moodChanged, onMood: onMood, onAccent: onAccent, owner: owner, accentLocked: accentLocked, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
