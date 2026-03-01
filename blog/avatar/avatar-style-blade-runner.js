/**
 * avatar-style-blade-runner.js
 *
 * Blade Runner 2049 Neon Noir -- a cinematic avatar renderer with split
 * warm/cool two-tone lighting.  One side of the face is lit with warm
 * orange/amber, the other with cool teal/cyan, recreating the iconic
 * Blade Runner 2049 cinematography.  Realistic Lambertian diffuse with
 * soft wrap lighting, subtle specular, Fresnel rim glow, film grain,
 * and a vignette post-processing pass.
 *
 * Usage (ES module, requires importmap for "three"):
 *
 *   import { init } from './avatar-style-blade-runner.js';
 *   const cleanup = await init(canvas, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-blade-runner
 */

import * as THREE from 'three';
import { GLTFLoader }     from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }    from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader }     from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder }  from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x050a0c;

// ---------------------------------------------------------------------------
// Blade Runner Neon Noir Shader Material
// ---------------------------------------------------------------------------

const BladeRunnerVertexShader = /* glsl */ `
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

const BladeRunnerFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uWarmLightPos;
  uniform vec3  uCoolLightPos;
  uniform float uWarmIntensity;
  uniform float uCoolIntensity;
  uniform float uAmbientIntensity;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // -- Pseudo-random hash for film grain -----------------------------------
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // -- Warm light (left, orange/amber) -----------------------------------
    vec3 warmDir = normalize(uWarmLightPos - vWorldPos);
    float NdotL_warm = dot(N, warmDir);
    float wrap_warm = NdotL_warm * 0.5 + 0.5;
    vec3 warmColor = vec3(0.35, 0.15, 0.04);

    // -- Cool light (right, teal/cyan) -------------------------------------
    vec3 coolDir = normalize(uCoolLightPos - vWorldPos);
    float NdotL_cool = dot(N, coolDir);
    float wrap_cool = NdotL_cool * 0.5 + 0.5;
    vec3 coolColor = vec3(0.04, 0.15, 0.25);

    // -- Lambertian diffuse with soft wrap ---------------------------------
    vec3 warmContrib = warmColor * wrap_warm * uWarmIntensity;
    vec3 coolContrib = coolColor * wrap_cool * uCoolIntensity;

    // -- Ambient fill (very dim) -------------------------------------------
    vec3 ambientColor = vec3(0.02, 0.03, 0.04) * uAmbientIntensity;

    // -- Specular highlights -----------------------------------------------
    // Warm specular
    vec3 halfWarm = normalize(warmDir + V);
    float NdotH_warm = max(dot(N, halfWarm), 0.0);
    vec3 specWarm = warmColor * pow(NdotH_warm, 32.0) * 0.15;

    // Cool specular
    vec3 halfCool = normalize(coolDir + V);
    float NdotH_cool = max(dot(N, halfCool), 0.0);
    vec3 specCool = coolColor * pow(NdotH_cool, 32.0) * 0.15;

    // -- Fresnel rim glow (mix of both colors) -----------------------------
    float fresnel = 1.0 - max(dot(N, V), 0.0);
    fresnel = pow(fresnel, 3.0);
    vec3 fresnelColor = mix(warmColor, coolColor, 0.5) * fresnel * 0.2;

    // -- Film grain (3% modulation) ----------------------------------------
    float grain = hash(vUv * 800.0 + vec2(uTime * 6.7, uTime * 3.3));
    float grainMod = 1.0 + (grain - 0.5) * 0.06; // +/- 3%

    // -- Composite ---------------------------------------------------------
    vec3 color = ambientColor + warmContrib + coolContrib
               + specWarm + specCool + fresnelColor;
    color *= grainMod;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Vignette Post-Process Shader
// ---------------------------------------------------------------------------

const VignetteShader = {
  uniforms: {
    tDiffuse:    { value: null },
    uIntensity:  { value: 0.45 },
    uSmoothness: { value: 0.4 }
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
    uniform float uIntensity;
    uniform float uSmoothness;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Distance from center (0,0 at center, 1.0 at corners)
      vec2 uv = vUv - 0.5;
      float dist = length(uv) * 1.414; // normalize so corners = ~1.0

      // Smooth vignette falloff
      float vignette = smoothstep(1.0, 1.0 - uIntensity - uSmoothness, dist);

      gl_FragColor = vec4(texel.rgb * vignette, texel.a);
    }
  `
};

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialize the Blade Runner 2049 Neon Noir avatar renderer.
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;

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

  // --- Lighting ---
  // Dim ambient
  const ambient = new THREE.AmbientLight(0x0a1015, 0.15);
  scene.add(ambient);

  // Warm point light from left (orange/amber)
  const warmLight = new THREE.PointLight(0xff8040, 0.8, 8);
  warmLight.position.set(-2, 1, 2);
  scene.add(warmLight);

  // Cool point light from right (teal/cyan)
  const coolLight = new THREE.PointLight(0x2080ff, 0.6, 8);
  coolLight.position.set(2, 0.5, 1.5);
  scene.add(coolLight);

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
    0.4,   // strength
    0.4,   // radius
    0.5    // threshold
  );
  composer.addPass(bloomPass);

  const vignettePass = new ShaderPass(VignetteShader);
  composer.addPass(vignettePass);

  // --- Shared uniforms ---
  const shaderUniforms = {
    uTime:             { value: 0 },
    uWarmLightPos:     { value: new THREE.Vector3(-2, 1, 2) },
    uCoolLightPos:     { value: new THREE.Vector3(2, 0.5, 1.5) },
    uWarmIntensity:    { value: 0.8 },
    uCoolIntensity:    { value: 0.6 },
    uAmbientIntensity: { value: 0.15 }
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

  // --- Apply Blade Runner shader to all meshes ---
  model.traverse((child) => {
    if (!child.isMesh) return;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:             shaderUniforms.uTime,
        uWarmLightPos:     shaderUniforms.uWarmLightPos,
        uCoolLightPos:     shaderUniforms.uCoolLightPos,
        uWarmIntensity:    shaderUniforms.uWarmIntensity,
        uCoolIntensity:    shaderUniforms.uCoolIntensity,
        uAmbientIntensity: shaderUniforms.uAmbientIntensity
      },
      vertexShader: BladeRunnerVertexShader,
      fragmentShader: BladeRunnerFragmentShader,
      blending: THREE.NormalBlending,
      transparent: false,
      side: THREE.DoubleSide
    });

    // Preserve morph target data
    const influences = child.morphTargetInfluences;
    const dict = child.morphTargetDictionary;
    child.material = mat;
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
