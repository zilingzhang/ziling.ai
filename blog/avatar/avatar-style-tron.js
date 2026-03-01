/**
 * avatar-style-tron.js
 *
 * Tron Legacy neon circuit line aesthetic for GLB avatars.
 *
 * Renders the model as a near-black matte body with glowing cyan/blue
 * circuit lines running across the surface, like a Tron program:
 *   - Nearly black base body with subtle NdotL shading
 *   - UV-based grid circuit lines with traveling pulse animation
 *   - Cyan Fresnel rim glow on edges
 *   - UnrealBloomPass for circuit line glow
 *
 * Usage:
 *   import { init } from './avatar-style-tron.js';
 *   const cleanup = await init(canvasElement, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-tron
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
// Tron Circuit ShaderMaterial definition
// ---------------------------------------------------------------------------

const TronVertexShader = /* glsl */ `
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

const TronFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 lightDir = normalize(uLightDir);

    // ---- NdotL shading for subtle facial features ----
    float NdotL = max(dot(n, lightDir), 0.0);
    float shading = mix(0.03, 0.08, NdotL);
    vec3 baseColor = vec3(0.03, 0.03, 0.05) + vec3(shading);

    // ---- Circuit grid lines ----
    // Create a grid by computing distance to cell edges in UV space
    vec2 gridUV = fract(vUv * 12.0);

    // Distance from edge in each axis (0 at edge, 0.5 at centre)
    float dX = min(gridUV.x, 1.0 - gridUV.x);
    float dY = min(gridUV.y, 1.0 - gridUV.y);

    // Thin lines at cell edges (~0.02 UV width)
    float lineX = 1.0 - smoothstep(0.0, 0.02, dX);
    float lineY = 1.0 - smoothstep(0.0, 0.02, dY);
    float lineMask = max(lineX, lineY);

    // ---- Traveling pulse along circuit lines ----
    float pulse = sin(vUv.x * 20.0 + vUv.y * 20.0 - uTime * 3.0);
    pulse = pulse * 0.5 + 0.5;  // remap to 0..1
    float pulseBrightness = mix(0.4, 1.0, pulse);

    // Circuit line colour: cyan, modulated by pulse
    vec3 lineColor = vec3(0.0, 0.3, 0.4) * lineMask * pulseBrightness;

    // ---- Fresnel rim glow ----
    float fresnel = 1.0 - max(dot(viewDir, n), 0.0);
    vec3 rimColor = vec3(0.0, 0.2, 0.3) * pow(fresnel, 2.5) * 0.4;

    // ---- Compose ----
    vec3 finalColor = baseColor + lineColor + rimColor;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialise the Tron Legacy circuit renderer on the given canvas.
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
  renderer.setClearColor(0x000000, 1);
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
  // Dim cyan-white directional from front-right
  const dirLight = new THREE.DirectionalLight(0x88ccdd, 0.5);
  dirLight.position.set(1.0, 0.5, 1.5);
  scene.add(dirLight);

  // Tiny ambient
  const ambientLight = new THREE.AmbientLight(0x334455, 0.15);
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
    0.3,   // radius
    0.4    // threshold -- only circuit lines should bloom
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

  // ---- Tron material uniforms (shared) ----
  const tronUniforms = {
    uTime:     { value: 0.0 },
    uLightDir: { value: new THREE.Vector3(1.0, 0.5, 1.5).normalize() }
  };

  // Apply Tron shader to every mesh in the GLB
  model.traverse((child) => {
    if (!child.isMesh) return;

    const tronMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:     tronUniforms.uTime,
        uLightDir: tronUniforms.uLightDir
      },
      vertexShader:   TronVertexShader,
      fragmentShader: TronFragmentShader,
      transparent: false,
      blending:    THREE.NormalBlending,
      side:        THREE.DoubleSide
    });

    // Preserve morph target data across material swap
    const influences = child.morphTargetInfluences;
    const dict       = child.morphTargetDictionary;
    child.material   = tronMat;
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
    tronUniforms.uTime.value = elapsed;

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
