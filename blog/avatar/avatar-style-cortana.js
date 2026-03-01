/**
 * avatar-style-cortana.js
 *
 * Cortana (Halo) holographic projection aesthetic for GLB avatars.
 *
 * Renders the model as a translucent blue-energy hologram with:
 *   - Fresnel rim glow (bright cyan/white edges)
 *   - Scrolling horizontal scan lines
 *   - Digital noise flicker
 *   - Breathing vertex displacement
 *   - UnrealBloomPass glow
 *   - Subtle idle Y-rotation oscillation
 *
 * Usage:
 *   import { init } from './avatar-style-cortana.js';
 *   const cleanup = await init(canvasElement, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-cortana
 */

import * as THREE from 'three';
import { GLTFLoader }     from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }    from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader }     from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder }  from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Hologram ShaderMaterial definition
// ---------------------------------------------------------------------------

const HologramVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>

  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    #include <begin_vertex>
    #include <morphtarget_vertex>

    // Subtle breathing displacement: push vertices along their normal
    // using a sine wave keyed to time and vertical position.
    vec3 norm = normalize(normalMatrix * normal);
    float breathe = sin(uTime * 1.8 + transformed.y * 4.0) * 0.003;
    transformed += normal * breathe;

    vNormal = norm;
    vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const HologramFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFlicker;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // ---- helpers ----

  // Hash-based pseudo-random (screen-space noise)
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // View direction for Fresnel
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 n = normalize(vNormal);

    // ---- Base colour: deep-blue to cyan gradient along world Y ----
    float yFactor = clamp((vWorldPos.y + 0.8) / 1.6, 0.0, 1.0);
    vec3 deepBlue = vec3(0.02, 0.10, 0.35);
    vec3 cyan     = vec3(0.04, 0.25, 0.50);
    vec3 baseColor = mix(deepBlue, cyan, yFactor);

    // ---- Fresnel rim glow ----
    float fresnel = 1.0 - max(dot(viewDir, n), 0.0);
    fresnel = pow(fresnel, 3.0);
    vec3 rimColor = vec3(0.15, 0.55, 0.85);
    baseColor += rimColor * fresnel * 0.5;

    // ---- Scan lines (thin horizontal stripes scrolling upward) ----
    float scanRaw = sin((vWorldPos.y * 80.0 + uTime * 2.0)) * 0.5 + 0.5;
    float scanLine = smoothstep(0.40, 0.50, scanRaw);
    // Blend scan lines into alpha and brightness
    float scanAlpha = mix(0.92, 1.0, scanLine);
    baseColor *= mix(0.80, 1.0, scanLine);

    // ---- Digital noise ----
    vec2 screenCoord = gl_FragCoord.xy;
    float noise = hash(screenCoord * 0.5 + vec2(uTime * 73.37, uTime * 91.13));
    // Very subtle: 5-10% modulation
    baseColor *= 0.92 + noise * 0.08;

    // ---- Compose alpha ----
    // Base transparency, modulated by scan lines and Fresnel
    float alpha = mix(0.35, 0.60, fresnel) * scanAlpha;

    // ---- Full-model flicker ----
    baseColor *= uFlicker;
    alpha *= uFlicker;

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialise the Cortana hologram renderer on the given canvas.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @param {string}           glbUrl - Relative path to a .glb model.
 * @returns {Promise<Function>} Cleanup function that disposes all resources.
 */
export async function init(canvas, glbUrl) {
  // ---- Sizing ----
  const container = canvas.parentElement;
  const width     = container.clientWidth;
  const height    = container.clientHeight;
  const dpr       = Math.min(window.devicePixelRatio, 2);

  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
  renderer.setClearColor(0x020812, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  // ---- Scene ----
  const scene = new THREE.Scene();

  // ---- Camera ----
  const aspect = width / height;
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
  camera.position.set(-0.04, -0.68, 4.24);
  camera.lookAt(0, 0.12, 0);

  // ---- Orbit controls ----
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.12, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 5.0;
  controls.update();

  // Expose camera/controls on canvas for debugging
  canvas._camera = camera;
  canvas._controls = controls;

  // ---- Lighting (minimal -- hologram is self-illuminating) ----
  const bluePoint = new THREE.PointLight(0x2266cc, 0.6, 10);
  bluePoint.position.set(0.5, 1.0, 1.5);
  scene.add(bluePoint);

  // ---- Clock ----
  const clock = new THREE.Clock();

  // ---- Post-processing ----
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: 4
  });
  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.6,   // strength (was 1.5 -- caused white blowout)
    0.4,   // radius
    0.5    // threshold (was 0.2 -- let only bright edges bloom)
  );
  composer.addPass(bloomPass);

  // ---- GLB Loader setup ----
  const loader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  loader.setDRACOLoader(dracoLoader);

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
  ktx2Loader.detectSupport(renderer);
  loader.setKTX2Loader(ktx2Loader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  // ---- Load the GLB ----
  const gltf = await new Promise((resolve, reject) => {
    loader.load(glbUrl, resolve, undefined, reject);
  });

  const model = gltf.scene;

  // Center and scale
  const box    = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());

  model.position.sub(centre);

  const targetHeight = 1.6;
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);

  // Shift down so head is near top of frame
  model.position.y -= 0.05;

  // Orient
  model.rotation.x = 0.20;
  model.rotation.y = -0.26;

  // ---- Hologram material uniforms (shared) ----
  const holoUniforms = {
    uTime:    { value: 0.0 },
    uFlicker: { value: 1.0 }
  };

  // Apply hologram shader to every mesh in the GLB
  model.traverse((child) => {
    if (!child.isMesh) return;

    const holoMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:    holoUniforms.uTime,
        uFlicker: holoUniforms.uFlicker
      },
      vertexShader:   HologramVertexShader,
      fragmentShader: HologramFragmentShader,
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      side:        THREE.DoubleSide
    });

    // Preserve morph target data across material swap
    const influences = child.morphTargetInfluences;
    const dict       = child.morphTargetDictionary;
    child.material   = holoMat;
    if (influences) child.morphTargetInfluences = influences;
    if (dict)       child.morphTargetDictionary = dict;
  });

  scene.add(model);
  canvas._model = model;

  // ---- Animation state ----
  let rafId         = null;
  let disposed      = false;
  let flickerFrames = 0;  // countdown of frames to hold flicker low

  // Store base rotation for idle oscillation
  const baseRotY = model.rotation.y;

  // ---- Animation loop ----
  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);

    const elapsed = clock.getElapsedTime();
    const dt      = clock.getDelta();

    // Update time uniform
    holoUniforms.uTime.value = elapsed;

    // ---- Flicker logic (subtle dimming, no white flash) ----
    if (flickerFrames > 0) {
      holoUniforms.uFlicker.value = 0.7;   // gentle dim, not a hard cut
      flickerFrames--;
    } else {
      holoUniforms.uFlicker.value = 1.0;
      // ~0.1% chance per frame for a brief 1-frame dim
      if (Math.random() < 0.001) {
        flickerFrames = 1;
      }
    }

    // ---- Idle Y-rotation oscillation ----
    if (!canvas._externalRotation) model.rotation.y = baseRotY + Math.sin(elapsed * 0.4) * 0.05;

    // ---- Update controls ----
    controls.update();

    // ---- Render ----
    composer.render();
  }

  clock.start();
  tick();

  // ---- Cleanup function ----
  function cleanup() {
    disposed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // Dispose model resources
    scene.remove(model);
    model.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    // Dispose post-processing
    composer.dispose();
    renderTarget.dispose();

    // Dispose controls
    controls.dispose();

    // Dispose renderer
    renderer.dispose();

    // Dispose loaders
    dracoLoader.dispose();
    ktx2Loader.dispose();
  }

  return cleanup;
}
