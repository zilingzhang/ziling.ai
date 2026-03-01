/**
 * avatar-style-terminator.js
 *
 * Terminator T-800 Red Scanner -- the avatar is rendered as if viewed through
 * the T-800's red-tinted HUD.  Dark metallic body with a deep red color cast,
 * bright red Fresnel edges like the glowing red eye scanner, and a horizontal
 * scanner line that sweeps up and down across the model.
 *
 * Usage (ES module, requires importmap for "three"):
 *
 *   import { init } from './avatar-style-terminator.js';
 *   const cleanup = await init(canvas, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-terminator
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

const BG_COLOR = 0x080202;

// ---------------------------------------------------------------------------
// Terminator T-800 Shader Material
// ---------------------------------------------------------------------------

const TerminatorVertexShader = /* glsl */ `
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

const TerminatorFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // -- Pseudo-random hash --------------------------------------------------
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // -- Toon shading (3-band, very dark red-brown / metallic) -------------
    float NdotL = dot(N, L);
    float raw = NdotL * 0.5 + 0.5;

    // Base color: very dark desaturated red-brown
    vec3 baseColor = vec3(0.12, 0.04, 0.03);

    // Three discrete bands - all very dark
    float band;
    if (raw > 0.66) {
      band = 0.25;       // lit
    } else if (raw > 0.33) {
      band = 0.15;       // mid
    } else {
      band = 0.08;       // shadow
    }

    vec3 color = baseColor * band / 0.25; // normalize so lit band = baseColor

    // -- Fresnel rim glow (bright red, T-800 scanner edge) -----------------
    float fresnel = 1.0 - max(dot(N, V), 0.0);
    fresnel = pow(fresnel, 2.0) * 0.5;
    vec3 rimColor = vec3(0.4, 0.02, 0.01);
    color += rimColor * fresnel;

    // -- Horizontal scanner line (ping-pong sweep) -------------------------
    // Sweeps between -0.6 and 0.6 in world Y
    float scanY = sin(uTime * 1.2) * 0.6;
    float scanDist = abs(vWorldPos.y - scanY);
    // Thin band ~0.02 world units with smooth falloff
    float scanLine = smoothstep(0.04, 0.0, scanDist);
    vec3 scanColor = vec3(0.5, 0.05, 0.02);
    color += scanColor * scanLine;

    // -- Digital noise grain (subtle 5% modulation) ------------------------
    float grain = hash(vUv * 500.0 + vec2(uTime * 7.3, uTime * 11.1));
    color *= 1.0 + (grain - 0.5) * 0.1; // +/- 5%

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialize the Terminator T-800 Red Scanner avatar renderer.
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

  // --- Lighting (dim red tones) ---
  // Very dim red ambient
  const ambient = new THREE.AmbientLight(0x200505, 0.2);
  scene.add(ambient);

  // Dim red directional from front
  const dirLight = new THREE.DirectionalLight(0xff2020, 0.6);
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
    0.6,   // strength
    0.4,   // radius
    0.45   // threshold - only scanner line and rim should bloom
  );
  composer.addPass(bloomPass);

  // --- Shared uniforms ---
  const shaderUniforms = {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() }
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

  const model = gltf.scene;

  // Center and scale
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

  // Apply Terminator shader material to all meshes
  model.traverse((child) => {
    if (!child.isMesh) return;

    const terminatorMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shaderUniforms.uTime,
        uLightDir: shaderUniforms.uLightDir
      },
      vertexShader: TerminatorVertexShader,
      fragmentShader: TerminatorFragmentShader,
      blending: THREE.NormalBlending,
      transparent: false,
      side: THREE.DoubleSide
    });

    // Preserve morph target data
    const influences = child.morphTargetInfluences;
    const dict = child.morphTargetDictionary;
    child.material = terminatorMat;
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

    const elapsed = clock.elapsedTime;

    // Update shared uniforms
    shaderUniforms.uTime.value = elapsed;

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
