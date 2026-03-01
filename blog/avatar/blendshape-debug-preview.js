/**
 * Blendshape Debug Preview with Style Chooser
 *
 * Creates a Three.js canvas inside the blendshape debug panel that
 * renders the facecap.glb avatar with real-time ARKit 52 morph targets.
 *
 * Includes a style chooser strip: "Normal" (default AvatarPlayer) plus
 * 12 sci-fi avatar styles. Switching styles cleanly disposes the previous
 * renderer and initialises the new one, re-registering as
 * `window.readAloudAvatarPlayer` so the read-aloud A2F pipeline continues
 * to feed blendshape data.
 *
 * This is an ES module -- runs deferred, after blendshape-debug.js has
 * created the debug panel DOM.
 */

import { AvatarPlayer } from './avatar-player.js?v=4';
import { StyleAdapter }  from './avatar-style-adapter.js';

// ---------------------------------------------------------------------------
// Style definitions
// ---------------------------------------------------------------------------

var STYLES = [
  { id: 'normal',       name: 'Normal',       accent: '#a08060' },
  { id: 'cortana',      name: 'Cortana',      accent: '#6ec6ff' },
  { id: 'adjutant',     name: 'Adjutant',     accent: '#4ade80' },
  { id: 'mothership',   name: 'Mothership',   accent: '#c4b5fd' },
  { id: 'ironman',      name: 'Iron Man',     accent: '#fbbf24' },
  { id: 'terminator',   name: 'Terminator',   accent: '#f87171' },
  { id: 'tron',         name: 'Tron',         accent: '#22d3ee' },
  { id: 'matrix',       name: 'Matrix',       accent: '#4ade80' },
  { id: 'blade-runner', name: 'Blade Runner', accent: '#fb923c' },
  { id: 'westworld',    name: 'Westworld',    accent: '#cbd5e1' },
  { id: 'mass-effect',  name: 'Mass Effect',  accent: '#818cf8' }
];

var GLB_URL = '../facecap.glb';
var PREVIEW_W = 256;
var PREVIEW_H = 256;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

(function init() {
  var panel = document.getElementById('bsDebugPanel');
  if (!panel) return;

  // ---- Create canvas inside a wrapper ----
  // The wrapper provides a stable container with fixed aspect-ratio so that
  // style modules reading canvas.parentElement.clientWidth/clientHeight get
  // the correct preview dimensions instead of the full panel dimensions.
  var canvasWrap = document.createElement('div');
  canvasWrap.className = 'bs-debug-preview-wrap';

  var canvas = document.createElement('canvas');
  canvas.id = 'bsDebugPreviewCanvas';
  canvas.className = 'bs-debug-preview-canvas';
  canvasWrap.appendChild(canvas);

  var header = panel.querySelector('.bs-debug-header');
  var rowsContainer = document.getElementById('bsDebugRows');
  if (rowsContainer) {
    panel.insertBefore(canvasWrap, rowsContainer);
  } else if (header) {
    header.after(canvasWrap);
  } else {
    panel.prepend(canvasWrap);
  }

  // ---- Style chooser strip ----
  var strip = document.createElement('div');
  strip.className = 'bs-style-strip';
  // Insert after canvas wrapper, before rows
  if (rowsContainer) {
    panel.insertBefore(strip, rowsContainer);
  } else {
    canvasWrap.after(strip);
  }

  var btnMap = {};
  STYLES.forEach(function (s) {
    var btn = document.createElement('button');
    btn.className = 'bs-style-dot';
    btn.style.setProperty('--dot-color', s.accent);
    btn.title = s.name;
    btn.addEventListener('click', function () { switchStyle(s.id); });
    strip.appendChild(btn);
    btnMap[s.id] = btn;
  });

  // ---- State ----
  var currentStyleId = null;
  var currentAvatar  = null;  // AvatarPlayer instance (normal mode)
  var currentAdapter = null;  // StyleAdapter instance (style mode)
  var currentCleanup = null;  // style module cleanup fn
  var switching      = false;

  // ---- Gaze tracking setup (reused across style switches) ----
  function setupGaze(player) {
    // Mouse cursor tracking is set up once below (delegates to current player)
    // Reading highlight tracking likewise delegates
    // Nothing extra needed here -- the event listeners reference `getPlayer()`
  }

  function getPlayer() {
    return currentAdapter || currentAvatar;
  }

  // ---- Switch style ----
  async function switchStyle(styleId) {
    if (styleId === currentStyleId || switching) return;
    switching = true;

    canvas.classList.remove('loaded');

    // Dispose previous
    if (currentAdapter) { currentAdapter.dispose(); currentAdapter = null; }
    if (currentAvatar)  { currentAvatar.dispose();  currentAvatar  = null; }
    if (currentCleanup) { try { currentCleanup(); } catch (e) {} currentCleanup = null; }
    window.readAloudAvatarPlayer = null;

    // Reset canvas: clear inline styles set by renderer.setSize() so the
    // CSS width:100%/height:100% rules take effect again, and remove stale
    // custom properties left by the previous style module.
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.removeAttribute('width');
    canvas.removeAttribute('height');
    delete canvas._camera;
    delete canvas._controls;
    delete canvas._model;
    delete canvas._externalRotation;

    // Update active button
    if (currentStyleId && btnMap[currentStyleId]) {
      btnMap[currentStyleId].classList.remove('active');
    }
    btnMap[styleId].classList.add('active');
    currentStyleId = styleId;

    try {
      if (styleId === 'normal') {
        // AvatarPlayer with default rendering
        currentAvatar = new AvatarPlayer(canvas, {
          glbUrl: GLB_URL,
          width: PREVIEW_W,
          height: PREVIEW_H,
          style: 'normal',
          cameraPosition: [0, -0.15, 3.2],
          cameraTarget: [0, -0.15, 0]
        });
        // Register immediately so read-aloud.js can feed data while GLB loads
        window.readAloudAvatarPlayer = currentAvatar;
        await currentAvatar.loadAvatar(GLB_URL);
        currentAvatar.setIdleMode(true);
      } else {
        // Dynamic import of the style module
        var mod = await import('./avatar-style-' + styleId + '.js');
        currentCleanup = await mod.init(canvas, GLB_URL);

        // Create adapter for blendshape/idle/gaze driving
        currentAdapter = new StyleAdapter(canvas);
        currentAdapter.bind();
        currentAdapter.setIdleMode(true);
        window.readAloudAvatarPlayer = currentAdapter;
      }

      canvas.classList.add('loaded');
    } catch (err) {
      console.error('[StyleChooser] Error switching to', styleId, err);
    }

    switching = false;
  }

  // ---- Initial load: normal style ----
  switchStyle('normal');

  // ---- Gaze tracking: mouse cursor ----
  document.addEventListener('mousemove', function (e) {
    var p = getPlayer();
    if (p) p.setGazeTarget(e.pageX, e.pageY, 'mouse');
  });
  document.addEventListener('mouseleave', function () {
    var p = getPlayer();
    if (p) p.clearGazeTarget('mouse');
  });

  // ---- Gaze tracking: read-aloud highlight ----
  var readingObserver = new MutationObserver(function () {
    var p = getPlayer();
    if (!p) return;
    var activeEl = document.querySelector('.reading-active');
    if (activeEl) {
      var rect = activeEl.getBoundingClientRect();
      p.setGazeTarget(
        rect.left + rect.width / 2 + window.scrollX,
        rect.top + rect.height / 2 + window.scrollY,
        'reading'
      );
    } else {
      p.clearGazeTarget('reading');
    }
  });

  var articleEl = document.querySelector('.article');
  if (articleEl) {
    readingObserver.observe(articleEl, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  }

  // Update reading target on scroll
  var scrollTimer = null;
  window.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      var p = getPlayer();
      if (!p) return;
      var activeEl = document.querySelector('.reading-active');
      if (activeEl) {
        var rect = activeEl.getBoundingClientRect();
        p.setGazeTarget(
          rect.left + rect.width / 2 + window.scrollX,
          rect.top + rect.height / 2 + window.scrollY,
          'reading'
        );
      }
    }, 100);
  }, { passive: true });

  // ---- Wire up read-aloud events ----
  window.addEventListener('read-aloud-audio', function (e) {
    var p = getPlayer();
    if (p) p.play(e.detail.audio);
  });

  window.addEventListener('read-aloud-stop', function () {
    var p = getPlayer();
    if (p) {
      p.stop();
      p.setIdleMode(true);
    }
  });
})();
