/**
 * AvatarPlayer - Three.js digital human avatar engine with ARKit 52 blendshape support.
 *
 * Loads a GLB avatar, renders it with a colored-pencil / toon shader,
 * and drives facial morph targets from either pre-baked blendshape JSON
 * or procedural idle / amplitude-based lip-sync.
 *
 * Designed to drop into the Grace AI portal blog pages alongside the
 * existing read-aloud.js (Kokoro TTS) system.
 *
 * Usage (ES module, requires importmap for "three"):
 *
 *   import { AvatarPlayer } from './avatar-player.js';
 *
 *   const canvas = document.getElementById('avatar-canvas');
 *   const player = new AvatarPlayer(canvas, {
 *     glbUrl: 'models/author.glb',
 *     width: 340,
 *     height: 400,
 *     style: 'pencil'   // 'pencil' | 'normal'
 *   });
 *
 *   await player.loadAvatar('models/author.glb');
 *   player.setIdleMode(true);
 *
 *   // When read-aloud starts:
 *   player.play(audioElement);
 *
 *   // When read-aloud stops:
 *   player.stop();
 *
 * @module avatar-player
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ---------------------------------------------------------------------------
// ARKit 52 blendshape canonical names
// ---------------------------------------------------------------------------

/** @type {string[]} */
const ARKIT_BLENDSHAPES = [
  // Eye
  'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight',
  'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  // Jaw
  'jawForward', 'jawLeft', 'jawRight', 'jawOpen',
  // Mouth
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
  // Brow
  'browDownLeft', 'browDownRight', 'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight',
  // Cheek
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  // Nose
  'noseSneerLeft', 'noseSneerRight',
  // Tongue
  'tongueOut'
];

// ---------------------------------------------------------------------------
// Pencil / toon shader material
// ---------------------------------------------------------------------------

/**
 * Custom toon shader with discrete light bands and a warm paper tone.
 * The cross-hatch overlay is computed procedurally in the fragment shader
 * based on the local surface luminance (darker areas = denser hatching).
 */
const PencilShaderMaterial = {
  uniforms: {
    tDiffuse: { value: null },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
    uAmbient: { value: 0.35 },
    uBands: { value: 4.0 },
    uPaperTone: { value: new THREE.Color(0xf0c8a8) },
    uStrokeColor: { value: new THREE.Color(0x6b4a3a) },
    uStrokeWeight: { value: 1.0 },
    uResolution: { value: new THREE.Vector2(340, 400) }
  },

  vertexShader: /* glsl */ `
    #include <morphtarget_pars_vertex>

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;

      // Apply morph target deformations via Three.js includes
      #include <begin_vertex>
      #include <morphtarget_vertex>

      vNormal = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform vec3 uLightDir;
    uniform float uAmbient;
    uniform float uBands;
    uniform vec3 uPaperTone;
    uniform vec3 uStrokeColor;
    uniform float uStrokeWeight;
    uniform vec2 uResolution;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    /*  Procedural cross-hatch pattern.
        Returns 0.0 (no hatching) to 1.0 (full darkness). */
    float crossHatch(vec2 fragCoord, float shade) {
      float scale = 6.0;
      vec2 p = fragCoord * scale;

      /* Diagonal lines at +45 and -45 degrees */
      float line1 = abs(fract((p.x + p.y) * 0.5) - 0.5) * 2.0;
      float line2 = abs(fract((p.x - p.y) * 0.5) - 0.5) * 2.0;

      float hatch = 1.0;
      /* First set of lines appears in mid-tones */
      if (shade < 0.65) {
        hatch = min(hatch, smoothstep(0.3 * uStrokeWeight, 0.35 * uStrokeWeight, line1));
      }
      /* Cross lines appear in darker areas */
      if (shade < 0.40) {
        hatch = min(hatch, smoothstep(0.3 * uStrokeWeight, 0.35 * uStrokeWeight, line2));
      }
      /* Extra density for very dark areas */
      if (shade < 0.20) {
        float line3 = abs(fract(p.x * 0.5) - 0.5) * 2.0;
        hatch = min(hatch, smoothstep(0.25 * uStrokeWeight, 0.30 * uStrokeWeight, line3));
      }

      return 1.0 - hatch;
    }

    void main() {
      /* Toon shading with discrete bands */
      float NdotL = dot(normalize(vNormal), uLightDir);
      float raw = NdotL * 0.5 + 0.5;               /* remap [-1,1] to [0,1]  */
      float stepped = floor(raw * uBands) / uBands; /* quantise               */
      float shade = mix(uAmbient, 1.0, stepped);    /* blend ambient           */

      /* Base colour: warm paper tinted by shade */
      vec3 baseColor = uPaperTone * shade;

      /* Cross-hatch overlay */
      vec2 fragCoord = gl_FragCoord.xy / uResolution;
      float hatchDensity = crossHatch(fragCoord, shade);
      vec3 finalColor = mix(baseColor, uStrokeColor, hatchDensity * 0.45);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// ---------------------------------------------------------------------------
// Sobel outline post-process shader
// ---------------------------------------------------------------------------

const SobelOutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(340, 400) },
    uLineColor: { value: new THREE.Color(0x5a3a2a) },
    uLineStrength: { value: 1.0 },
    uBgColor: { value: new THREE.Color(0xf0c8a8) }
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec3 uLineColor;
    uniform float uLineStrength;
    uniform vec3 uBgColor;

    varying vec2 vUv;

    float luminance(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vec2 texel = 1.0 / uResolution;

      /* 3x3 neighbourhood luminance */
      float tl = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x,  texel.y)).rgb);
      float tc = luminance(texture2D(tDiffuse, vUv + vec2(     0.0,  texel.y)).rgb);
      float tr = luminance(texture2D(tDiffuse, vUv + vec2( texel.x,  texel.y)).rgb);
      float ml = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x,      0.0)).rgb);
      float mr = luminance(texture2D(tDiffuse, vUv + vec2( texel.x,      0.0)).rgb);
      float bl = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb);
      float bc = luminance(texture2D(tDiffuse, vUv + vec2(     0.0, -texel.y)).rgb);
      float br = luminance(texture2D(tDiffuse, vUv + vec2( texel.x, -texel.y)).rgb);

      float sobelX = tl + 2.0*ml + bl - tr - 2.0*mr - br;
      float sobelY = tl + 2.0*tc + tr - bl - 2.0*bc - br;
      float edge = sqrt(sobelX * sobelX + sobelY * sobelY);

      vec4 texColor = texture2D(tDiffuse, vUv);

      /* If the underlying pixel is close to the background, do not draw edges
         (avoids outlining the background itself). */
      float bgDist = distance(texColor.rgb, uBgColor);
      float mask = smoothstep(0.02, 0.08, bgDist);

      float edgeAlpha = smoothstep(0.1, 0.4, edge * uLineStrength) * mask;
      vec3 color = mix(texColor.rgb, uLineColor, edgeAlpha);

      gl_FragColor = vec4(color, texColor.a);
    }
  `
};

// ---------------------------------------------------------------------------
// AvatarPlayer class
// ---------------------------------------------------------------------------

class AvatarPlayer {
  /**
   * @param {HTMLCanvasElement} canvas  - Target canvas element.
   * @param {Object}           options
   * @param {string}          [options.glbUrl]        - URL to GLB model.
   * @param {number}          [options.width=340]     - Canvas width.
   * @param {number}          [options.height=400]    - Canvas height.
   * @param {'pencil'|'normal'} [options.style='pencil'] - Render style.
   */
  constructor(canvas, options = {}) {
    /** @private */ this._canvas = canvas;
    /** @private */ this._opts = options;
    /** @private */ this._width = options.width || 340;
    /** @private */ this._height = options.height || 400;
    /** @private */ this._style = options.style || 'pencil';

    // Three.js core
    /** @private */ this._renderer = null;
    /** @private */ this._scene = null;
    /** @private */ this._camera = null;
    /** @private */ this._composer = null;

    // Model
    /** @private */ this._model = null;
    /** @private */ this._morphMesh = null;
    /** @private */ this._morphDict = {};  // name -> index

    // Blendshape playback
    /** @private */ this._bsData = null;   // { fps, frames }
    /** @private */ this._audioEl = null;
    /** @private */ this._analyser = null;
    /** @private */ this._analyserData = null;

    // Idle
    /** @private */ this._idleEnabled = true;
    /** @private */ this._idleState = {
      blinkTimer: 3.0 + Math.random() * 2.0,
      blinkPhase: 0,
      breathPhase: Math.random() * Math.PI * 2,
      microTimer: 5.0 + Math.random() * 5.0,
      microTarget: {},
      microCurrent: {},
      // Head sway – overlapping sine waves for organic motion
      headTime: Math.random() * 100,
      // Eye saccades – small random gaze shifts
      eyeSaccadeTimer: 2.0 + Math.random() * 3.0,
      eyeTargetX: 0,
      eyeTargetY: 0,
      eyeCurrentX: 0,
      eyeCurrentY: 0
    };

    // Base rotations stored after model load (set in loadAvatar)
    /** @private */ this._baseModelRotX = 0;
    /** @private */ this._baseEyeRotations = {};

    // Gaze tracking state
    /** @private */ this._gazeState = {
      currentYaw: 0,
      currentPitch: 0,
      mousePageX: null,
      mousePageY: null,
      mouseLastMoveTime: 0,
      readingPageX: null,
      readingPageY: null,
      canvasRect: null
    };
    /** @private */ this._gazeConfig = {
      virtualDistance: 800,
      maxYaw: 0.35,
      maxPitch: 0.25,
      smoothSpeed: 4.0,
      eyeGazeMultiplier: 0.4,
      idleSwayAttenuation: 3.0,
      mouseStaleTimeout: 3.0,
      rectRefreshInterval: 0.25
    };

    // State
    /** @private */ this._playing = false;
    /** @private */ this._rafId = null;
    /** @private */ this._clock = new THREE.Clock();
    /** @private */ this._disposed = false;

    // Current blendshape weights (for smoothing)
    /** @private */ this._currentWeights = {};
    ARKIT_BLENDSHAPES.forEach(n => { this._currentWeights[n] = 0; });

    this._initRenderer();
    this._initScene();

    // Store glbUrl for reference; callers should explicitly call loadAvatar()
    // to get the returned Promise for chaining .then() / .catch().
    /** @private */ this._glbUrl = options.glbUrl || null;
  }

  // -----------------------------------------------------------------------
  // Initialisation helpers
  // -----------------------------------------------------------------------

  /** @private */
  _initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: true
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(this._width, this._height);
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;
    this._renderer.setClearColor(0x000000, 0);
  }

  /** @private */
  _initScene() {
    this._scene = new THREE.Scene();

    // Camera -- head/shoulders portrait framing
    this._camera = new THREE.PerspectiveCamera(30, this._width / this._height, 0.1, 100);
    const cp = this._opts.cameraPosition || [0, 0.12, 1.3];
    const ct = this._opts.cameraTarget || [0, 0.12, 0];
    this._camera.position.set(cp[0], cp[1], cp[2]);
    this._camera.lookAt(ct[0], ct[1], ct[2]);

    // Lighting -- soft studio setup for flattering skin rendering
    const hemi = new THREE.HemisphereLight(0xffeedd, 0xb0c4de, 0.9);
    this._scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xfff8f0, 0.5);
    this._scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff0e0, 1.2);
    key.position.set(2, 3, 4);
    this._scene.add(key);

    const fill = new THREE.DirectionalLight(0xd0e0ff, 0.6);
    fill.position.set(-3, 2, 2);
    this._scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffe0c8, 0.5);
    rim.position.set(0, 2, -3);
    this._scene.add(rim);

    const front = new THREE.DirectionalLight(0xffffff, 0.4);
    front.position.set(0, 0.5, 5);
    this._scene.add(front);

    // Studio beauty light -- warm spotlight from above-front, focused on face
    const beauty = new THREE.SpotLight(0xffeedd, 1.5, 10, Math.PI / 6, 0.5, 1);
    beauty.position.set(0, 2, 3);
    beauty.target.position.set(0, 0, 0);
    this._scene.add(beauty);
    this._scene.add(beauty.target);

    // Post-processing (pencil style)
    if (this._style === 'pencil') {
      this._initComposer();
    }
  }

  /** @private */
  _initComposer() {
    const renderTarget = new THREE.WebGLRenderTarget(this._width, this._height, {
      type: THREE.HalfFloatType,
      samples: 4
    });

    this._composer = new EffectComposer(this._renderer, renderTarget);

    const renderPass = new RenderPass(this._scene, this._camera);
    renderPass.clearAlpha = 0;
    this._composer.addPass(renderPass);

    const sobelPass = new ShaderPass(SobelOutlineShader);
    sobelPass.uniforms.uResolution.value.set(
      this._width * Math.min(window.devicePixelRatio, 2),
      this._height * Math.min(window.devicePixelRatio, 2)
    );
    this._composer.addPass(sobelPass);
    /** @private */
    this._sobelPass = sobelPass;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Load and display a GLB avatar model.
   *
   * Finds the first mesh with morph targets and builds a mapping from
   * ARKit blendshape names to morph target indices.
   *
   * @param {string} glbUrl - URL to a .glb file.
   * @returns {Promise<void>}
   */
  async loadAvatar(glbUrl) {
    const loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);

    // KTX2 texture support (used by some GLB models like Three.js facecap)
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
    ktx2Loader.detectSupport(this._renderer);
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);

    // Emit a custom event so the CSS loading spinner can react
    this._canvas.dispatchEvent(new CustomEvent('avatar-loading', { bubbles: true }));

    return new Promise((resolve, reject) => {
      loader.load(
        glbUrl,
        (gltf) => {
          this._model = gltf.scene;

          // Find the mesh with morph targets
          this._model.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary && !this._morphMesh) {
              this._morphMesh = child;
              // Build morph dict with normalized names.
              // GLB models may use Apple-style suffixes (_L/_R) or camelCase
              // (Left/Right). We store BOTH aliases so either convention works.
              const raw = child.morphTargetDictionary;
              this._morphDict = {};
              for (const [name, idx] of Object.entries(raw)) {
                this._morphDict[name] = idx;               // original name
                const alt = AvatarPlayer._normalizeBS(name);
                if (alt !== name) this._morphDict[alt] = idx; // alias
              }
            }

            // In normal mode, tint meshes with a warm skin tone so the
            // GLB's default grey appearance doesn't look lifeless.
            // The color multiplies with any existing texture.
            if (child.isMesh && this._style === 'normal') {
              const mat = child.material;
              if (mat && mat.color) {
                mat.color.set(0xfcdbd3);
              }
            }

            // Apply pencil material if in pencil mode
            if (child.isMesh && this._style === 'pencil') {
              const pencilMat = new THREE.ShaderMaterial({
                uniforms: {
                  ...THREE.UniformsUtils.clone(PencilShaderMaterial.uniforms),
                  uResolution: {
                    value: new THREE.Vector2(
                      this._width * Math.min(window.devicePixelRatio, 2),
                      this._height * Math.min(window.devicePixelRatio, 2)
                    )
                  }
                },
                vertexShader: PencilShaderMaterial.vertexShader,
                fragmentShader: PencilShaderMaterial.fragmentShader
                // Note: morphTargets property is deprecated in Three.js r160+;
                // morph target support is handled via #include chunks in the vertex shader.
              });

              // Copy morph target references before replacing material
              const influences = child.morphTargetInfluences;
              const dict = child.morphTargetDictionary;
              child.material = pencilMat;
              // Restore morph target data (material swap can reset these)
              if (influences) child.morphTargetInfluences = influences;
              if (dict) child.morphTargetDictionary = dict;
            }
          });

          // Centre and scale model for head/shoulders framing
          const box = new THREE.Box3().setFromObject(this._model);
          const centre = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Translate so the centre of the bounding box is at origin
          this._model.position.sub(centre);

          // Scale to fit roughly 1.6 units tall
          const targetHeight = 1.6;
          const scale = targetHeight / size.y;
          this._model.scale.setScalar(scale);

          // Shift down slightly so the head is near the top of frame
          this._model.position.y -= 0.05;

          // Orient the whole GLB so the avatar faces the audience:
          // positive X = tilt chin up (look upward), negative Y = turn to
          // avatar's right (audience's left).
          this._model.rotation.x = 0.20;
          this._model.rotation.y = -0.26;

          // Collect eyeball groups and zero out the GLB's baked-in
          // downward pitch so gaze follows the whole-model orientation.
          this._eyeGroups = [];
          this._model.traverse((child) => {
            if (child.name === 'grp_eyeLeft' || child.name === 'grp_eyeRight') {
              child.rotation.set(0, 0, 0);
              this._eyeGroups.push(child);
            }
          });

          // Store base rotations for idle motion offsets
          this._baseModelRotX = this._model.rotation.x;
          this._baseModelRotY = this._model.rotation.y;
          this._baseModelRotZ = this._model.rotation.z;
          this._eyeGroups.forEach(g => {
            this._baseEyeRotations[g.name] = {
              x: g.rotation.x,
              y: g.rotation.y
            };
          });

          this._scene.add(this._model);

          if (this._morphMesh) {
            console.log(
              `[AvatarPlayer] Loaded morph targets: ${Object.keys(this._morphDict).length}`,
              Object.keys(this._morphDict)
            );
          } else {
            console.warn('[AvatarPlayer] No morph targets found in GLB.');
          }

          // Start the render loop
          this._startLoop();

          this._canvas.dispatchEvent(new CustomEvent('avatar-loaded', { bubbles: true }));
          resolve();
        },
        undefined,
        (err) => {
          console.error('[AvatarPlayer] GLB load error:', err);
          this._canvas.dispatchEvent(new CustomEvent('avatar-error', { bubbles: true }));
          reject(err);
        }
      );
    });
  }

  /**
   * Supply pre-baked blendshape animation data.
   *
   * @param {Object} jsonData
   * @param {number} jsonData.fps - Frames per second of the data.
   * @param {Array<Object>} jsonData.frames - Array of keyframe objects.
   *   Each frame has a `t` property (seconds) and zero or more blendshape
   *   name/value pairs, e.g. `{ t: 0.0, jawOpen: 0.4, mouthSmileLeft: 0.1 }`.
   */
  setBlendshapeData(jsonData) {
    this._bsData = jsonData;
  }

  /**
   * Start blendshape animation synced to an audio element.
   *
   * If pre-baked blendshape data has been set via setBlendshapeData(), the
   * playback interpolates those keyframes against `audioElement.currentTime`.
   *
   * Otherwise, a procedural amplitude-based lip-sync is used via the Web
   * Audio API AnalyserNode.
   *
   * @param {HTMLAudioElement} audioElement
   */
  play(audioElement) {
    this._audioEl = audioElement;
    this._playing = true;

    // Set up Web Audio analyser for amplitude-based fallback lip-sync
    if (!this._bsData && audioElement) {
      this._setupAnalyser(audioElement);
    }
  }

  /**
   * Stop blendshape animation playback.
   * Blendshape weights decay smoothly back to idle or zero.
   */
  stop() {
    this._playing = false;
    this._audioEl = null;
    // Analyser stays connected (reusable); weights will decay via lerp.
  }

  /**
   * Return a snapshot of the current smoothed blendshape weights.
   * Useful for debug visualisations (e.g. the blendshape bar chart).
   *
   * @returns {Object<string, number>} Map of ARKit blendshape name to weight (0..1).
   */
  getWeights() {
    return { ...this._currentWeights };
  }

  /**
   * Enable or disable the "ahem" pose -- avatar looks down as if
   * clearing its throat while waiting for TTS audio.
   *
   * @param {boolean} enabled
   */
  setAhemPose(enabled) {
    this._ahemPose = enabled;
  }

  /**
   * Enable or disable procedural idle animations (blinks, breathing, micro-expressions).
   *
   * @param {boolean} enabled
   */
  setIdleMode(enabled) {
    this._idleEnabled = enabled;
  }

  /**
   * Resize the renderer and update the camera aspect ratio.
   *
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this._width = width;
    this._height = height;

    this._renderer.setSize(width, height);
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    const px = Math.min(window.devicePixelRatio, 2);

    if (this._composer) {
      this._composer.setSize(width, height);
    }
    if (this._sobelPass) {
      this._sobelPass.uniforms.uResolution.value.set(width * px, height * px);
    }

    // Update pencil material resolution uniforms
    if (this._model && this._style === 'pencil') {
      this._model.traverse((child) => {
        if (child.isMesh && child.material && child.material.uniforms && child.material.uniforms.uResolution) {
          child.material.uniforms.uResolution.value.set(width * px, height * px);
        }
      });
    }
  }

  /**
   * Clean up all Three.js resources, stop the animation loop, and
   * disconnect any audio nodes.
   */
  dispose() {
    this._disposed = true;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this._model) {
      this._scene.remove(this._model);
      this._model.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }

    if (this._composer) {
      this._composer.dispose();
    }

    this._renderer.dispose();
  }

  // -----------------------------------------------------------------------
  // Internal: animation loop
  // -----------------------------------------------------------------------

  /** @private */
  _startLoop() {
    if (this._rafId !== null) return; // already running
    this._clock.start();
    this._tick();
  }

  /** @private */
  _tick() {
    if (this._disposed) return;
    this._rafId = requestAnimationFrame(() => this._tick());

    const dt = this._clock.getDelta();

    // Determine target weights for this frame
    const targets = {};
    ARKIT_BLENDSHAPES.forEach(n => { targets[n] = 0; });

    if (this._playing && this._bsData && this._audioEl) {
      // Pre-baked blendshape data playback
      this._sampleBlendshapeData(this._audioEl.currentTime, targets);
    } else if (this._playing && this._audioEl && this._analyser) {
      // Amplitude-based procedural lip-sync
      this._proceduralLipSync(targets);
    }

    // "Ahem" pose blendshapes: eyes half-closed, slight mouth press
    if (this._ahemPose) {
      targets.eyeBlinkLeft = Math.max(targets.eyeBlinkLeft, 1.0);
      targets.eyeBlinkRight = Math.max(targets.eyeBlinkRight, 1.0);
      targets.mouthPressLeft = Math.max(targets.mouthPressLeft, 0.15);
      targets.mouthPressRight = Math.max(targets.mouthPressRight, 0.15);
      targets.mouthSmileLeft = Math.max(targets.mouthSmileLeft, 0.08);
      targets.mouthSmileRight = Math.max(targets.mouthSmileRight, 0.08);
    }

    // Eye blinks run unconditionally so the avatar blinks during TTS too
    if (this._idleEnabled) {
      this._updateBlink(dt, targets);
    }

    // Idle animations (layered on top, unless playing with baked data)
    if (this._idleEnabled && !(this._playing && this._bsData)) {
      this._updateIdle(dt, targets);
    }

    // Subtle head sway and eye saccades (always active)
    if (this._idleEnabled) {
      this._updateIdleMotion(dt);
    }

    // Smooth interpolation & apply to morph targets
    this._applyWeights(targets, dt);

    // Render
    if (this._composer && this._style === 'pencil') {
      this._renderer.setClearColor(0x000000, 0);
      this._composer.render();
    } else {
      this._renderer.render(this._scene, this._camera);
    }
  }

  // -----------------------------------------------------------------------
  // Internal: blendshape data sampling
  // -----------------------------------------------------------------------

  /**
   * Sample the pre-baked blendshape keyframe data at a given time.
   * Linearly interpolates between the two nearest keyframes.
   *
   * @private
   * @param {number} time   - Audio currentTime in seconds.
   * @param {Object} targets - Output object; blendshape name -> weight.
   */
  _sampleBlendshapeData(time, targets) {
    const frames = this._bsData.frames;
    if (!frames || frames.length === 0) return;

    // Find the two surrounding keyframes
    let i = 0;
    while (i < frames.length - 1 && frames[i + 1].t <= time) {
      i++;
    }

    const f0 = frames[i];
    const f1 = (i < frames.length - 1) ? frames[i + 1] : f0;

    // Interpolation factor
    let alpha = 0;
    if (f1 !== f0 && f1.t !== f0.t) {
      alpha = Math.min(1, Math.max(0, (time - f0.t) / (f1.t - f0.t)));
    }

    // Lerp each blendshape present in either keyframe
    ARKIT_BLENDSHAPES.forEach(name => {
      const v0 = f0[name] || 0;
      const v1 = f1[name] || 0;
      targets[name] = v0 + (v1 - v0) * alpha;
    });
  }

  // -----------------------------------------------------------------------
  // Internal: amplitude lip-sync
  // -----------------------------------------------------------------------

  /** @private */
  _setupAnalyser(audioElement) {
    try {
      // Reuse or create AudioContext
      if (!AvatarPlayer._audioCtx) {
        AvatarPlayer._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = AvatarPlayer._audioCtx;

      // Resume AudioContext if suspended (required after creation without user gesture)
      if (ctx.state === 'suspended') ctx.resume();

      // Only create a MediaElementSource once per audio element
      if (!audioElement._avatarSource) {
        audioElement._avatarSource = ctx.createMediaElementSource(audioElement);
        audioElement._avatarSource.connect(ctx.destination);
      }

      this._analyser = ctx.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyserData = new Uint8Array(this._analyser.frequencyBinCount);
      audioElement._avatarSource.connect(this._analyser);
    } catch (e) {
      console.warn('[AvatarPlayer] Could not create audio analyser:', e);
    }
  }

  /**
   * Simple amplitude-to-viseme mapping for procedural lip-sync.
   *
   * @private
   * @param {Object} targets - Output blendshape target weights.
   */
  _proceduralLipSync(targets) {
    if (!this._analyser || !this._analyserData) return;

    this._analyser.getByteFrequencyData(this._analyserData);

    // Compute average amplitude (0-255)
    let sum = 0;
    for (let i = 0; i < this._analyserData.length; i++) {
      sum += this._analyserData[i];
    }
    const avg = sum / this._analyserData.length / 255; // normalise to 0..1

    // Low frequency energy (vowels tend to be low-freq)
    let lowSum = 0;
    const lowBins = Math.floor(this._analyserData.length * 0.25);
    for (let i = 0; i < lowBins; i++) {
      lowSum += this._analyserData[i];
    }
    const lowAvg = lowSum / lowBins / 255;

    // High frequency energy (consonants/sibilants)
    let highSum = 0;
    const highStart = Math.floor(this._analyserData.length * 0.6);
    for (let i = highStart; i < this._analyserData.length; i++) {
      highSum += this._analyserData[i];
    }
    const highAvg = highSum / (this._analyserData.length - highStart) / 255;

    // Map amplitude to jaw opening (capped for natural look)
    const jawOpen = Math.min(0.6, avg * 1.4);
    targets.jawOpen = jawOpen;

    // Vowel-like shapes (wide open mouth)
    if (lowAvg > 0.15) {
      targets.mouthFunnel = lowAvg * 0.3;
      targets.mouthLowerDownLeft = lowAvg * 0.2;
      targets.mouthLowerDownRight = lowAvg * 0.2;
      targets.mouthUpperUpLeft = lowAvg * 0.1;
      targets.mouthUpperUpRight = lowAvg * 0.1;
    }

    // Sibilant / consonant shapes
    if (highAvg > 0.1) {
      targets.mouthPucker = highAvg * 0.3;
      targets.mouthStretchLeft = highAvg * 0.15;
      targets.mouthStretchRight = highAvg * 0.15;
    }

    // Slight smile when speaking
    const smileAmount = avg * 0.1;
    targets.mouthSmileLeft = smileAmount;
    targets.mouthSmileRight = smileAmount;

    // Subtle brow movement tied to emphasis
    if (avg > 0.4) {
      targets.browInnerUp = (avg - 0.4) * 0.3;
    }
  }

  // -----------------------------------------------------------------------
  // Internal: idle animation
  // -----------------------------------------------------------------------

  /**
   * Procedural idle animation: blinks, breathing, micro-expressions.
   *
   * @private
   * @param {number} dt       - Delta time in seconds.
   * @param {Object} targets  - Blendshape target weights to modify.
   */
  /**
   * Procedural eye blinks -- runs even during baked lip-sync playback so
   * the avatar never stares without blinking.
   *
   * @private
   */
  _updateBlink(dt, targets) {
    const idle = this._idleState;
    idle.blinkTimer -= dt;
    if (idle.blinkTimer <= 0) {
      idle.blinkPhase = 1.0; // start blink
      idle.blinkTimer = 3.0 + Math.random() * 2.0; // next blink in 3-5s
    }
    if (idle.blinkPhase > 0) {
      // Blink curve: quick close then slower open
      const blinkValue = idle.blinkPhase > 0.5
        ? (1.0 - idle.blinkPhase) * 2.0  // opening
        : idle.blinkPhase * 2.0;          // closing
      targets.eyeBlinkLeft = Math.max(targets.eyeBlinkLeft, blinkValue);
      targets.eyeBlinkRight = Math.max(targets.eyeBlinkRight, blinkValue);
      idle.blinkPhase -= dt * 5; // blink lasts ~0.2s
      if (idle.blinkPhase < 0) idle.blinkPhase = 0;
    }
  }

  _updateIdle(dt, targets) {
    const idle = this._idleState;

    // --- Breathing (subtle jaw oscillation) ---
    idle.breathPhase += dt * 1.2; // ~0.6Hz breathing rate
    const breathVal = (Math.sin(idle.breathPhase) * 0.5 + 0.5) * 0.02;
    targets.jawOpen = Math.max(targets.jawOpen, breathVal);

    // --- Micro-expressions ---
    idle.microTimer -= dt;
    if (idle.microTimer <= 0) {
      // Pick a random micro-expression
      const microOptions = [
        { browInnerUp: 0.15 + Math.random() * 0.1 },
        { mouthSmileLeft: 0.08, mouthSmileRight: 0.08 },
        { eyeSquintLeft: 0.1, eyeSquintRight: 0.1 },
        { mouthPressLeft: 0.05, mouthPressRight: 0.05 },
        { browOuterUpLeft: 0.1 },
        { noseSneerLeft: 0.06, noseSneerRight: 0.06 },
        {} // sometimes nothing
      ];
      idle.microTarget = microOptions[Math.floor(Math.random() * microOptions.length)];
      idle.microCurrent = {};
      idle.microTimer = 4.0 + Math.random() * 6.0; // next in 4-10s
    }

    // Blend micro-expression towards target
    for (const [name, targetVal] of Object.entries(idle.microTarget)) {
      const cur = idle.microCurrent[name] || 0;
      const next = cur + (targetVal - cur) * dt * 2;
      idle.microCurrent[name] = next;
      targets[name] = Math.max(targets[name] || 0, next);
    }
    // Decay micro-expression weights not in current target
    for (const [name, cur] of Object.entries(idle.microCurrent)) {
      if (!(name in idle.microTarget)) {
        const next = cur * (1 - dt * 3);
        idle.microCurrent[name] = next;
        if (next > 0.001) {
          targets[name] = Math.max(targets[name] || 0, next);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Gaze tracking
  // -----------------------------------------------------------------------

  /**
   * Set an external gaze target in page coordinates.
   *
   * @param {number|null} pageX - Target X in page coords, or null to clear.
   * @param {number|null} pageY - Target Y in page coords, or null to clear.
   * @param {'mouse'|'reading'} source - Which input source provides the target.
   */
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

  /**
   * Clear a gaze target source.
   * @param {'mouse'|'reading'} source
   */
  clearGazeTarget(source) {
    const gs = this._gazeState;
    if (source === 'mouse') {
      gs.mousePageX = null;
      gs.mousePageY = null;
    } else if (source === 'reading') {
      gs.readingPageX = null;
      gs.readingPageY = null;
    }
  }

  /**
   * Determine the active gaze target and compute yaw/pitch angles.
   * Priority: reading > mouse > idle.
   *
   * @private
   * @param {number} dt - Delta time in seconds.
   * @returns {{ yaw: number, pitch: number, hasTarget: boolean }}
   */
  _resolveGazeTarget(dt) {
    const gs = this._gazeState;
    const cfg = this._gazeConfig;

    const now = performance.now();

    // Refresh canvas bounding rect periodically
    if (!gs.canvasRect || now - (gs._rectTime || 0) > cfg.rectRefreshInterval * 1000) {
      gs.canvasRect = this._canvas.getBoundingClientRect();
      gs._rectTime = now;
    }

    const rect = gs.canvasRect;
    if (!rect) return { yaw: 0, pitch: 0, hasTarget: false };

    const cx = rect.left + rect.width / 2 + window.scrollX;
    const cy = rect.top + rect.height / 2 + window.scrollY;

    // Helper: compute clamped yaw/pitch from page coords
    const compute = (px, py) => {
      const dx = px - cx;
      const dy = py - cy;
      return {
        yaw:  Math.max(-cfg.maxYaw,   Math.min(cfg.maxYaw,   Math.atan2(dx, cfg.virtualDistance))),
        pitch: Math.max(-cfg.maxPitch * 0.5, Math.min(cfg.maxPitch, Math.atan2(dy, cfg.virtualDistance))),
        hasTarget: true
      };
    };

    // 1. Reading target (highest priority)
    if (gs.readingPageX !== null && gs.readingPageY !== null) {
      return compute(gs.readingPageX, gs.readingPageY);
    }

    // 2. Mouse target (if not stale -- use wall-clock time, not accumulated dt)
    const mouseAge = (now - gs.mouseLastMoveTime) / 1000;
    if (gs.mousePageX !== null && mouseAge < cfg.mouseStaleTimeout) {
      return compute(gs.mousePageX, gs.mousePageY);
    }

    // 3. Idle fallback
    return { yaw: 0, pitch: 0, hasTarget: false };
  }

  // -----------------------------------------------------------------------
  // Internal: idle head sway & eye saccades
  // -----------------------------------------------------------------------

  /**
   * Animate subtle head rotation and eye gaze shifts so the avatar
   * feels alive even when not speaking. Integrates gaze tracking when
   * a target is active.
   *
   * @private
   * @param {number} dt - Delta time in seconds.
   */
  _updateIdleMotion(dt) {
    if (!this._model) return;
    dt = Math.min(dt, 0.1); // clamp to 100ms to handle rAF throttling

    const idle = this._idleState;
    const gs = this._gazeState;
    const cfg = this._gazeConfig;

    idle.headTime += dt;
    const t = idle.headTime;

    // --- Resolve gaze target ---
    const gaze = this._resolveGazeTarget(dt);

    // "Ahem" pose: override gaze to look downward
    if (this._ahemPose) {
      gaze.yaw = 0;
      gaze.pitch = -0.18;
      gaze.hasTarget = true;
    }

    // Smooth interpolation toward target gaze angles
    const lerpFactor = 1 - Math.exp(-cfg.smoothSpeed * dt);
    gs.currentYaw  += (gaze.yaw  - gs.currentYaw)  * lerpFactor;
    gs.currentPitch += (gaze.pitch - gs.currentPitch) * lerpFactor;

    // --- Head sway (layered sine waves) ---
    // Attenuate when actively tracking a target
    const sw = gaze.hasTarget ? cfg.idleSwayAttenuation : 1.0;

    const nodPrimary    = Math.sin(t * 0.4)  * 0.032 * sw;
    const nodSecondary  = Math.sin(t * 1.1)  * 0.012 * sw;
    const turnPrimary   = Math.sin(t * 0.3)  * 0.040 * sw;
    const turnSecondary = Math.sin(t * 0.9)  * 0.016 * sw;
    const tilt          = Math.sin(t * 0.25) * 0.020 * sw;

    // Combine: base + gaze offset + idle sway
    this._model.rotation.x = this._baseModelRotX
      + gs.currentPitch + nodPrimary + nodSecondary;
    this._model.rotation.y = (this._baseModelRotY || 0)
      + gs.currentYaw + turnPrimary + turnSecondary;
    this._model.rotation.z = (this._baseModelRotZ || 0) + tilt;

    // --- Eye saccades + gaze tracking ---
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

    // Eyes track a fraction of the gaze offset (look slightly ahead of head)
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
  // Internal: apply blendshape weights
  // -----------------------------------------------------------------------

  /**
   * Smoothly interpolate current morph-target weights towards targets
   * and write them to the mesh.
   *
   * @private
   * @param {Object} targets - Desired blendshape weights.
   * @param {number} dt      - Frame delta time in seconds.
   */
  _applyWeights(targets, dt) {
    if (!this._morphMesh || !this._morphMesh.morphTargetInfluences) return;

    // Use tighter smoothing when playing baked blendshape data so
    // the lip-sync stays in lockstep with the audio. The default
    // smoothing (~0.89 per frame) is fine for idle decay but adds
    // visible latency to pre-keyed animation.
    const hasBakedData = this._playing && this._bsData;
    const fastSmoothing = 1 - Math.pow(0.00001, dt);  // ~0.98 – nearly instant
    const gentleSmoothing = 1 - Math.pow(0.001, dt);  // ~0.89 – gentle idle decay

    ARKIT_BLENDSHAPES.forEach(name => {
      const target = targets[name] || 0;
      const current = this._currentWeights[name] || 0;

      // Eye blinks always use gentle smoothing so procedural blinks
      // are visible even during baked lip-sync playback.
      const isBlink = name === 'eyeBlinkLeft' || name === 'eyeBlinkRight';
      const smoothing = (hasBakedData && !isBlink) ? fastSmoothing : gentleSmoothing;

      const next = current + (target - current) * smoothing;
      this._currentWeights[name] = next;

      // Write to morph target if present
      const idx = this._morphDict[name];
      if (idx !== undefined) {
        this._morphMesh.morphTargetInfluences[idx] = next;
      }
    });
  }
}

// Static shared AudioContext
/** @private */
AvatarPlayer._audioCtx = null;

/**
 * Normalize an ARKit blendshape name between Apple-style suffixes (_L/_R)
 * and camelCase (Left/Right).
 *
 * Examples:
 *   browDown_L   -> browDownLeft
 *   eyeBlink_R   -> eyeBlinkRight
 *   browDownLeft -> browDown_L
 *   jawOpen      -> jawOpen (no change)
 *
 * @private
 * @param {string} name
 * @returns {string} The alternative spelling of the same blendshape.
 */
AvatarPlayer._normalizeBS = function (name) {
  // _L/_R -> Left/Right (Apple -> camelCase)
  if (name.endsWith('_L')) return name.slice(0, -2) + 'Left';
  if (name.endsWith('_R')) return name.slice(0, -2) + 'Right';
  // Left/Right -> _L/_R (camelCase -> Apple)
  if (name.endsWith('Left'))  return name.slice(0, -4) + '_L';
  if (name.endsWith('Right')) return name.slice(0, -5) + '_R';
  return name;
};

export { AvatarPlayer, ARKIT_BLENDSHAPES };
