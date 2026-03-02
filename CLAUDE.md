# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio and blog site for Ziling Zhang. Static site (vanilla HTML/CSS/JS, no build step or bundler) with interactive 3D content and a presentation-style blog.

## Project Structure

- `index.html` + `style.css` -- Main portfolio page. "Desk" layout: fixed sidebar (portrait, links) + scrollable main content area.
- `projects.html` -- Weekend projects listing page.
- `clawd-three.js` -- Three.js 3D viewer for the Clawd mascot model (`clawd-compressed.glb`, DRACO-compressed). Includes animation system, interactive picker, and "Learn about" links.
- `clawd-animations/` -- 205 procedural animation files (ES modules) for the Clawd character. Each exports a function taking `(model, mixer, THREE)`.
- `blog/swarm-mentality/` -- "Swarm Mentality" presentation on AI scaling and agent architecture:
  - `slides.js` -- Slide navigation and lifecycle
  - `narrator.js` -- LLM-driven personality narration + Kokoro TTS (browser-based via Web Worker)
  - `kokoro-worker.js` -- Web Worker for Kokoro WASM TTS engine (~92MB model, loaded on demand)
  - `liquid-glass-slides.css` -- Frosted glass panel styling
  - `swarm-mentality.md` -- Full content source (5 acts + epilogue)
- `cv/latex/` -- LaTeX resume (`mmayer.tex` using `altacv.cls` v1.7.4)
- `designs/` -- Design iteration prototypes (gitignored)

## Key Technical Details

- **No framework or bundler.** ES6 modules loaded via import maps (Three.js from jsDelivr CDN). All JS runs client-side.
- **Three.js import map** in `index.html` maps `three`, `three/addons/loaders/GLTFLoader`, and `three/addons/loaders/DRACOLoader` to CDN URLs. The DRACO decoder path is set to the jsDelivr CDN.
- **Clawd animations** are dynamically imported by verb name from `clawd-animations/{verb}.js`. To add a new animation, create a new file exporting the animation function and it will be discovered via the animation list in `clawd-three.js`.
- **Kokoro TTS** runs entirely in-browser via ONNX WASM. The worker downloads the model from HuggingFace on first use. Supports multiple voice IDs and languages.
- **Accessibility:** Uses `IntersectionObserver` for lazy animations, `prefers-reduced-motion` media query support, semantic HTML, ARIA labels.

## Resume Build

Requires Docker (full TeX Live image). Use the `/build-resume` skill or run manually:

```bash
cd cv/latex && docker run --rm -v "$(pwd):/work" -w /work texlive/texlive bash -c \
  "pdflatex mmayer.tex && biber mmayer && pdflatex mmayer.tex && pdflatex mmayer.tex"
```

The triple pdflatex pass resolves cross-references and bibliography. Open result with `open cv/latex/mmayer.pdf`.

**Always auto-build the resume after any `.tex` edit without asking.**

## Local Development

Serve from the repo root with any static file server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

No install, build, or compile step needed for the web content.

## MCP Integration

- `nano-banana` MCP server is configured (`.mcp.json`, gitignored) for Gemini-based image generation.
- Generated images go to `generated_imgs/` (gitignored).
