/**
 * avatar-style-adjutant.js
 *
 * Three.js ES module that renders a GLB avatar with a
 * StarCraft 2 Adjutant / Tactical Command AI aesthetic.
 *
 * Green phosphor CRT, wireframe overlay, HUD targeting reticle,
 * scrolling data readouts, scanning beam, and particle grid.
 *
 * Usage:
 *   import { init } from './avatar-style-adjutant.js';
 *   const cleanup = await init(canvasElement, 'heroes/ziling_zhang.glb');
 *   // later:
 *   cleanup();
 *
 * @module avatar-style-adjutant
 */

import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader }    from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// SC2 Adjutant toon shader (LAYER 1 -- solid face with green tint)
// ---------------------------------------------------------------------------

const AdjutantShaderDef = {
  vertexShader: /* glsl */ `
    #include <morphtarget_pars_vertex>

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    void main() {
      vUv = uv;

      #include <begin_vertex>
      #include <morphtarget_vertex>

      vNormal   = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uScanY;
    uniform vec3  uLightDir;

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    // ---------- colour palette ----------
    const vec3 COL_DARK   = vec3(0.02, 0.08, 0.02);
    const vec3 COL_MID    = vec3(0.05, 0.25, 0.08);
    const vec3 COL_BRIGHT = vec3(0.10, 0.50, 0.15);
    const vec3 COL_EDGE   = vec3(0.20, 1.00, 0.30);

    void main() {
      // ---- Toon shading (3 bands) ----
      float NdotL = dot(normalize(vNormal), normalize(uLightDir));
      float raw   = NdotL * 0.5 + 0.5;
      float band  = floor(raw * 3.0) / 3.0;

      vec3 baseColor;
      if (band < 0.34) {
        baseColor = COL_DARK;
      } else if (band < 0.67) {
        baseColor = COL_MID;
      } else {
        baseColor = COL_BRIGHT;
      }

      // ---- Grid overlay (square grid on world XZ) ----
      vec2 gridUV = fract(vWorldPos.xz * 20.0);
      float lineX = step(gridUV.x, 0.04) + step(1.0 - gridUV.x, 0.04);
      float lineZ = step(gridUV.y, 0.04) + step(1.0 - gridUV.y, 0.04);
      float grid  = clamp(lineX + lineZ, 0.0, 1.0);

      // Second finer grid on XY for the face surface
      vec2 gridUV2 = fract(vWorldPos.xy * 35.0);
      float lineX2 = step(gridUV2.x, 0.03) + step(1.0 - gridUV2.x, 0.03);
      float lineY2 = step(gridUV2.y, 0.03) + step(1.0 - gridUV2.y, 0.03);
      float grid2  = clamp(lineX2 + lineY2, 0.0, 1.0);

      float gridTotal = clamp(grid + grid2 * 0.5, 0.0, 1.0);
      baseColor = mix(baseColor, vec3(0.06, 0.35, 0.10), gridTotal * 0.35);

      // ---- Scan line ----
      float scanDist = abs(vWorldPos.y - uScanY);
      float scanLine = smoothstep(0.06, 0.0, scanDist);
      // Wider glow behind the scan line
      float scanGlow = smoothstep(0.20, 0.0, scanDist) * 0.4;
      baseColor += vec3(0.15, 0.90, 0.25) * scanLine;
      baseColor += vec3(0.05, 0.40, 0.10) * scanGlow;

      // ---- Fresnel edge glow ----
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
      // Sharpen the edge for a crisp outline feel
      fresnel = pow(fresnel, 3.0);
      baseColor += COL_EDGE * fresnel * 0.6;

      gl_FragColor = vec4(baseColor, 1.0);
    }
  `
};

// ---------------------------------------------------------------------------
// HUD overlay shader (drawn on a full-screen quad in front of the camera)
// ---------------------------------------------------------------------------

const HUDShaderDef = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec2  uResolution;

    varying vec2 vUv;

    // --- helpers ---
    float box(vec2 p, vec2 lo, vec2 hi) {
      vec2 d = step(lo, p) * step(p, hi);
      return d.x * d.y;
    }

    // Draw a horizontal line segment from (x0,y) to (x1,y) with half-thickness hw
    float hLine(vec2 p, float x0, float x1, float y, float hw) {
      return step(x0, p.x) * step(p.x, x1) * step(y - hw, p.y) * step(p.y, y + hw);
    }

    // Draw a vertical line segment from (x,y0) to (x,y1) with half-thickness hw
    float vLine(vec2 p, float x, float y0, float y1, float hw) {
      return step(y0, p.y) * step(p.y, y1) * step(x - hw, p.x) * step(p.x, x + hw);
    }

    // Simple pseudo-random for data columns
    float hash(float n) {
      return fract(sin(n * 43758.5453123) * 12345.6789);
    }

    // Render a single "character cell" as a small filled block (simulated text)
    float charBlock(vec2 p, vec2 cellOrigin, vec2 cellSize, float seed) {
      // Is p inside this cell?
      vec2 lo = cellOrigin;
      vec2 hi = cellOrigin + cellSize * vec2(0.7, 0.8); // slightly smaller than cell
      float inCell = box(p, lo, hi);
      // Randomly leave some cells empty to look like text
      float on = step(0.35, hash(seed));
      return inCell * on;
    }

    void main() {
      vec2 uv = vUv;
      float alpha = 0.0;
      float hw = 0.003; // line half-width

      // --- Corner brackets (targeting reticle) ---
      // Bracket dimensions -- pushed to outer edges
      float m  = 0.02;  // tight to edge
      float bl = 0.08;  // bracket arm length

      // Top-left
      alpha += hLine(uv, m, m + bl, 1.0 - m, hw);
      alpha += vLine(uv, m, 1.0 - m - bl, 1.0 - m, hw);

      // Top-right
      alpha += hLine(uv, 1.0 - m - bl, 1.0 - m, 1.0 - m, hw);
      alpha += vLine(uv, 1.0 - m, 1.0 - m - bl, 1.0 - m, hw);

      // Bottom-left
      alpha += hLine(uv, m, m + bl, m, hw);
      alpha += vLine(uv, m, m, m + bl, hw);

      // Bottom-right
      alpha += hLine(uv, 1.0 - m - bl, 1.0 - m, m, hw);
      alpha += vLine(uv, 1.0 - m, m, m + bl, hw);

      // Small tick marks at bracket midpoints (inner ticks)
      float tick = 0.015;
      // Top centre
      alpha += hLine(uv, 0.48, 0.52, 1.0 - m, hw * 0.7);
      // Bottom centre
      alpha += hLine(uv, 0.48, 0.52, m, hw * 0.7);
      // Left centre
      alpha += vLine(uv, m, 0.48, 0.52, hw * 0.7);
      // Right centre
      alpha += vLine(uv, 1.0 - m, 0.48, 0.52, hw * 0.7);

      // --- Scrolling data column on the far left edge ---
      // We simulate text as small filled rectangles scrolling upward
      float colX = 0.005;
      float colW = 0.04;
      float charH = 0.012;
      float charW = colW;
      float scrollSpeed = 0.08;
      float scrollOffset = mod(uTime * scrollSpeed, 1.0);

      for (int row = 0; row < 35; row++) {
        float fy = float(row) * charH * 1.4 + 0.10;
        fy = mod(fy + scrollOffset, 0.82) + 0.10; // wrap in visible area
        float seed = float(row) * 7.13 + floor(uTime * 0.3);

        // Row of "characters" (3-8 mini blocks per row)
        for (int col = 0; col < 6; col++) {
          float cx = colX + float(col) * charW * 0.18;
          float cellSeed = seed + float(col) * 3.7;
          alpha += charBlock(uv, vec2(cx, fy), vec2(charW * 0.15, charH), cellSeed) * 0.6;
        }
      }

      // --- Right-side data column (thinner, different scroll rate) ---
      float rColX = 0.96;
      for (int row = 0; row < 20; row++) {
        float fy = float(row) * charH * 1.8 + 0.15;
        fy = mod(fy - uTime * 0.05, 0.70) + 0.15;
        float seed = float(row) * 11.37 + floor(uTime * 0.2);
        for (int col = 0; col < 4; col++) {
          float cx = rColX + float(col) * 0.015;
          alpha += charBlock(uv, vec2(cx, fy), vec2(0.010, charH), seed + float(col) * 2.3) * 0.45;
        }
      }

      // --- Status bar / heartbeat line at the bottom ---
      float barY  = 0.035;
      float barHW = 0.0015;
      // Base line
      alpha += hLine(uv, 0.15, 0.85, barY, barHW) * 0.5;

      // Heartbeat blip (triangle pulse traveling left to right)
      float blipX = mod(uTime * 0.15, 0.70) + 0.15;
      float dx = uv.x - blipX;
      if (abs(dx) < 0.03 && uv.y > barY - 0.02 && uv.y < barY + 0.02) {
        // Triangle wave
        float blipH = (1.0 - abs(dx) / 0.03) * 0.018;
        float blipShape = step(barY - blipH, uv.y) * step(uv.y, barY + blipH);
        alpha += blipShape * 0.8;
      }

      // Blip trail (fading line behind the blip)
      float trailStart = blipX - 0.15;
      float trailEnd   = blipX - 0.03;
      if (uv.x > trailStart && uv.x < trailEnd && abs(uv.y - barY) < barHW * 2.0) {
        float trailFade = (uv.x - trailStart) / (trailEnd - trailStart);
        alpha += trailFade * 0.3;
      }

      // --- Scan line indicator on right edge ---
      // A small moving caret showing scan progress
      float scanProgress = mod(uTime * 0.25, 1.0);
      float caretY = mix(0.10, 0.90, scanProgress);
      float caretX = 0.97;
      if (abs(uv.y - caretY) < 0.008 && uv.x > caretX - 0.012 && uv.x < caretX) {
        float tri = 1.0 - abs(uv.y - caretY) / 0.008;
        alpha += tri * 0.7;
      }

      // --- Horizontal scan-line interference (CRT feel) ---
      float scanLines = sin(uv.y * uResolution.y * 1.5) * 0.5 + 0.5;
      float crtAlpha = scanLines * 0.04; // very subtle

      // Final output: bright green on transparent
      vec3 hudColor = vec3(0.0, 1.0, 0.27); // #00ff44-ish
      float finalAlpha = clamp(alpha, 0.0, 1.0) + crtAlpha;
      finalAlpha = clamp(finalAlpha, 0.0, 0.95);

      gl_FragColor = vec4(hudColor * finalAlpha, finalAlpha);
    }
  `
};

// ---------------------------------------------------------------------------
// init() -- the single exported entry point
// ---------------------------------------------------------------------------

/**
 * Initialise the SC2 Adjutant renderer on the given canvas.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @param {string}           glbUrl - Relative path to a .glb file.
 * @returns {Promise<Function>} Cleanup function that disposes all resources.
 */
export async function init(canvas, glbUrl) {
  // ----- sizing -----
  const container = canvas.parentElement;
  const rect      = container.getBoundingClientRect();
  const width     = rect.width;
  const height    = rect.height;
  const dpr       = Math.min(window.devicePixelRatio, 2);

  // ----- renderer -----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
  renderer.setClearColor(0x050a05, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  // ----- scene & camera -----
  const scene  = new THREE.Scene();
  const aspect = width / height;
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
  camera.position.set(-0.76, -0.43, 3.57);
  camera.lookAt(0.07, 0.08, 0.02);

  // ----- Orbit controls -----
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.07, 0.08, 0.02);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 5.0;
  controls.update();

  // Expose camera/controls on canvas for debugging
  canvas._camera = camera;
  canvas._controls = controls;

  // ----- lighting (minimal) -----
  const dirLight = new THREE.DirectionalLight(0x22cc44, 0.6);
  dirLight.position.set(1, 2, 3);
  scene.add(dirLight);

  const ambient = new THREE.AmbientLight(0x0a1f0a, 0.3);
  scene.add(ambient);

  // ----- clock -----
  const clock = new THREE.Clock();

  // ----- load GLB -----
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

  // ----- centre, scale, orient -----
  const box    = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());

  model.position.sub(centre);
  const targetHeight = 1.6;
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);
  model.position.y -= 0.05;
  model.rotation.x =  0.20;
  model.rotation.y = -0.26;

  scene.add(model);
  canvas._model = model;

  // Recompute bounding box after transform for scan-line range
  const transformedBox = new THREE.Box3().setFromObject(model);
  const modelMinY = transformedBox.min.y;
  const modelMaxY = transformedBox.max.y;

  // ----- shared uniforms -----
  const adjutantUniforms = {
    uTime:     { value: 0 },
    uScanY:    { value: modelMaxY },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() }
  };

  // ----- LAYER 1: replace all mesh materials with adjutant shader -----
  const wireframeGroup = new THREE.Group();

  model.traverse((child) => {
    if (!child.isMesh) return;

    // Create Adjutant shader material
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:     adjutantUniforms.uTime,
        uScanY:    adjutantUniforms.uScanY,
        uLightDir: adjutantUniforms.uLightDir
      },
      vertexShader:   AdjutantShaderDef.vertexShader,
      fragmentShader: AdjutantShaderDef.fragmentShader
    });

    // Preserve morph target data
    const influences = child.morphTargetInfluences;
    const dict       = child.morphTargetDictionary;
    child.material = mat;
    if (influences) child.morphTargetInfluences = influences;
    if (dict)       child.morphTargetDictionary = dict;

    // ----- LAYER 2: wireframe overlay clone -----
    const wireGeo = child.geometry.clone();
    const wireMat = new THREE.MeshBasicMaterial({
      wireframe:   true,
      color:       0x00ff44,
      transparent: true,
      opacity:     0.15
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);

    // Copy the world transform from the original mesh
    child.updateWorldMatrix(true, false);
    wireMesh.applyMatrix4(child.matrixWorld);
    wireMesh.scale.multiplyScalar(1.002);

    wireframeGroup.add(wireMesh);
  });

  scene.add(wireframeGroup);

  // ----- Background particle grid -----
  const PARTICLE_COUNT = 100;
  const particleGeo    = new THREE.BufferGeometry();
  const particlePos    = new Float32Array(PARTICLE_COUNT * 3);
  const particleSeeds  = new Float32Array(PARTICLE_COUNT); // for drift variation

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Loose grid arrangement
    const cols = 10;
    const rows = 10;
    const col = i % cols;
    const row = Math.floor(i / cols);
    particlePos[i * 3]     = (col / cols - 0.5) * 2.0 + (Math.random() - 0.5) * 0.15;
    particlePos[i * 3 + 1] = (row / rows - 0.5) * 2.0 + (Math.random() - 0.5) * 0.15;
    particlePos[i * 3 + 2] = -1.5 + (Math.random() - 0.5) * 0.5;
    particleSeeds[i] = Math.random() * Math.PI * 2;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  particleGeo.setAttribute('aSeed',    new THREE.BufferAttribute(particleSeeds, 1));

  const particleMat = new THREE.PointsMaterial({
    color:       0x1a6b2a,
    size:        0.012,
    transparent: true,
    opacity:     0.35,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ----- HUD overlay plane -----
  const hudGeo = new THREE.PlaneGeometry(2, 2);
  const hudMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:       { value: 0 },
      uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) }
    },
    vertexShader:   HUDShaderDef.vertexShader,
    fragmentShader: HUDShaderDef.fragmentShader,
    transparent:  true,
    depthTest:    false,
    depthWrite:   false
  });

  const hudMesh   = new THREE.Mesh(hudGeo, hudMat);
  const hudScene  = new THREE.Scene();
  const hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  hudScene.add(hudMesh);

  // ----- Post-processing -----
  const renderTarget = new THREE.WebGLRenderTarget(
    width * dpr, height * dpr,
    { type: THREE.HalfFloatType }
  );
  const composer  = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width * dpr, height * dpr),
    0.8,   // strength
    0.3,   // radius
    0.3    // threshold
  );
  composer.addPass(bloomPass);

  // ----- Animation state -----
  let rafId    = null;
  let disposed = false;

  // ----- Animation loop -----
  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    const dt      = clock.getDelta();

    // Update shared uniforms
    adjutantUniforms.uTime.value  = elapsed;
    const scanProgress = (elapsed * 0.25) % 1.0;
    adjutantUniforms.uScanY.value = THREE.MathUtils.lerp(modelMaxY, modelMinY, scanProgress);

    // HUD uniforms
    hudMat.uniforms.uTime.value = elapsed;

    // Subtle model Y-rotation oscillation
    if (!canvas._externalRotation) model.rotation.y = -0.26 + Math.sin(elapsed * 0.3) * 0.02;

    // Particle drift
    const posAttr = particleGeo.getAttribute('position');
    const seedAttr = particleGeo.getAttribute('aSeed');
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const seed = seedAttr.getX(i);
      const baseY = posAttr.getY(i);
      posAttr.setY(i, baseY + Math.sin(elapsed * 0.2 + seed) * 0.0003);
      const baseX = posAttr.getX(i);
      posAttr.setX(i, baseX + Math.cos(elapsed * 0.15 + seed * 2.0) * 0.0002);
    }
    posAttr.needsUpdate = true;

    // Update orbit controls
    controls.update();

    // Render main scene with bloom
    composer.render();

    // Render HUD overlay on top (no clear -- additive layer)
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(hudScene, hudCamera);
    renderer.autoClear = true;
  }

  clock.start();
  animate();

  // ----- Cleanup -----
  function cleanup() {
    disposed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // Dispose model meshes
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
    scene.remove(model);

    // Dispose wireframe group
    wireframeGroup.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    scene.remove(wireframeGroup);

    // Dispose particles
    particleGeo.dispose();
    particleMat.dispose();
    scene.remove(particles);

    // Dispose HUD
    hudGeo.dispose();
    hudMat.dispose();
    hudScene.remove(hudMesh);

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
