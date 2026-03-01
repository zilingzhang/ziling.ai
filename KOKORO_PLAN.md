# Kokoro.js Browser TTS Migration Plan

## Goal

Replace the server-hosted Kokoro TTS API in `narrator.js` with **kokoro-js** running 100% in the browser.
Also explore Chrome's built-in AI (Rewriter/Prompt API) as a zero-cost LLM alternative for narrator personality rewriting.

---

## Current Architecture

```
narrator.js
  |-- rewriteWithPersonality() --> POST to LLM_API (server-side LiteLLM)
  |-- speakKokoro()            --> POST to KOKORO_API (server-side Kokoro FastAPI)
  |-- fetchA2FCached()         --> POST to A2F_API (server-side Audio2Face)
  |-- speakSentences()         --> orchestrates A2F -> Kokoro fallback chain
```

All three backends (LLM, Kokoro TTS, Audio2Face) are hosted on internal infrastructure.
For personal domain publishing, we need zero backend dependencies.

---

## Target Architecture

```
narrator.js
  |-- rewriteWithPersonality()
  |     |-- Chrome Rewriter API (if available, zero cost)
  |     |-- Chrome Prompt API (fallback, zero cost)
  |     \-- fetch() to configurable LLM_API (fallback for non-Chrome)
  |
  |-- speakBrowserTTS()  [NEW]
  |     |-- kokoro-js Web Worker (q8, ~92MB, cached in browser Cache API)
  |     \-- returns WAV blob for Audio playback
  |
  |-- speakSentences()
        |-- A2F path: still works if A2F_API is configured (lip sync)
        \-- Browser TTS path: kokoro-js worker (no server needed)
```

---

## Implementation Steps

### Step 1: Add kokoro-js Web Worker

**File:** `blog/swarm-mentality/kokoro-worker.js`

```javascript
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
let tts = null;

self.addEventListener("message", async (e) => {
  if (e.data.type === "init") {
    tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: "q8", // ~92MB, good quality, WASM compatible
      device: "wasm", // broad browser support
      progress_callback: (p) => self.postMessage({ type: "progress", ...p }),
    });
    self.postMessage({ type: "ready", voices: tts.list_voices() });
  }

  if (e.data.type === "generate") {
    const audio = await tts.generate(e.data.text, {
      voice: e.data.voice,
      speed: e.data.speed || 1.0,
    });
    // Transfer the Float32Array buffer for zero-copy
    const pcm = audio.data;
    self.postMessage({ type: "audio", pcm, sampleRate: audio.sampling_rate }, [
      pcm.buffer,
    ]);
  }
});
```

### Step 2: Modify narrator.js -- Browser TTS Path

Replace `speakKokoro()` with `speakBrowserTTS()`:

```javascript
// Lazy-init worker
var kokoroWorker = null;
var kokoroReady = false;
var kokoroQueue = []; // pending generate requests

function ensureKokoroWorker() {
  if (kokoroWorker) return;
  kokoroWorker = new Worker("kokoro-worker.js", { type: "module" });
  kokoroWorker.postMessage({ type: "init" });

  kokoroWorker.onmessage = function (e) {
    if (e.data.type === "progress") {
      // Update UI loading indicator
    }
    if (e.data.type === "ready") {
      kokoroReady = true;
      kokoroQueue.forEach((fn) => fn());
      kokoroQueue = [];
    }
    if (e.data.type === "audio") {
      // Resolve the pending promise
    }
  };
}

function speakBrowserTTS(text, signal, avatarPlayer) {
  ensureKokoroWorker();

  return new Promise(function (resolve, reject) {
    function doGenerate() {
      kokoroWorker.postMessage({
        type: "generate",
        text: text,
        voice: selectedVoice,
        speed: 1.0,
      });
      // One-shot listener for this generation
      function onMessage(e) {
        if (e.data.type !== "audio") return;
        kokoroWorker.removeEventListener("message", onMessage);

        var pcm = e.data.pcm;
        var sr = e.data.sampleRate;
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: sr,
        });
        var buffer = audioCtx.createBuffer(1, pcm.length, sr);
        buffer.getChannelData(0).set(pcm);

        var source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = function () {
          audioCtx.close();
          resolve();
        };
        source.start();

        currentAudio = {
          pause: function () {
            source.stop();
            audioCtx.close();
          },
        };

        if (avatarPlayer) avatarPlayer.play(currentAudio);
      }
      kokoroWorker.addEventListener("message", onMessage);
    }

    if (kokoroReady) doGenerate();
    else kokoroQueue.push(doGenerate);
  });
}
```

### Step 3: Update speakSentences() Fallback Chain

```javascript
// In speakSentences(), replace the Kokoro API fallback:
//   OLD: return speakKokoro(text, signal, avatarPlayer);
//   NEW: return speakBrowserTTS(text, signal, avatarPlayer);
```

The A2F path (lip sync) remains unchanged for when A2F_API is configured.
When A2F is unavailable, it falls through to browser TTS instead of server Kokoro.

### Step 4: Chrome Built-in AI for Narrator Personality Rewriting

Replace `rewriteWithPersonality()` LLM call with Chrome APIs when available:

```javascript
async function rewriteWithPersonality(text, personality, signal) {
  var systemPrompt = personality.system;
  if (systemPrompt === "__custom__") systemPrompt = customPrompt || null;
  var needsLLM = systemPrompt || selectedLanguage.id !== "en";
  if (!needsLLM) return Promise.resolve(text);

  // Try Chrome Rewriter API first (free, on-device)
  if (window.ai && window.ai.rewriter) {
    try {
      var rewriter = await window.ai.rewriter.create({
        tone: "as-is",
        sharedContext: systemPrompt,
      });
      var result = await rewriter.rewrite(text);
      rewriter.destroy();
      return result;
    } catch (e) {
      console.warn("[Narrator] Chrome Rewriter unavailable:", e.message);
    }
  }

  // Try Chrome Prompt API (free, on-device)
  if (window.ai && window.ai.languageModel) {
    try {
      var session = await window.ai.languageModel.create({
        systemPrompt: systemPrompt,
      });
      var result = await session.prompt(
        "Narrate this slide content:\n\n" + text,
      );
      session.destroy();
      return result;
    } catch (e) {
      console.warn("[Narrator] Chrome Prompt API unavailable:", e.message);
    }
  }

  // Fallback to server LLM if configured
  if (LLM_API) {
    return fetch(LLM_API, {
      /* existing code */
    });
  }

  // No rewriting available -- return as-is
  return Promise.resolve(text);
}
```

**Chrome Built-in AI Requirements:**

- Chrome 131+ (desktop only)
- 22GB disk space + 4GB VRAM for Gemini Nano
- User must enable: `chrome://flags/#optimization-guide-on-device-model`
- APIs: `window.ai.rewriter`, `window.ai.languageModel`, `window.ai.summarizer`

---

## Voice Mapping

All current narrator voices are supported by kokoro-js v1.0:

| Voice ID      | Lang  | Available     |
| ------------- | ----- | ------------- |
| bm_george     | EN-GB | Yes           |
| am_adam       | EN-US | Yes           |
| am_michael    | EN-US | Yes           |
| af_heart      | EN-US | Yes (default) |
| af_bella      | EN-US | Yes           |
| af_sarah      | EN-US | Yes           |
| bf_emma       | EN-GB | Yes           |
| jf_alpha      | JA    | Yes           |
| jf_gongitsune | JA    | Yes           |
| jm_kumo       | JA    | Yes           |
| zf_xiaobei    | ZH    | Yes           |
| zf_xiaoni     | ZH    | Yes           |
| zm_yunjian    | ZH    | Yes           |
| ef_dora       | ES    | Yes           |
| em_alex       | ES    | Yes           |
| ff_siwis      | FR    | Yes           |

---

## Model Loading UX

- **First visit:** ~92MB download (q8 quantization). Show a progress bar in the narrator panel.
- **Subsequent visits:** Loaded from browser Cache API in <1 second.
- **Lazy loading:** Worker is only created when user first clicks "Narrate" or expands the narrator panel.
- Cache persists across browser sessions (survives tab close).

---

## Migration Checklist

- [ ] Create `kokoro-worker.js` Web Worker
- [ ] Add `speakBrowserTTS()` to narrator.js
- [ ] Update `speakSentences()` to use browser TTS as primary, server as fallback
- [ ] Add Chrome Rewriter/Prompt API to `rewriteWithPersonality()` with graceful fallback
- [ ] Add loading progress UI to narrator panel (model download indicator)
- [ ] Test with all 16 voices across 5 languages
- [ ] Remove server API defaults (LLM_API, KOKORO_API) -- keep as optional fallback
- [ ] Update importmap or add kokoro-js CDN script tag

---

## Dependencies

| Package                   | CDN                    | Size                       |
| ------------------------- | ---------------------- | -------------------------- |
| kokoro-js@1.2.1           | jsdelivr/unpkg         | ~92MB model (q8) + ~2MB JS |
| @huggingface/transformers | (bundled in kokoro-js) | included                   |

No npm install needed -- works via CDN ES module import in the Web Worker.
