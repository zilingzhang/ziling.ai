/**
 * Kokoro TTS Web Worker — runs kokoro-js entirely in the browser.
 *
 * Messages IN:
 *   { type: "init" }                    — load model (~92MB q8, cached after first download)
 *   { type: "generate", text, voice, speed }  — synthesise speech, returns PCM float32
 *
 * Messages OUT:
 *   { type: "progress", status, name, file, progress, loaded, total }
 *   { type: "ready", voices: string[], device: string }
 *   { type: "audio", pcm: Float32Array, sampleRate: number }
 *   { type: "error", message: string }
 */

import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
let tts = null;

self.addEventListener("message", async (e) => {
  const { type } = e.data;

  if (type === "init") {
    const progress_callback = (p) => self.postMessage({ type: "progress", ...p });
    let device = "wasm";

    // Try WebGPU first for much faster inference, fall back to WASM
    try {
      if (typeof navigator !== "undefined" && navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          device = "webgpu";
        }
      }
    } catch (_) {
      // WebGPU not available, stick with WASM
    }

    try {
      tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: device === "webgpu" ? "fp32" : "q8",
        device,
        progress_callback,
      });
      self.postMessage({ type: "ready", voices: tts.list_voices(), device });
    } catch (err) {
      // If WebGPU failed, retry with WASM
      if (device === "webgpu") {
        console.warn("[Kokoro Worker] WebGPU failed, retrying with WASM:", err.message);
        device = "wasm";
        try {
          tts = await KokoroTTS.from_pretrained(MODEL_ID, {
            dtype: "q8",
            device,
            progress_callback,
          });
          self.postMessage({ type: "ready", voices: tts.list_voices(), device });
        } catch (err2) {
          self.postMessage({ type: "error", message: err2.message });
        }
      } else {
        self.postMessage({ type: "error", message: err.message });
      }
    }
  }

  if (type === "generate") {
    if (!tts) {
      self.postMessage({ type: "error", message: "Model not loaded yet" });
      return;
    }
    try {
      const audio = await tts.generate(e.data.text, {
        voice: e.data.voice,
        speed: e.data.speed || 1.0,
      });
      // kokoro-js generate() returns a RawAudio object
      // Probe the actual shape since the API surface varies across builds
      const pcm = audio.audio ?? audio.data ?? audio.waveform;
      if (!pcm) {
        const keys = Object.keys(audio).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(audio)));
        throw new Error('Unknown audio shape. Keys: ' + keys.join(', '));
      }
      const sr = audio.sampling_rate ?? audio.sampleRate ?? 24000;
      self.postMessage(
        { type: "audio", pcm, sampleRate: sr },
        [pcm.buffer]
      );
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }
});
