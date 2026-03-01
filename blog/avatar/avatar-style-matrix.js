/**
 * avatar-style-matrix.js
 *
 * Matrix Digital Rain -- the avatar is rendered as if it exists inside the
 * Matrix's green code rain.  The face is visible beneath cascading vertical
 * columns of bright green "rain drops" that fall and fade, with a green Fresnel
 * edge glow, scan-line overlay, and subtle bloom.  All effects are shader-only
 * (no particle systems).
 *
 * Usage (ES module, requires importmap for "three"):
 *
 *   import { init } from './avatar-style-matrix.js';
 *   const cleanup = await init(canvas, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-matrix
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
// Constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x000a02;

// ---------------------------------------------------------------------------
// Matrix Shader Material
// ---------------------------------------------------------------------------

const MatrixVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    #include <begin_vertex>
    #include <morphtarget_vertex>

    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const MatrixFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // -- Pseudo-random hash --------------------------------------------------
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // -- NdotL lighting for face form -------------------------------------
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    float NdotL = max(dot(N, L), 0.0);

    // Map NdotL from 0.03 (shadow) to 0.12 (lit)
    float shade = mix(0.03, 0.12, NdotL);

    // Base color: dark green-black with NdotL form
    vec3 baseColor = vec3(0.01, 0.06, 0.02) * (1.0 + shade * 4.0);

    // -- Digital rain effect -----------------------------------------------
    // Quantize into vertical columns
    float columnCount = 30.0;
    float colId = floor(vUv.x * columnCount);
    float colFrac = fract(vUv.x * columnCount);

    // Each column gets a unique speed and phase from hash
    float colSeed = hash(colId * 13.7);
    float speed = 0.3 + colSeed * 0.7;

    // Falling bright spot position (wraps via fract)
    float rainPos = fract(vUv.y + uTime * speed + colSeed * 6.28);

    // Create a downward-fading tail: bright at the drop head, fading over ~0.15
    // rainPos near 1.0 is the "head" of the drop, trailing downward toward 0.0
    float tailLength = 0.15;
    float dropBrightness = smoothstep(0.0, tailLength, rainPos) *
                           smoothstep(tailLength * 2.5, tailLength, rainPos);

    // Vary intensity per column so not all columns are equally bright
    float colIntensity = 0.4 + 0.6 * hash(colId * 7.3 + 0.5);

    // Second rain layer with different timing for density
    float colSeed2 = hash(colId * 31.1 + 5.0);
    float speed2 = 0.2 + colSeed2 * 0.5;
    float rainPos2 = fract(vUv.y + uTime * speed2 + colSeed2 * 4.17 + 0.5);
    float dropBrightness2 = smoothstep(0.0, tailLength, rainPos2) *
                            smoothstep(tailLength * 2.5, tailLength, rainPos2);
    float colIntensity2 = 0.3 + 0.5 * hash(colId * 19.3 + 2.0);

    // Combine rain drops
    float rain = dropBrightness * colIntensity + dropBrightness2 * colIntensity2 * 0.5;

    // Rain color: bright green at peak
    vec3 rainColor = vec3(0.0, 0.35, 0.05) * rain;

    // -- Fresnel edge glow (green) -----------------------------------------
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - max(dot(N, viewDir), 0.0);
    vec3 fresnelGlow = vec3(0.0, 0.2, 0.03) * pow(fresnel, 2.5) * 0.3;

    // -- Scan line effect (subtle, ~every 4 pixels) ------------------------
    // Use screen-space Y approximation via gl_FragCoord
    float scanLine = 0.9 + 0.1 * step(0.5, fract(gl_FragCoord.y * 0.25));

    // -- Composite ---------------------------------------------------------
    vec3 color = baseColor + rainColor + fresnelGlow;
    color *= scanLine;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialize the Matrix Digital Rain avatar renderer.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @param {string} glbUrl - Relative path to a .glb file.
 * @returns {Promise<Function>} A cleanup function that disposes all resources.
 */
export async function init(canvas, glbUrl) {
  // --- Sizing ---
  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  const dpr = Math.min(window.devicePixelRatio, 2);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
  renderer.setClearColor(BG_COLOR, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  // --- Camera ---
  const aspect = width / height;
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
  camera.position.set(-0.04, -0.68, 4.24);
  camera.lookAt(0, 0.12, 0);

  // --- Orbit controls ---
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

  // --- Lighting (dim green) ---
  // Dim green ambient
  const ambient = new THREE.AmbientLight(0x002a06, 0.15);
  scene.add(ambient);

  // Dim green directional from front
  const dirLight = new THREE.DirectionalLight(0x00ff20, 0.5);
  dirLight.position.set(0.5, 0.8, 1.5);
  scene.add(dirLight);

  // --- Post-processing ---
  const renderTarget = new THREE.WebGLRenderTarget(width * dpr, height * dpr, {
    type: THREE.HalfFloatType,
    samples: 4
  });
  const composer = new EffectComposer(renderer, renderTarget);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width * dpr, height * dpr),
    0.5,   // strength
    0.3,   // radius
    0.45   // threshold
  );
  composer.addPass(bloomPass);

  // --- Shared uniforms ---
  const matrixUniforms = {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 1.5).normalize() }
  };

  // --- Load GLB ---
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
  const gltf = await new Promise((resolve, reject) => {
    loader.load(glbUrl, resolve, undefined, reject);
  });

  // --- Model centering/scaling ---
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(centre);
  const targetHeight = 1.6;
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);
  model.position.y -= 0.05;
  model.rotation.x = 0.20;
  model.rotation.y = -0.26;

  // Apply Matrix shader material to all meshes
  model.traverse((child) => {
    if (!child.isMesh) return;

    const matrixMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: matrixUniforms.uTime,
        uLightDir: matrixUniforms.uLightDir
      },
      vertexShader: MatrixVertexShader,
      fragmentShader: MatrixFragmentShader,
      blending: THREE.NormalBlending,
      transparent: false,
      side: THREE.DoubleSide
    });

    // Preserve morph target data
    const influences = child.morphTargetInfluences;
    const dict = child.morphTargetDictionary;
    child.material = matrixMat;
    if (influences) child.morphTargetInfluences = influences;
    if (dict) child.morphTargetDictionary = dict;
  });

  scene.add(model);
  canvas._model = model;

  // --- Subtle model rotation state ---
  const baseRotY = model.rotation.y;

  // --- Animation state ---
  let disposed = false;
  let rafId = null;
  const clock = new THREE.Clock();

  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;

    // Update shared uniforms
    matrixUniforms.uTime.value = elapsed;

    // Subtle model rotation oscillation
    if (!canvas._externalRotation) model.rotation.y = baseRotY + Math.sin(elapsed * 0.3) * 0.015;

    // Update orbit controls
    controls.update();

    // Render
    composer.render();
  }

  clock.start();
  animate();

  // --- Cleanup function ---
  function cleanup() {
    disposed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // Dispose model
    scene.remove(model);
    model.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
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
