/**
 * avatar-style-ghost.js
 *
 * Ghost in the Shell thermoptic camouflage / digital dissolution aesthetic
 * for GLB avatars.
 *
 * Renders the model with:
 *   - Thermoptic camo: noise-driven patches of transparency that animate
 *     in and out, simulating active optical camouflage
 *   - Cloaking-edge shimmer at the boundary between visible/invisible
 *   - Purple-blue Fresnel rim glow
 *   - Refraction-like heat shimmer on the surface via UV noise offset
 *   - Cool blue-gray base with NdotL shading
 *   - UnrealBloomPass for subtle glow
 *
 * Usage:
 *   import { init } from './avatar-style-ghost.js';
 *   const cleanup = await init(canvasElement, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-ghost
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
// Thermoptic Camo ShaderMaterial definition
// ---------------------------------------------------------------------------

const ThermopticVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>

  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    #include <begin_vertex>
    #include <morphtarget_vertex>

    vec3 norm = normalize(normalMatrix * normal);
    vNormal = norm;
    vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const ThermopticFragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // ---- helpers ----

  // Hash-based pseudo-random
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // 2D value noise for heat shimmer
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // View direction for Fresnel
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 n = normalize(vNormal);

    // ---- Simple NdotL directional shading ----
    vec3 lightDir = normalize(vec3(0.3, 0.8, 1.0));
    float NdotL = max(dot(n, lightDir), 0.0);

    // ---- Base colour: cool blue-gray ----
    vec3 baseColor = vec3(0.08, 0.10, 0.18);
    baseColor *= 0.4 + 0.6 * NdotL;

    // ---- Heat shimmer: slight UV distortion via noise ----
    float shimmer = valueNoise(vWorldPos.xy * 6.0 + uTime * 0.8);
    vec2 distortedUv = vUv + (shimmer - 0.5) * 0.015;
    // Modulate base color subtly based on distorted coords
    float shimmerFactor = valueNoise(distortedUv * 12.0 + uTime * 0.3);
    baseColor *= 0.90 + shimmerFactor * 0.10;

    // ---- Thermoptic camo: tile-based visibility ----
    // Quantize world position into blocks and hash for a patchy pattern
    vec2 camoCoord = floor(vWorldPos.xy * 8.0) + floor(vWorldPos.z * 4.0);
    float camo = hash(camoCoord + floor(uTime * 0.5));

    // Visible threshold (areas above 0.3 are "visible")
    float visible = smoothstep(0.25, 0.35, camo);

    // ---- Cloaking-edge shimmer ----
    // Glow at the boundary between visible and invisible patches
    float edgeDist = abs(camo - 0.3);
    float edgeGlow = smoothstep(0.08, 0.0, edgeDist);
    vec3 edgeColor = vec3(0.15, 0.10, 0.35);
    baseColor += edgeColor * edgeGlow * 0.8;

    // ---- Fresnel rim glow: purple-blue ----
    float fresnel = 1.0 - max(dot(viewDir, n), 0.0);
    vec3 rimColor = vec3(0.10, 0.05, 0.30);
    baseColor += rimColor * pow(fresnel, 2.0) * 0.4;

    // ---- Alpha: blend between cloaked (translucent) and visible ----
    // Cloaked areas: faint ghostly translucence
    // Visible areas: mostly opaque
    float alpha = mix(0.15, 0.95, visible);

    // Boost alpha slightly at edges for shimmer visibility
    alpha = max(alpha, edgeGlow * 0.6);

    // Fresnel adds a touch of opacity at glancing angles
    alpha = min(alpha + pow(fresnel, 3.0) * 0.15, 1.0);

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialise the Ghost thermoptic camo renderer on the given canvas.
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
  renderer.setClearColor(0x050510, 1);
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

  // ---- Lighting ----
  // Cool white directional from front
  const dirLight = new THREE.DirectionalLight(0xddeeff, 0.6);
  dirLight.position.set(0.3, 0.8, 1.5);
  scene.add(dirLight);

  // Dim purple ambient
  const ambientLight = new THREE.AmbientLight(0x221133, 0.2);
  scene.add(ambientLight);

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
    0.5,   // strength
    0.3,   // radius
    0.45   // threshold
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

  // ---- Thermoptic material uniforms (shared) ----
  const camoUniforms = {
    uTime: { value: 0.0 }
  };

  // Apply thermoptic camo shader to every mesh in the GLB
  model.traverse((child) => {
    if (!child.isMesh) return;

    const camoMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: camoUniforms.uTime
      },
      vertexShader:   ThermopticVertexShader,
      fragmentShader: ThermopticFragmentShader,
      transparent: true,
      blending:    THREE.NormalBlending,
      depthWrite:  false,
      side:        THREE.DoubleSide
    });

    // Preserve morph target data across material swap
    const influences = child.morphTargetInfluences;
    const dict       = child.morphTargetDictionary;
    child.material   = camoMat;
    if (influences) child.morphTargetInfluences = influences;
    if (dict)       child.morphTargetDictionary = dict;
  });

  scene.add(model);
  canvas._model = model;

  // ---- Animation state ----
  let rafId    = null;
  let disposed = false;

  // Store base rotation for idle oscillation
  const baseRotY = model.rotation.y;

  // ---- Animation loop ----
  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);

    const elapsed = clock.getElapsedTime();

    // Update time uniform
    camoUniforms.uTime.value = elapsed;

    // ---- Idle Y-rotation oscillation ----
    if (!canvas._externalRotation) model.rotation.y = baseRotY + Math.sin(elapsed * 0.35) * 0.04;

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
