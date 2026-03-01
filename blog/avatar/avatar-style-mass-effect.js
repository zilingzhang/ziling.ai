/**
 * avatar-style-mass-effect.js
 *
 * Mass Effect biotic energy / dark energy aesthetic for GLB avatars.
 *
 * Renders the model enveloped in biotic dark energy with:
 *   - Deep blue-purple base color with NdotL shading
 *   - Swirling energy tendrils via animated 2D noise patterns
 *   - Blue-violet Fresnel rim glow (biotic barrier effect)
 *   - Pulsing energy field vertex displacement
 *   - Subtle crackle line patterns
 *   - UnrealBloomPass for soft energy bloom
 *
 * Usage:
 *   import { init } from './avatar-style-mass-effect.js';
 *   const cleanup = await init(canvasElement, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-mass-effect
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
// Biotic Energy ShaderMaterial definition
// ---------------------------------------------------------------------------

const BioticVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>

  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    #include <begin_vertex>
    #include <morphtarget_vertex>

    // Pulsing energy field displacement along normals
    float pulse = sin(uTime * 2.0 + transformed.y * 5.0) * 0.002;
    transformed += normal * pulse;

    vec3 norm = normalize(normalMatrix * normal);
    vNormal = norm;
    vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const BioticFragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // ---- Hash-based pseudo-random ----
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // ---- 2D simplex-like noise via hash functions ----
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    // Four corners
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    // View direction for Fresnel
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 n = normalize(vNormal);

    // ---- Simple directional NdotL shading ----
    vec3 lightDir = normalize(vec3(0.3, 0.8, 1.0));
    float NdotL = max(dot(n, lightDir), 0.0);

    // ---- Base colour: deep dark blue-purple with NdotL ----
    vec3 baseColor = vec3(0.04, 0.02, 0.10);
    baseColor = mix(baseColor, baseColor * 3.0, NdotL * 0.35);
    // Clamp NdotL contribution to keep base in 0.04-0.15 range
    baseColor = clamp(baseColor, vec3(0.04, 0.02, 0.10), vec3(0.15, 0.08, 0.30));

    // ---- Biotic energy tendrils (swirling noise patterns) ----
    vec2 noiseCoord = vWorldPos.xz * 3.0 + uTime * 0.5;
    float tendrilNoise = noise2D(noiseCoord);
    // Layer a second octave for more detail
    float tendrilNoise2 = noise2D(noiseCoord * 2.3 + vec2(uTime * 0.3, -uTime * 0.2));
    float tendrilPattern = tendrilNoise * 0.6 + tendrilNoise2 * 0.4;

    // Energy pulsing
    float energyPulse = sin(uTime * 1.2) * 0.3 + 0.7;

    // Apply biotic energy tendrils
    vec3 tendrilColor = vec3(0.08, 0.04, 0.25);
    baseColor += tendrilColor * tendrilPattern * energyPulse * 0.6;

    // ---- Fresnel rim glow (biotic barrier) ----
    float fresnel = 1.0 - max(dot(viewDir, n), 0.0);
    vec3 rimColor = vec3(0.15, 0.05, 0.35) * pow(fresnel, 1.8) * 0.5;
    baseColor += rimColor;

    // ---- Crackle lines ----
    vec2 cellUv = fract(vUv * 15.0);
    // Hash per cell to determine if it shows a crackle
    vec2 cellId = floor(vUv * 15.0);
    float cellHash = hash(cellId + vec2(floor(uTime * 0.5)));
    if (cellHash > 0.95) {
      // Highlight cell edges as bright blue crackle lines
      float edgeDist = min(min(cellUv.x, 1.0 - cellUv.x), min(cellUv.y, 1.0 - cellUv.y));
      float crackle = smoothstep(0.05, 0.0, edgeDist);
      baseColor += vec3(0.1, 0.05, 0.3) * crackle * energyPulse;
    }

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialise the Mass Effect biotic energy renderer on the given canvas.
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
  renderer.setClearColor(0x030108, 1);
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
  // Dim blue-purple point light from front
  const bioticLight = new THREE.PointLight(0x3311aa, 0.6, 10);
  bioticLight.position.set(0.3, 0.8, 2.0);
  scene.add(bioticLight);

  // Very dim purple ambient
  const ambientLight = new THREE.AmbientLight(0x1a0833, 0.15);
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
    0.6,   // strength
    0.4,   // radius
    0.4    // threshold
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

  // ---- Biotic energy material uniforms (shared) ----
  const bioticUniforms = {
    uTime: { value: 0.0 }
  };

  // Apply biotic shader to every mesh in the GLB
  model.traverse((child) => {
    if (!child.isMesh) return;

    const bioticMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: bioticUniforms.uTime
      },
      vertexShader:   BioticVertexShader,
      fragmentShader: BioticFragmentShader,
      transparent: false,
      blending:    THREE.NormalBlending,
      side:        THREE.DoubleSide
    });

    // Preserve morph target data across material swap
    const influences = child.morphTargetInfluences;
    const dict       = child.morphTargetDictionary;
    child.material   = bioticMat;
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
    bioticUniforms.uTime.value = elapsed;

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
