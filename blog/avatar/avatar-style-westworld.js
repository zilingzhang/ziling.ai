/**
 * avatar-style-westworld.js
 *
 * Westworld Host Blueprint -- a clean wireframe/blueprint aesthetic inspired
 * by the Vitruvian Man sequence from the Westworld intro.  The avatar appears
 * as a host being printed on a dark background, with a sweeping print line
 * that reveals white wireframe geometry from bottom to top.
 *
 * Usage (ES module, requires importmap for "three"):
 *
 *   import { init } from './avatar-style-westworld.js';
 *   const cleanup = await init(canvas, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-westworld
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

const BG_COLOR = 0x030308;

const PRINT_CYCLE_PERIOD = 6.0; // seconds for one full bottom-to-top sweep

// ---------------------------------------------------------------------------
// Westworld Blueprint Shader
// ---------------------------------------------------------------------------

const WestworldVertexShader = /* glsl */ `
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

const WestworldFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPrintY;
  uniform vec3  uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    // -- Base color: very dark navy, nearly invisible ---
    vec3 baseColor = vec3(0.02, 0.02, 0.06);

    // -- Wireframe grid over UV space ---
    vec2 grid = fract(vUv * 20.0);
    float lineWidth = 0.015;

    // Thin lines at grid edges (near 0 or 1 in fract space)
    float lineX = smoothstep(lineWidth, lineWidth * 0.3, grid.x)
                + smoothstep(1.0 - lineWidth, 1.0 - lineWidth * 0.3, grid.x);
    float lineY = smoothstep(lineWidth, lineWidth * 0.3, grid.y)
                + smoothstep(1.0 - lineWidth, 1.0 - lineWidth * 0.3, grid.y);
    float wireframe = clamp(max(lineX, lineY), 0.0, 1.0);

    vec3 wireColor = vec3(0.25, 0.27, 0.35);

    // -- Print line sweep ---
    // uPrintY travels from model bottom to top
    float printEdge = uPrintY;

    // Distance from print line
    float distFromLine = vWorldPos.y - printEdge;

    // Below line = printed (visible), above = faded
    float belowLine = smoothstep(0.02, -0.02, distFromLine);

    // Print line glow band (~0.02 units thick)
    float lineBand = exp(-abs(distFromLine) * 50.0);
    vec3 lineGlow = vec3(0.3, 0.3, 0.4) * lineBand;

    // -- Fresnel rim ---
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
    vec3 rimColor = vec3(0.15, 0.15, 0.25) * pow(fresnel, 3.0) * 0.3;

    // -- NdotL shading (very subtle, only below print line) ---
    float NdotL = dot(normalize(vNormal), normalize(uLightDir));
    float diffuse = max(NdotL, 0.0);
    vec3 shadingColor = vec3(0.10, 0.10, 0.14) * diffuse * 0.08;

    // -- Composite ---
    // Below the print line: wireframe + shading + rim visible
    vec3 printedColor = baseColor
                      + wireColor * wireframe
                      + shadingColor
                      + rimColor;

    // Above the print line: nearly invisible base only
    vec3 unprintedColor = baseColor * 0.3;

    vec3 color = mix(unprintedColor, printedColor, belowLine);

    // Add print line glow everywhere it intersects
    color += lineGlow;

    // -- Alpha ---
    float alpha = mix(0.05, 0.85, belowLine);
    // Boost alpha on print line itself
    alpha = max(alpha, lineBand * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialize the Westworld Host Blueprint avatar renderer.
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

  // --- Lighting ---
  // Cool white directional from front, intensity 0.5
  const dirLight = new THREE.DirectionalLight(0xd0d4e8, 0.5);
  dirLight.position.set(0, 0.5, 2.0);
  scene.add(dirLight);

  // Dim blue ambient 0.15
  const ambient = new THREE.AmbientLight(0x2233aa, 0.15);
  scene.add(ambient);

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
  const shaderUniforms = {
    uTime: { value: 0 },
    uPrintY: { value: -1.0 },
    uLightDir: { value: new THREE.Vector3(0, 0.5, 2.0).normalize() }
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

  // --- Compute model Y range in world space (for print sweep) ---
  const scaledBox = new THREE.Box3().setFromObject(model);
  const modelYMin = scaledBox.min.y;
  const modelYMax = scaledBox.max.y;

  // --- Apply Westworld shader material to all meshes ---
  model.traverse((child) => {
    if (!child.isMesh) return;

    const westworldMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shaderUniforms.uTime,
        uPrintY: shaderUniforms.uPrintY,
        uLightDir: shaderUniforms.uLightDir
      },
      vertexShader: WestworldVertexShader,
      fragmentShader: WestworldFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    // Preserve morph target data
    const influences = child.morphTargetInfluences;
    const dict = child.morphTargetDictionary;
    child.material = westworldMat;
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
    shaderUniforms.uTime.value = elapsed;

    // Print line: sawtooth sweep from model bottom to top
    const printPhase = (elapsed % PRINT_CYCLE_PERIOD) / PRINT_CYCLE_PERIOD;
    const margin = 0.1;
    shaderUniforms.uPrintY.value =
      (modelYMin - margin) + printPhase * ((modelYMax + margin) - (modelYMin - margin));

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
