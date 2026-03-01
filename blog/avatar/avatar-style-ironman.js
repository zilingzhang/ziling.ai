/**
 * avatar-style-ironman.js
 *
 * Iron Man / Jarvis HUD aesthetic for GLB avatars.
 *
 * Renders the model as if viewed through the inside of Tony Stark's helmet:
 *   - Warm dark red-to-gold toon shading (3-step)
 *   - Golden Fresnel rim glow
 *   - Hexagonal grid overlay at subtle opacity
 *   - Scrolling horizontal scan line
 *   - UnrealBloomPass for soft glow
 *
 * Usage:
 *   import { init } from './avatar-style-ironman.js';
 *   const cleanup = await init(canvasElement, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-ironman
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
// Iron Man HUD ShaderMaterial definition
// ---------------------------------------------------------------------------

const IronManVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>

  uniform float uTime;

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

const IronManFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  // ---- Hexagonal grid helper ----
  // Returns distance from nearest hex centre for a hex grid of the given scale.
  float hexGrid(vec2 p, float scale) {
    p *= scale;
    // Convert to hex-friendly coordinates
    vec2 r = vec2(1.0, 1.7320508);           // (1, sqrt(3))
    vec2 h = r * 0.5;
    vec2 a = mod(p, r) - h;
    vec2 b = mod(p - h, r) - h;
    // Pick the cell whose centre is closer
    vec2 g = (dot(a, a) < dot(b, b)) ? a : b;
    return length(g);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // ---- Base colour: warm dark red to gold gradient along world Y ----
    float yFactor = clamp((vWorldPos.y + 0.8) / 1.6, 0.0, 1.0);
    vec3 darkRed = vec3(0.25, 0.06, 0.03);
    vec3 gold    = vec3(0.35, 0.22, 0.05);
    vec3 baseColor = mix(darkRed, gold, yFactor);

    // ---- 3-step toon shading ----
    float NdotL = dot(n, normalize(uLightDir));
    float toon;
    if (NdotL < 0.3) {
      toon = 0.35;
    } else if (NdotL < 0.6) {
      toon = 0.65;
    } else {
      toon = 1.0;
    }
    baseColor *= toon;

    // ---- Golden Fresnel rim glow ----
    float fresnel = 1.0 - max(dot(viewDir, n), 0.0);
    fresnel = pow(fresnel, 3.0);
    vec3 rimColor = vec3(0.4, 0.3, 0.1);
    baseColor += rimColor * fresnel * 0.4;

    // ---- Hexagonal grid overlay ----
    // Project world position onto a 2D plane for the hex pattern.
    // Use XY from the world position so the grid wraps the surface.
    vec2 hexUV = vWorldPos.xy;
    float hexDist = hexGrid(hexUV, 18.0);
    // Thin hex edges: draw lines where distance from centre is near the cell radius
    float hexEdge = 1.0 - smoothstep(0.42, 0.48, hexDist);
    // Apply at ~5% opacity with a gold tint
    vec3 hexColor = vec3(0.35, 0.25, 0.08);
    baseColor += hexColor * hexEdge * 0.05;

    // ---- Scrolling horizontal scan line ----
    // A single bright band that scrolls downward slowly
    float scanY = fract(-uTime * 0.15);                    // 0..1, scrolling down
    float worldY01 = clamp((vWorldPos.y + 0.8) / 1.6, 0.0, 1.0);
    float scanDist = abs(worldY01 - scanY);
    float scanLine = 1.0 - smoothstep(0.0, 0.025, scanDist);
    // Add scan line as a warm gold band at 30% intensity
    baseColor += vec3(0.30, 0.20, 0.06) * scanLine * 0.30;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Main init function
// ---------------------------------------------------------------------------

/**
 * Initialise the Iron Man HUD renderer on the given canvas.
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
  renderer.setClearColor(0x0a0805, 1);
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
  // Warm directional light from upper-right
  const dirLight = new THREE.DirectionalLight(0xffcc88, 0.8);
  dirLight.position.set(1.0, 1.5, 1.0);
  scene.add(dirLight);

  // Dim amber ambient
  const ambientLight = new THREE.AmbientLight(0xcc8844, 0.3);
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
    0.5    // threshold
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

  // ---- HUD material uniforms (shared) ----
  const hudUniforms = {
    uTime:     { value: 0.0 },
    uLightDir: { value: new THREE.Vector3(1.0, 1.5, 1.0).normalize() }
  };

  // Apply Iron Man HUD shader to every mesh in the GLB
  model.traverse((child) => {
    if (!child.isMesh) return;

    const hudMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:     hudUniforms.uTime,
        uLightDir: hudUniforms.uLightDir
      },
      vertexShader:   IronManVertexShader,
      fragmentShader: IronManFragmentShader,
      transparent: false,
      blending:    THREE.NormalBlending,
      depthWrite:  true,
      side:        THREE.FrontSide
    });

    // Preserve morph target data across material swap
    const influences = child.morphTargetInfluences;
    const dict       = child.morphTargetDictionary;
    child.material   = hudMat;
    if (influences) child.morphTargetInfluences = influences;
    if (dict)       child.morphTargetDictionary = dict;
  });

  scene.add(model);
  canvas._model = model;

  // ---- Animation state ----
  let rafId    = null;
  let disposed = false;

  // ---- Animation loop ----
  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);

    const elapsed = clock.getElapsedTime();

    // Update time uniform
    hudUniforms.uTime.value = elapsed;

    // Update controls
    controls.update();

    // Render
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
