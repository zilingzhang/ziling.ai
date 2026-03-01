/**
 * StyleAdapter -- drives ARKit 52 blendshapes, idle animations, and gaze
 * tracking on a model rendered by an external avatar-style module.
 *
 * Extracted from AvatarPlayer so the same facial-animation logic can run
 * on top of any style renderer that exposes `canvas._model`.
 *
 * @module avatar-style-adapter
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// ARKit 52 blendshape canonical names
// ---------------------------------------------------------------------------

const ARKIT_BLENDSHAPES = [
  'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight',
  'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawRight', 'jawOpen',
  'mouthClose', 'mouthFunnel', 'mouthPucker',
  'mouthLeft', 'mouthRight',
  'mouthSmileLeft', 'mouthSmileRight',
  'mouthFrownLeft', 'mouthFrownRight',
  'mouthDimpleLeft', 'mouthDimpleRight',
  'mouthStretchLeft', 'mouthStretchRight',
  'mouthRollLower', 'mouthRollUpper',
  'mouthShrugLower', 'mouthShrugUpper',
  'mouthPressLeft', 'mouthPressRight',
  'mouthLowerDownLeft', 'mouthLowerDownRight',
  'mouthUpperUpLeft', 'mouthUpperUpRight',
  'browDownLeft', 'browDownRight', 'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'noseSneerLeft', 'noseSneerRight',
  'tongueOut'
];

// ---------------------------------------------------------------------------
// Blendshape name normalisation (Apple _L/_R <-> camelCase Left/Right)
// ---------------------------------------------------------------------------

function normalizeBS(name) {
  if (name.endsWith('_L')) return name.slice(0, -2) + 'Left';
  if (name.endsWith('_R')) return name.slice(0, -2) + 'Right';
  if (name.endsWith('Left'))  return name.slice(0, -4) + '_L';
  if (name.endsWith('Right')) return name.slice(0, -5) + '_R';
  return name;
}

// Shared AudioContext
let sharedAudioCtx = null;

// ---------------------------------------------------------------------------
// StyleAdapter class
// ---------------------------------------------------------------------------

class StyleAdapter {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas used by the style module.
   */
  constructor(canvas) {
    this._canvas = canvas;
    this._model = null;
    this._morphMesh = null;
    this._morphDict = {};
    this._eyeGroups = [];
    this._baseModelRotX = 0;
    this._baseModelRotY = 0;
    this._baseModelRotZ = 0;
    this._baseEyeRotations = {};

    // Blendshape playback
    this._bsData = null;
    this._audioEl = null;
    this._analyser = null;
    this._analyserData = null;
    this._playing = false;

    // Idle state
    this._idleEnabled = true;
    this._ahemPose = false;
    this._idleState = {
      blinkTimer: 3.0 + Math.random() * 2.0,
      blinkPhase: 0,
      breathPhase: Math.random() * Math.PI * 2,
      microTimer: 5.0 + Math.random() * 5.0,
      microTarget: {},
      microCurrent: {},
      headTime: Math.random() * 100,
      eyeSaccadeTimer: 2.0 + Math.random() * 3.0,
      eyeTargetX: 0,
      eyeTargetY: 0,
      eyeCurrentX: 0,
      eyeCurrentY: 0
    };

    // Gaze tracking
    this._gazeState = {
      currentYaw: 0,
      currentPitch: 0,
      mousePageX: null,
      mousePageY: null,
      mouseLastMoveTime: 0,
      readingPageX: null,
      readingPageY: null,
      canvasRect: null
    };
    this._gazeConfig = {
      virtualDistance: 800,
      maxYaw: 0.35,
      maxPitch: 0.25,
      smoothSpeed: 4.0,
      eyeGazeMultiplier: 0.4,
      idleSwayAttenuation: 3.0,
      mouseStaleTimeout: 3.0,
      rectRefreshInterval: 0.25
    };

    // Smoothed weights
    this._currentWeights = {};
    ARKIT_BLENDSHAPES.forEach(n => { this._currentWeights[n] = 0; });

    // Animation loop
    this._rafId = null;
    this._clock = new THREE.Clock();
    this._disposed = false;
  }

  // -----------------------------------------------------------------------
  // Bind to style module's model
  // -----------------------------------------------------------------------

  /**
   * Discover the morph mesh, eye groups, and base rotations from
   * the model that a style module placed on `canvas._model`.
   */
  bind() {
    const model = this._canvas._model;
    if (!model) throw new Error('No model found on canvas._model');

    this._model = model;
    this._canvas._externalRotation = true;

    this._morphMesh = null;
    this._morphDict = {};
    this._eyeGroups = [];
    this._baseEyeRotations = {};

    model.traverse(child => {
      if (child.isMesh && child.morphTargetDictionary && !this._morphMesh) {
        this._morphMesh = child;
        const raw = child.morphTargetDictionary;
        for (const [name, idx] of Object.entries(raw)) {
          this._morphDict[name] = idx;
          const alt = normalizeBS(name);
          if (alt !== name) this._morphDict[alt] = idx;
        }
      }
      if (child.name === 'grp_eyeLeft' || child.name === 'grp_eyeRight') {
        child.rotation.set(0, 0, 0);
        this._eyeGroups.push(child);
      }
    });

    this._baseModelRotX = model.rotation.x;
    this._baseModelRotY = model.rotation.y;
    this._baseModelRotZ = model.rotation.z;
    this._eyeGroups.forEach(g => {
      this._baseEyeRotations[g.name] = { x: g.rotation.x, y: g.rotation.y };
    });

    if (this._morphMesh) {
      console.log(
        `[StyleAdapter] Bound morph targets: ${Object.keys(this._morphDict).length}`
      );
    }

    this._clock.start();
    this._startLoop();
  }

  // -----------------------------------------------------------------------
  // Public API (mirrors AvatarPlayer)
  // -----------------------------------------------------------------------

  setBlendshapeData(jsonData) { this._bsData = jsonData; }

  play(audioElement) {
    this._audioEl = audioElement;
    this._playing = true;
    if (!this._bsData && audioElement) {
      this._setupAnalyser(audioElement);
    }
  }

  stop() {
    this._playing = false;
    this._audioEl = null;
  }

  setAhemPose(enabled) { this._ahemPose = enabled; }
  setIdleMode(enabled) { this._idleEnabled = enabled; }

  getWeights() { return { ...this._currentWeights }; }

  setGazeTarget(pageX, pageY, source) {
    const gs = this._gazeState;
    if (source === 'mouse') {
      gs.mousePageX = pageX;
      gs.mousePageY = pageY;
      gs.mouseLastMoveTime = performance.now();
    } else if (source === 'reading') {
      gs.readingPageX = pageX;
      gs.readingPageY = pageY;
    }
  }

  clearGazeTarget(source) {
    const gs = this._gazeState;
    if (source === 'mouse') { gs.mousePageX = null; gs.mousePageY = null; }
    else if (source === 'reading') { gs.readingPageX = null; gs.readingPageY = null; }
  }

  dispose() {
    this._disposed = true;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._canvas._externalRotation = false;
  }

  // -----------------------------------------------------------------------
  // Animation loop
  // -----------------------------------------------------------------------

  _startLoop() {
    if (this._rafId !== null) return;
    this._tick();
  }

  _tick() {
    if (this._disposed) return;
    this._rafId = requestAnimationFrame(() => this._tick());

    const dt = Math.min(this._clock.getDelta(), 0.1);

    // Target weights
    const targets = {};
    ARKIT_BLENDSHAPES.forEach(n => { targets[n] = 0; });

    if (this._playing && this._bsData && this._audioEl) {
      this._sampleBlendshapeData(this._audioEl.currentTime, targets);
    } else if (this._playing && this._audioEl && this._analyser) {
      this._proceduralLipSync(targets);
    }

    // Ahem pose
    if (this._ahemPose) {
      targets.eyeBlinkLeft = Math.max(targets.eyeBlinkLeft, 1.0);
      targets.eyeBlinkRight = Math.max(targets.eyeBlinkRight, 1.0);
      targets.mouthPressLeft = Math.max(targets.mouthPressLeft, 0.15);
      targets.mouthPressRight = Math.max(targets.mouthPressRight, 0.15);
      targets.mouthSmileLeft = Math.max(targets.mouthSmileLeft, 0.08);
      targets.mouthSmileRight = Math.max(targets.mouthSmileRight, 0.08);
    }

    // Blinks (always)
    if (this._idleEnabled) this._updateBlink(dt, targets);

    // Idle (except during baked data playback)
    if (this._idleEnabled && !(this._playing && this._bsData)) {
      this._updateIdle(dt, targets);
    }

    // Head sway + gaze
    if (this._idleEnabled) this._updateIdleMotion(dt);

    // Apply to morph targets
    this._applyWeights(targets, dt);
  }

  // -----------------------------------------------------------------------
  // Blendshape data sampling
  // -----------------------------------------------------------------------

  _sampleBlendshapeData(time, targets) {
    const frames = this._bsData.frames;
    if (!frames || frames.length === 0) return;

    let i = 0;
    while (i < frames.length - 1 && frames[i + 1].t <= time) i++;

    const f0 = frames[i];
    const f1 = (i < frames.length - 1) ? frames[i + 1] : f0;

    let alpha = 0;
    if (f1 !== f0 && f1.t !== f0.t) {
      alpha = Math.min(1, Math.max(0, (time - f0.t) / (f1.t - f0.t)));
    }

    ARKIT_BLENDSHAPES.forEach(name => {
      targets[name] = (f0[name] || 0) + ((f1[name] || 0) - (f0[name] || 0)) * alpha;
    });
  }

  // -----------------------------------------------------------------------
  // Amplitude lip-sync
  // -----------------------------------------------------------------------

  _setupAnalyser(audioElement) {
    try {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = sharedAudioCtx;

      // Resume AudioContext if suspended (required after creation without user gesture)
      if (ctx.state === 'suspended') ctx.resume();

      if (!audioElement._avatarSource) {
        audioElement._avatarSource = ctx.createMediaElementSource(audioElement);
        audioElement._avatarSource.connect(ctx.destination);
      }

      this._analyser = ctx.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyserData = new Uint8Array(this._analyser.frequencyBinCount);
      audioElement._avatarSource.connect(this._analyser);
    } catch (e) {
      console.warn('[StyleAdapter] Could not create audio analyser:', e);
    }
  }

  _proceduralLipSync(targets) {
    if (!this._analyser || !this._analyserData) return;
    this._analyser.getByteFrequencyData(this._analyserData);

    let sum = 0;
    for (let i = 0; i < this._analyserData.length; i++) sum += this._analyserData[i];
    const avg = sum / this._analyserData.length / 255;

    let lowSum = 0;
    const lowBins = Math.floor(this._analyserData.length * 0.25);
    for (let i = 0; i < lowBins; i++) lowSum += this._analyserData[i];
    const lowAvg = lowSum / lowBins / 255;

    let highSum = 0;
    const highStart = Math.floor(this._analyserData.length * 0.6);
    for (let i = highStart; i < this._analyserData.length; i++) highSum += this._analyserData[i];
    const highAvg = highSum / (this._analyserData.length - highStart) / 255;

    targets.jawOpen = Math.min(0.6, avg * 1.4);
    if (lowAvg > 0.15) {
      targets.mouthFunnel = lowAvg * 0.3;
      targets.mouthLowerDownLeft = lowAvg * 0.2;
      targets.mouthLowerDownRight = lowAvg * 0.2;
      targets.mouthUpperUpLeft = lowAvg * 0.1;
      targets.mouthUpperUpRight = lowAvg * 0.1;
    }
    if (highAvg > 0.1) {
      targets.mouthPucker = highAvg * 0.3;
      targets.mouthStretchLeft = highAvg * 0.15;
      targets.mouthStretchRight = highAvg * 0.15;
    }
    targets.mouthSmileLeft = avg * 0.1;
    targets.mouthSmileRight = avg * 0.1;
    if (avg > 0.4) targets.browInnerUp = (avg - 0.4) * 0.3;
  }

  // -----------------------------------------------------------------------
  // Idle animation
  // -----------------------------------------------------------------------

  _updateBlink(dt, targets) {
    const idle = this._idleState;
    idle.blinkTimer -= dt;
    if (idle.blinkTimer <= 0) {
      idle.blinkPhase = 1.0;
      idle.blinkTimer = 3.0 + Math.random() * 2.0;
    }
    if (idle.blinkPhase > 0) {
      const v = idle.blinkPhase > 0.5
        ? (1.0 - idle.blinkPhase) * 2.0
        : idle.blinkPhase * 2.0;
      targets.eyeBlinkLeft = Math.max(targets.eyeBlinkLeft, v);
      targets.eyeBlinkRight = Math.max(targets.eyeBlinkRight, v);
      idle.blinkPhase -= dt * 5;
      if (idle.blinkPhase < 0) idle.blinkPhase = 0;
    }
  }

  _updateIdle(dt, targets) {
    const idle = this._idleState;

    // Breathing
    idle.breathPhase += dt * 1.2;
    const breathVal = (Math.sin(idle.breathPhase) * 0.5 + 0.5) * 0.02;
    targets.jawOpen = Math.max(targets.jawOpen, breathVal);

    // Micro-expressions
    idle.microTimer -= dt;
    if (idle.microTimer <= 0) {
      const opts = [
        { browInnerUp: 0.15 + Math.random() * 0.1 },
        { mouthSmileLeft: 0.08, mouthSmileRight: 0.08 },
        { eyeSquintLeft: 0.1, eyeSquintRight: 0.1 },
        { mouthPressLeft: 0.05, mouthPressRight: 0.05 },
        { browOuterUpLeft: 0.1 },
        { noseSneerLeft: 0.06, noseSneerRight: 0.06 },
        {}
      ];
      idle.microTarget = opts[Math.floor(Math.random() * opts.length)];
      idle.microCurrent = {};
      idle.microTimer = 4.0 + Math.random() * 6.0;
    }

    for (const [name, tv] of Object.entries(idle.microTarget)) {
      const cur = idle.microCurrent[name] || 0;
      const next = cur + (tv - cur) * dt * 2;
      idle.microCurrent[name] = next;
      targets[name] = Math.max(targets[name] || 0, next);
    }
    for (const [name, cur] of Object.entries(idle.microCurrent)) {
      if (!(name in idle.microTarget)) {
        const next = cur * (1 - dt * 3);
        idle.microCurrent[name] = next;
        if (next > 0.001) targets[name] = Math.max(targets[name] || 0, next);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Head sway + gaze tracking
  // -----------------------------------------------------------------------

  _resolveGazeTarget() {
    const gs = this._gazeState;
    const cfg = this._gazeConfig;
    const now = performance.now();

    if (!gs.canvasRect || now - (gs._rectTime || 0) > cfg.rectRefreshInterval * 1000) {
      gs.canvasRect = this._canvas.getBoundingClientRect();
      gs._rectTime = now;
    }

    const rect = gs.canvasRect;
    if (!rect) return { yaw: 0, pitch: 0, hasTarget: false };

    const cx = rect.left + rect.width / 2 + window.scrollX;
    const cy = rect.top + rect.height / 2 + window.scrollY;

    const compute = (px, py) => ({
      yaw: Math.max(-cfg.maxYaw, Math.min(cfg.maxYaw, Math.atan2(px - cx, cfg.virtualDistance))),
      pitch: Math.max(-cfg.maxPitch * 0.5, Math.min(cfg.maxPitch, Math.atan2(py - cy, cfg.virtualDistance))),
      hasTarget: true
    });

    if (gs.readingPageX !== null && gs.readingPageY !== null) {
      return compute(gs.readingPageX, gs.readingPageY);
    }

    const mouseAge = (now - gs.mouseLastMoveTime) / 1000;
    if (gs.mousePageX !== null && mouseAge < cfg.mouseStaleTimeout) {
      return compute(gs.mousePageX, gs.mousePageY);
    }

    return { yaw: 0, pitch: 0, hasTarget: false };
  }

  _updateIdleMotion(dt) {
    if (!this._model) return;

    const idle = this._idleState;
    const gs = this._gazeState;
    const cfg = this._gazeConfig;

    idle.headTime += dt;
    const t = idle.headTime;

    const gaze = this._resolveGazeTarget();

    if (this._ahemPose) {
      gaze.yaw = 0;
      gaze.pitch = -0.18;
      gaze.hasTarget = true;
    }

    const lerpFactor = 1 - Math.exp(-cfg.smoothSpeed * dt);
    gs.currentYaw  += (gaze.yaw  - gs.currentYaw)  * lerpFactor;
    gs.currentPitch += (gaze.pitch - gs.currentPitch) * lerpFactor;

    const sw = gaze.hasTarget ? cfg.idleSwayAttenuation : 1.0;

    const nodP   = Math.sin(t * 0.4)  * 0.032 * sw;
    const nodS   = Math.sin(t * 1.1)  * 0.012 * sw;
    const turnP  = Math.sin(t * 0.3)  * 0.040 * sw;
    const turnS  = Math.sin(t * 0.9)  * 0.016 * sw;
    const tilt   = Math.sin(t * 0.25) * 0.020 * sw;

    this._model.rotation.x = this._baseModelRotX  + gs.currentPitch + nodP + nodS;
    this._model.rotation.y = this._baseModelRotY   + gs.currentYaw  + turnP + turnS;
    this._model.rotation.z = this._baseModelRotZ   + tilt;

    // Eye saccades + gaze
    if (this._eyeGroups.length === 0) return;

    idle.eyeSaccadeTimer -= dt;
    if (idle.eyeSaccadeTimer <= 0) {
      idle.eyeTargetX = (Math.random() - 0.5) * 0.06;
      idle.eyeTargetY = (Math.random() - 0.5) * 0.10;
      idle.eyeSaccadeTimer = 1.5 + Math.random() * 3.5;
    }

    const eyeSpeed = dt * 3;
    idle.eyeCurrentX += (idle.eyeTargetX - idle.eyeCurrentX) * eyeSpeed;
    idle.eyeCurrentY += (idle.eyeTargetY - idle.eyeCurrentY) * eyeSpeed;

    const eyeGazeX = gs.currentPitch * cfg.eyeGazeMultiplier;
    const eyeGazeY = gs.currentYaw  * cfg.eyeGazeMultiplier;

    this._eyeGroups.forEach(g => {
      const base = this._baseEyeRotations[g.name];
      if (!base) return;
      g.rotation.x = base.x + idle.eyeCurrentX + eyeGazeX;
      g.rotation.y = base.y + idle.eyeCurrentY + eyeGazeY;
    });
  }

  // -----------------------------------------------------------------------
  // Apply weights
  // -----------------------------------------------------------------------

  _applyWeights(targets, dt) {
    if (!this._morphMesh || !this._morphMesh.morphTargetInfluences) return;

    const hasBakedData = this._playing && this._bsData;
    const fastSmoothing = 1 - Math.pow(0.00001, dt);
    const gentleSmoothing = 1 - Math.pow(0.001, dt);

    ARKIT_BLENDSHAPES.forEach(name => {
      const target = targets[name] || 0;
      const current = this._currentWeights[name] || 0;
      const isBlink = name === 'eyeBlinkLeft' || name === 'eyeBlinkRight';
      const smoothing = (hasBakedData && !isBlink) ? fastSmoothing : gentleSmoothing;
      const next = current + (target - current) * smoothing;
      this._currentWeights[name] = next;

      const idx = this._morphDict[name];
      if (idx !== undefined) {
        this._morphMesh.morphTargetInfluences[idx] = next;
      }
    });
  }
}

export { StyleAdapter, ARKIT_BLENDSHAPES };
