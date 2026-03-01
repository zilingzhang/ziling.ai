/**
 * avatar-style-mothership.js
 *
 * Three.js ES module that renders a GLB avatar with a
 * **Homeworld Mothership / Ethereal Fleet Intelligence** aesthetic.
 *
 * Pale blue-white marble skin with energy veins, subsurface scattering,
 * soft Fresnel aura, flowing energy-wisp particles, deep-space dust
 * background, and cinematic bloom post-processing.
 *
 * Usage (requires importmap for "three"):
 *
 *   import { init } from './avatar-style-mothership.js';
 *   const cleanup = await init(canvas, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-mothership
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
// GLSL noise (2D simplex)
// ---------------------------------------------------------------------------

const GLSL_NOISE = /* glsl */ `
vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289_3(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289_2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

// ---------------------------------------------------------------------------
// Mothership material shaders
// ---------------------------------------------------------------------------

const mothershipVertexShader = /* glsl */ `
#include <morphtarget_pars_vertex>

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vUv = uv;

  #include <begin_vertex>
  #include <morphtarget_vertex>

  vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const mothershipFragmentShader = /* glsl */ `
${GLSL_NOISE}

uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vViewDir;

// -- Helpers --

// Multi-octave noise for marble texture
float marble(vec2 p, float t) {
  float n = snoise(p * 2.0 + t * 0.05);
  n += 0.5 * snoise(p * 4.0 - t * 0.08);
  n += 0.25 * snoise(p * 8.0 + t * 0.03);
  return n;
}

// Energy vein pattern: high-contrast ridges from noise
float veins(vec2 p, float t) {
  float n1 = snoise(p * 5.0 + vec2(t * 0.12, t * 0.07));
  float n2 = snoise(p * 8.0 - vec2(t * 0.09, t * 0.15));
  // Ridge function: sharpen the noise into thin lines
  float ridge1 = 1.0 - abs(n1);
  float ridge2 = 1.0 - abs(n2);
  ridge1 = pow(ridge1, 4.0);
  ridge2 = pow(ridge2, 4.0);
  return max(ridge1, ridge2 * 0.7);
}

// Hue rotation for iridescence
vec3 hueShift(vec3 color, float shift) {
  float cosA = cos(shift);
  float sinA = sin(shift);
  vec3 k = vec3(0.57735);
  return color * cosA + cross(k, color) * sinA + k * dot(k, color) * (1.0 - cosA);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // Light direction (from above-right)
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));

  float NdotL = dot(N, lightDir);
  float NdotV = dot(N, V);

  // -- Base color: muted blue-grey marble (darkened to avoid bloom blowout) --
  vec3 colorA = vec3(0.25, 0.28, 0.40);
  vec3 colorB = vec3(0.40, 0.42, 0.55);
  float marbleVal = marble(vUv * 3.0 + vWorldPos.xy * 0.5, uTime);
  float marbleMix = marbleVal * 0.5 + 0.5; // remap to 0..1
  vec3 baseColor = mix(colorA, colorB, marbleMix);

  // Lambertian diffuse with soft wrap lighting
  float diffuse = NdotL * 0.5 + 0.5;
  diffuse = pow(diffuse, 0.8); // soften

  // -- Subsurface scattering simulation --
  // When normal faces away from light, add warm backlight glow
  float scatter = max(0.0, -NdotL) * 0.5 + 0.5;
  scatter = pow(scatter, 2.0);
  vec3 sssColor = vec3(1.0, 0.9, 0.7) * 0.15 * scatter;

  // -- Energy veins --
  float veinIntensity = veins(vUv * 2.0 + vWorldPos.xz * 0.3, uTime);
  // Pulse slowly
  float pulse = sin(uTime * 0.8) * 0.3 + 0.7;
  veinIntensity *= pulse;
  vec3 veinColor = vec3(0.5, 0.6, 0.8) * veinIntensity * 0.4;

  // -- Fresnel: broad ethereal aura --
  float fresnel = 1.0 - max(0.0, NdotV);
  fresnel = pow(fresnel, 1.8); // broad, not sharp
  vec3 fresnelColor = vec3(0.4, 0.5, 0.7) * fresnel * 0.3;

  // -- Iridescence: subtle rainbow at extreme angles --
  float iriAngle = fresnel; // strongest at glancing angles
  vec3 iriColor = hueShift(vec3(0.7, 0.8, 1.0), iriAngle * 3.14159 * 0.6 + uTime * 0.1);
  iriColor = mix(vec3(0.8), iriColor, 0.3) * iriAngle * 0.12;

  // -- Combine --
  vec3 color = baseColor * diffuse + sssColor + veinColor + fresnelColor + iriColor;

  // Add a subtle ambient so nothing goes fully dark
  color += vec3(0.03, 0.04, 0.06);

  // -- Opacity: mostly opaque, slight transparency at edges --
  float alpha = mix(0.88, 0.96, max(0.0, NdotV));

  gl_FragColor = vec4(color, alpha);
}
`;

// ---------------------------------------------------------------------------
// Vignette post-process shader
// ---------------------------------------------------------------------------

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.45 },
    uSoftness: { value: 0.65 }
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
    uniform float uSoftness;
    varying vec2 vUv;

    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(uSoftness, uSoftness - 0.35, dist);
      texColor.rgb *= mix(1.0 - uIntensity, 1.0, vignette);
      gl_FragColor = texColor;
    }
  `
};

// ---------------------------------------------------------------------------
// Particle textures (generated procedurally)
// ---------------------------------------------------------------------------

/**
 * Create a soft radial gradient texture for particles.
 * @param {number} size - Texture width/height in pixels.
 * @returns {THREE.CanvasTexture}
 */
function createSoftCircleTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(0.7, 'rgba(200,220,255,0.15)');
  gradient.addColorStop(1.0, 'rgba(200,220,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Energy wisp particle system
// ---------------------------------------------------------------------------

/**
 * Create the energy wisp particles that flow in gentle spirals around
 * the avatar.
 *
 * @param {number} count
 * @param {THREE.Texture} texture
 * @returns {{ points: THREE.Points, update: (time: number) => void }}
 */
function createEnergyWisps(count, texture) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  // Per-particle path parameters
  const params = [];

  for (let i = 0; i < count; i++) {
    // Elliptical orbit parameters
    const radiusX = 0.25 + Math.random() * 0.30;
    const radiusZ = 0.20 + Math.random() * 0.25;
    const yCenter = (Math.random() - 0.5) * 0.8;  // vertical center
    const yAmp = 0.05 + Math.random() * 0.15;      // vertical oscillation
    const phase = Math.random() * Math.PI * 2;
    const speed = 0.08 + Math.random() * 0.12;
    const ySpeed = 0.15 + Math.random() * 0.25;

    params.push({ radiusX, radiusZ, yCenter, yAmp, phase, speed, ySpeed });

    // Color: blend between pale blue-white and warm amber
    const t = Math.random();
    const r = THREE.MathUtils.lerp(0.7, 1.0, t);
    const g = THREE.MathUtils.lerp(0.8, 0.88, t);
    const b = THREE.MathUtils.lerp(1.0, 0.65, t);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    // Size: 2-5px base, with distance attenuation handled by shader
    sizes[i] = 2.0 + Math.random() * 3.0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    map: texture,
    size: 0.015,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });

  const points = new THREE.Points(geometry, material);

  function update(time) {
    const posArr = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const p = params[i];
      const angle = time * p.speed + p.phase;

      posArr[i * 3]     = Math.cos(angle) * p.radiusX;
      posArr[i * 3 + 1] = p.yCenter + Math.sin(time * p.ySpeed + p.phase) * p.yAmp;
      posArr[i * 3 + 2] = Math.sin(angle) * p.radiusZ;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  return { points, update };
}

// ---------------------------------------------------------------------------
// Space dust background
// ---------------------------------------------------------------------------

/**
 * Create a distant field of dim white dots for the deep space background.
 *
 * @param {number} count
 * @returns {THREE.Points}
 */
function createSpaceDust(count) {
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 6.0;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6.0;
    positions[i * 3 + 2] = -5.0 - Math.random() * 10.0;

    velocities.push({
      x: (Math.random() - 0.5) * 0.002,
      y: (Math.random() - 0.5) * 0.002,
      z: 0
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xccd0e0,
    size: 0.008,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);

  // Attach velocity data for animation
  points.userData.velocities = velocities;
  points.userData.geometry = geometry;

  return points;
}

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialize the Homeworld Mothership avatar renderer.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @param {string} glbUrl - Relative path to a .glb avatar file.
 * @returns {Promise<() => void>} A cleanup function that disposes all resources.
 */
export async function init(canvas, glbUrl) {
  // -- Sizing from parent container --
  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  const aspect = width / height;

  // -- Renderer --
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.setClearColor(0x050810, 1);

  // -- Scene --
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050810);

  // -- Camera --
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
  camera.position.set(-0.16, -0.83, 3.21);
  camera.lookAt(0, 0.12, 0);

  // -- Orbit controls --
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

  // -- Lighting: cinematic divine illumination --

  // Hemisphere: pale blue sky, warm amber ground (reduced intensity)
  const hemiLight = new THREE.HemisphereLight(0xd0e0ff, 0xffd0a0, 0.4);
  scene.add(hemiLight);

  // Key light: white from above-right (reduced from 1.5)
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
  keyLight.position.set(2, 3, 3);
  scene.add(keyLight);

  // Rim light: warm gold from behind (reduced from 0.8)
  const rimLight = new THREE.DirectionalLight(0xffd080, 0.35);
  rimLight.position.set(0, 1.5, -3);
  scene.add(rimLight);

  // Fill light: cool blue from left (reduced from 0.4)
  const fillLight = new THREE.DirectionalLight(0x80a0ff, 0.2);
  fillLight.position.set(-3, 1, 2);
  scene.add(fillLight);

  // -- Post-processing --
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: 4
  });
  const composer = new EffectComposer(renderer, renderTarget);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.4,  // strength (was 1.2 -- caused white blowout)
    0.6,  // radius
    0.6   // threshold (was 0.4 -- only bloom the brightest edges)
  );
  composer.addPass(bloomPass);

  const vignettePass = new ShaderPass(VignetteShader);
  composer.addPass(vignettePass);

  // -- Shared uniform --
  const sharedUniforms = {
    uTime: { value: 0.0 }
  };

  // -- Particle texture --
  const particleTex = createSoftCircleTexture(64);

  // -- Energy wisps --
  const wisps = createEnergyWisps(400, particleTex);
  scene.add(wisps.points);

  // -- Space dust --
  const spaceDust = createSpaceDust(150);
  scene.add(spaceDust);

  // -- GLB loader setup --
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

  // -- Load the GLB --
  const gltf = await new Promise((resolve, reject) => {
    loader.load(glbUrl, resolve, undefined, reject);
  });

  const model = gltf.scene;

  // Center and scale
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  model.position.sub(center);

  const targetHeight = 1.6;
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);

  // Shift down so head is near top of frame
  model.position.y -= 0.05;

  // Orient
  model.rotation.x = 0.20;
  model.rotation.y = -0.26;

  // Apply custom mothership shader to all meshes
  model.traverse((child) => {
    if (child.isMesh) {
      const mothershipMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: sharedUniforms.uTime
        },
        vertexShader: mothershipVertexShader,
        fragmentShader: mothershipFragmentShader,
        transparent: true,
        blending: THREE.NormalBlending,
        side: THREE.FrontSide
      });

      // Preserve morph target data across material swap
      const influences = child.morphTargetInfluences;
      const dict = child.morphTargetDictionary;
      child.material = mothershipMat;
      if (influences) child.morphTargetInfluences = influences;
      if (dict) child.morphTargetDictionary = dict;
    }
  });

  scene.add(model);
  canvas._model = model;

  // -- Animation state --
  const clock = new THREE.Clock();
  let rafId = null;
  let disposed = false;

  // Base rotations for gentle oscillation
  const baseRotY = model.rotation.y;

  // -- Animation loop --
  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update shared time uniform
    sharedUniforms.uTime.value = elapsed;

    // Gentle model Y rotation oscillation (+/- 0.03 rad, period ~12s)
    if (!canvas._externalRotation) model.rotation.y = baseRotY + Math.sin(elapsed * (2 * Math.PI / 12)) * 0.03;

    // Update energy wisps
    wisps.update(elapsed);

    // Update space dust (very slow drift)
    const dustPosArr = spaceDust.userData.geometry.attributes.position.array;
    const dustVels = spaceDust.userData.velocities;
    const dustCount = dustVels.length;
    for (let i = 0; i < dustCount; i++) {
      dustPosArr[i * 3]     += dustVels[i].x;
      dustPosArr[i * 3 + 1] += dustVels[i].y;
    }
    spaceDust.userData.geometry.attributes.position.needsUpdate = true;

    // Update orbit controls
    controls.update();

    // Render
    composer.render();
  }

  clock.start();
  animate();

  // -- Resize handler --
  function onResize() {
    if (disposed) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  // -- Cleanup function --
  function cleanup() {
    disposed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    resizeObserver.disconnect();

    // Dispose model
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

    // Dispose particles
    scene.remove(wisps.points);
    wisps.points.geometry.dispose();
    wisps.points.material.dispose();

    scene.remove(spaceDust);
    spaceDust.geometry.dispose();
    spaceDust.material.dispose();

    // Dispose texture
    particleTex.dispose();

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
