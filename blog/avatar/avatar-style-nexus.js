/**
 * avatar-style-nexus.js
 *
 * Nexus Neural Network Core -- a cyberpunk avatar renderer with pulsing
 * circuit-board patterns, neural connection lines, data-stream particles,
 * and heavy neon bloom.  Think Ghost in the Shell meets Tron Legacy meets
 * a real-time neural-network visualization.
 *
 * Usage (ES module, requires importmap for "three"):
 *
 *   import { init } from './avatar-style-nexus.js';
 *   const cleanup = await init(canvas, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-nexus
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAGENTA     = new THREE.Color(0.9, 0.1, 0.6);
const ELECTRIC_BLUE = new THREE.Color(0.1, 0.4, 1.0);
const EDGE_GLOW   = new THREE.Color(1.0, 0.2, 0.7);
const BG_COLOR    = 0x08040c;

const NEURAL_LINE_COUNT   = 20;
const NEURAL_NODE_COUNT   = 12;
const PARTICLE_COUNT      = 250;
const DATA_COLUMN_COUNT   = 5;
const PULSE_PERIOD        = 3.0; // seconds for energy pulse to travel bottom-to-top

// ---------------------------------------------------------------------------
// Nexus Shader Material
// ---------------------------------------------------------------------------

const NexusVertexShader = /* glsl */ `
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

const NexusFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPulseY;
  uniform vec3  uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // -- Pseudo-random hash --------------------------------------------------
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // -- Simple 2D value noise -----------------------------------------------
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // smoothstep interpolation

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // -- Toon shading (3-band, very dark purple/black) ---------------------
    float NdotL = dot(normalize(vNormal), normalize(uLightDir));
    float raw = NdotL * 0.5 + 0.5;

    // Three discrete bands
    float band;
    if (raw > 0.66) {
      band = 1.0;
    } else if (raw > 0.33) {
      band = 0.5;
    } else {
      band = 0.15;
    }

    vec3 shadowColor = vec3(0.03, 0.02, 0.06);
    vec3 litColor    = vec3(0.08, 0.05, 0.12);
    vec3 baseColor   = mix(shadowColor, litColor, band);

    // -- Circuit pattern ---------------------------------------------------
    // World-space grid lines
    float gridFreq = 15.0;
    float lineWidth = 0.03;

    float gx = smoothstep(lineWidth, lineWidth * 0.3, fract(vWorldPos.x * gridFreq));
    float gy = smoothstep(lineWidth, lineWidth * 0.3, fract(vWorldPos.y * gridFreq));

    // Horizontal and vertical lines (1 = on line, 0 = off)
    float lineH = 1.0 - gx;
    float lineV = 1.0 - gy;
    float gridLine = max(lineH, lineV);

    // Mask with noise so only portions of the grid appear as circuit traces
    float noiseMask = noise(vWorldPos.xy * 3.0 + vec2(0.0, uTime * 0.05));
    float circuitMask = step(0.45, noiseMask);
    float circuit = gridLine * circuitMask;

    // Pulse traveling along circuits: brightness wave keyed to uPulseY
    float pulseDist = abs(vWorldPos.y - uPulseY);
    float pulseGlow = exp(-pulseDist * 8.0);  // Gaussian falloff around pulse

    // Additional animated "active section" movement along lines
    float travelX = fract(vWorldPos.x * 2.0 + uTime * 0.8);
    float travelY = fract(vWorldPos.y * 2.0 - uTime * 0.6);
    float activeX = smoothstep(0.4, 0.5, travelX) * smoothstep(0.6, 0.5, travelX);
    float activeY = smoothstep(0.4, 0.5, travelY) * smoothstep(0.6, 0.5, travelY);
    float activePulse = max(activeX * lineV, activeY * lineH) * circuitMask;

    // Alternate magenta and blue based on spatial hash
    float colorSel = step(0.5, hash(floor(vWorldPos.xy * gridFreq)));
    vec3 magenta = vec3(0.9, 0.1, 0.6);
    vec3 blue    = vec3(0.1, 0.4, 1.0);
    vec3 circuitColor = mix(magenta, blue, colorSel);

    // Combine circuit brightness: base visibility + pulse + active sections
    float circuitBrightness = circuit * (0.4 + pulseGlow * 1.5 + activePulse * 1.2);
    circuitBrightness = clamp(circuitBrightness, 0.0, 1.0);

    // -- Fresnel edge glow -------------------------------------------------
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
    fresnel = pow(fresnel, 2.5) * 0.8;
    vec3 edgeGlow = vec3(1.0, 0.2, 0.7) * fresnel;

    // -- Energy pulse band (wider glow on the model surface) ---------------
    float pulseBand = exp(-pulseDist * 4.0) * 0.3;
    vec3 pulseColor = mix(magenta, blue, sin(uTime * 2.0) * 0.5 + 0.5) * pulseBand;

    // -- Composite ---------------------------------------------------------
    vec3 color = baseColor;
    color += circuitColor * circuitBrightness;
    color += edgeGlow;
    color += pulseColor;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Chromatic Aberration Post-Process Shader
// ---------------------------------------------------------------------------

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uOffset: { value: new THREE.Vector2(0.002, 0.0) }
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
    uniform vec2 uOffset;
    varying vec2 vUv;

    void main() {
      float r = texture2D(tDiffuse, vUv + uOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - uOffset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
};

// ---------------------------------------------------------------------------
// Neural connection lines & nodes
// ---------------------------------------------------------------------------

/**
 * Create neural connection lines radiating from the head area, plus small
 * floating "node" wireframe shapes at the endpoints.
 *
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, lines: THREE.Line[], nodes: THREE.Mesh[] }}
 */
function createNeuralNetwork(scene) {
  const group = new THREE.Group();

  const lines = [];
  const nodes = [];

  const headCenter = new THREE.Vector3(0, 0.35, 0);

  for (let i = 0; i < NEURAL_LINE_COUNT; i++) {
    // Random direction outward from head
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.3) * Math.PI * 0.6; // bias upward slightly
    const length = 0.3 + Math.random() * 0.5;

    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.sin(phi) * 0.4,
      Math.cos(theta) * Math.cos(phi)
    ).normalize();

    const start = headCenter.clone().add(dir.clone().multiplyScalar(0.08 + Math.random() * 0.05));
    const end = start.clone().add(dir.clone().multiplyScalar(length));

    // Line geometry
    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z
    ]);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colorChoice = Math.random() > 0.5 ? MAGENTA : ELECTRIC_BLUE;
    const mat = new THREE.LineBasicMaterial({
      color: colorChoice,
      transparent: true,
      opacity: 0.4 + Math.random() * 0.3,
      linewidth: 1
    });
    mat.userData = { baseOpacity: mat.opacity, phase: Math.random() * Math.PI * 2 };

    const line = new THREE.Line(geom, mat);
    group.add(line);
    lines.push(line);
  }

  // Floating nodes at random positions around head
  for (let i = 0; i < NEURAL_NODE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.3) * Math.PI * 0.5;
    const dist = 0.25 + Math.random() * 0.6;

    const pos = new THREE.Vector3(
      headCenter.x + Math.sin(theta) * Math.cos(phi) * dist,
      headCenter.y + Math.sin(phi) * dist * 0.5,
      headCenter.z + Math.cos(theta) * Math.cos(phi) * dist
    );

    const size = 0.01 + Math.random() * 0.01;
    const nodeGeom = Math.random() > 0.5
      ? new THREE.IcosahedronGeometry(size, 0)
      : new THREE.OctahedronGeometry(size, 0);

    const colorChoice = Math.random() > 0.5 ? MAGENTA : ELECTRIC_BLUE;
    const nodeMat = new THREE.MeshBasicMaterial({
      color: colorChoice,
      wireframe: true,
      transparent: true,
      opacity: 0.6 + Math.random() * 0.3
    });
    nodeMat.userData = { baseOpacity: nodeMat.opacity, phase: Math.random() * Math.PI * 2 };

    const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
    nodeMesh.position.copy(pos);
    group.add(nodeMesh);
    nodes.push(nodeMesh);
  }

  scene.add(group);
  return { group, lines, nodes };
}

// ---------------------------------------------------------------------------
// Data-stream particles
// ---------------------------------------------------------------------------

/**
 * Create vertical data-stream particles organized in columns around the model.
 *
 * @param {THREE.Scene} scene
 * @returns {{ points: THREE.Points, columns: object[], geometry: THREE.BufferGeometry }}
 */
function createDataStreams(scene) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  // Define column positions in a ring around the model
  const columns = [];
  for (let c = 0; c < DATA_COLUMN_COUNT; c++) {
    const angle = (c / DATA_COLUMN_COUNT) * Math.PI * 2 + 0.3;
    const radius = 0.2 + Math.random() * 0.15;
    columns.push({
      x: Math.sin(angle) * radius,
      z: Math.cos(angle) * radius,
      speed: (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
      spread: 0.02 + Math.random() * 0.03
    });
  }

  // Assign each particle to a column
  const particleData = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const col = columns[i % DATA_COLUMN_COUNT];
    const y = (Math.random() - 0.5) * 1.6; // spread vertically
    const ox = (Math.random() - 0.5) * col.spread;
    const oz = (Math.random() - 0.5) * col.spread;

    positions[i * 3]     = col.x + ox;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = col.z + oz;

    // Alternate magenta and blue
    const isMagenta = Math.random() > 0.5;
    colors[i * 3]     = isMagenta ? 0.9 : 0.1;
    colors[i * 3 + 1] = isMagenta ? 0.1 : 0.4;
    colors[i * 3 + 2] = isMagenta ? 0.6 : 1.0;

    sizes[i] = 1.0 + Math.random() * 2.0;

    particleData.push({
      columnIndex: i % DATA_COLUMN_COUNT,
      offsetX: ox,
      offsetZ: oz
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { points, columns, geometry, particleData };
}

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialize the Nexus Neural Network Core avatar renderer.
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
  renderer.toneMappingExposure = 1.0;

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  // --- Camera ---
  const aspect = width / height;
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
  camera.position.set(-0.73, -0.71, 4.24);
  camera.lookAt(0.03, -0.04, 0);

  // --- Orbit controls ---
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.03, -0.04, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 5.0;
  controls.update();

  // Expose camera/controls on canvas for debugging
  canvas._camera = camera;
  canvas._controls = controls;

  // --- Lighting (dramatic, high-contrast) ---
  // Very dim ambient -- almost black
  const ambient = new THREE.AmbientLight(0x0a0510, 0.3);
  scene.add(ambient);

  // Dim magenta point light from front-left
  const magentaLight = new THREE.PointLight(0xff1080, 1.5, 5);
  magentaLight.position.set(-1.5, 1.0, 2.0);
  scene.add(magentaLight);

  // Blue point light from right
  const blueLight = new THREE.PointLight(0x1040ff, 1.2, 5);
  blueLight.position.set(2.0, 0.5, 1.0);
  scene.add(blueLight);

  // Subtle backlight for rim separation
  const backLight = new THREE.PointLight(0x8020c0, 0.6, 4);
  backLight.position.set(0, 1.5, -2.0);
  scene.add(backLight);

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
    0.8,   // strength (was 2.0 -- caused white blowout)
    0.3,   // radius
    0.4    // threshold (was 0.15 -- only bloom neon edges)
  );
  composer.addPass(bloomPass);

  const chromaPass = new ShaderPass(ChromaticAberrationShader);
  composer.addPass(chromaPass);

  // --- Shared uniforms ---
  const nexusUniforms = {
    uTime: { value: 0 },
    uPulseY: { value: -1 },
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

  // Shift down so head is near top of frame
  model.position.y -= 0.05;

  // Orient
  model.rotation.x = 0.20;
  model.rotation.y = -0.26;

  // Apply Nexus shader material to all meshes
  model.traverse((child) => {
    if (!child.isMesh) return;

    const nexusMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: nexusUniforms.uTime,
        uPulseY: nexusUniforms.uPulseY,
        uLightDir: nexusUniforms.uLightDir
      },
      vertexShader: NexusVertexShader,
      fragmentShader: NexusFragmentShader,
      side: THREE.DoubleSide
    });

    // Preserve morph target data
    const influences = child.morphTargetInfluences;
    const dict = child.morphTargetDictionary;
    child.material = nexusMat;
    if (influences) child.morphTargetInfluences = influences;
    if (dict) child.morphTargetDictionary = dict;
  });

  scene.add(model);
  canvas._model = model;

  // --- Neural connection lines & nodes ---
  const neural = createNeuralNetwork(scene);

  // --- Data stream particles ---
  const streams = createDataStreams(scene);

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
    nexusUniforms.uTime.value = elapsed;

    // Energy pulse: sawtooth from bottom (-0.8) to top (0.8) every PULSE_PERIOD
    const pulsePhase = (elapsed % PULSE_PERIOD) / PULSE_PERIOD;
    nexusUniforms.uPulseY.value = -0.8 + pulsePhase * 1.6;

    // -- Subtle model rotation oscillation --
    if (!canvas._externalRotation) model.rotation.y = baseRotY + Math.sin(elapsed * 0.3) * 0.015;

    // -- Neural connection lines: slow rotation + brightness pulse --
    neural.group.rotation.y += dt * 0.1;

    neural.lines.forEach((line) => {
      const mat = line.material;
      const phase = mat.userData.phase;
      mat.opacity = mat.userData.baseOpacity * (0.5 + 0.5 * Math.sin(elapsed * 1.5 + phase));
    });

    neural.nodes.forEach((node) => {
      const mat = node.material;
      const phase = mat.userData.phase;
      mat.opacity = mat.userData.baseOpacity * (0.4 + 0.6 * Math.sin(elapsed * 2.0 + phase));
      // Gentle float
      node.position.y += Math.sin(elapsed * 0.8 + phase) * 0.0002;
    });

    // -- Data stream particles: move along columns --
    const posAttr = streams.geometry.getAttribute('position');
    const posArr = posAttr.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pd = streams.particleData[i];
      const col = streams.columns[pd.columnIndex];

      // Move vertically
      posArr[i * 3 + 1] += col.speed * dt;

      // Wrap around
      if (col.speed > 0 && posArr[i * 3 + 1] > 0.8) {
        posArr[i * 3 + 1] = -0.8;
      } else if (col.speed < 0 && posArr[i * 3 + 1] < -0.8) {
        posArr[i * 3 + 1] = 0.8;
      }

      // Keep horizontal position aligned to column with slight jitter
      posArr[i * 3]     = col.x + pd.offsetX + Math.sin(elapsed * 2.0 + i) * 0.003;
      posArr[i * 3 + 2] = col.z + pd.offsetZ + Math.cos(elapsed * 2.0 + i) * 0.003;
    }
    posAttr.needsUpdate = true;

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

    // Dispose neural network
    scene.remove(neural.group);
    neural.lines.forEach((line) => {
      line.geometry.dispose();
      line.material.dispose();
    });
    neural.nodes.forEach((node) => {
      node.geometry.dispose();
      node.material.dispose();
    });

    // Dispose data streams
    scene.remove(streams.points);
    streams.geometry.dispose();
    streams.points.material.dispose();

    // Dispose post-processing
    composer.dispose();

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
