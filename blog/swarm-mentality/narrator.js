/**
 * Narrator — Personality-driven slide narration for the Swarm Mentality deck.
 *
 * Self-contained module that:
 *  1. Builds a floating narrator panel UI (personality chips, narrate button, voice selector)
 *  2. Extracts the current visible slide's text content
 *  3. Rewrites content via LLM API in the chosen personality voice
 *  4. Speaks the rewritten text via Kokoro TTS / Audio2Face pipeline
 *  5. Drives the avatar lip-sync through window.readAloudAvatarPlayer
 *
 * Does NOT modify read-aloud.js or any shared files.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  // Narrator API endpoints — configure before use, or switch to kokoro.js browser runtime
  var LLM_API = window.NARRATOR_LLM_API || '';
  var LLM_MODEL = window.NARRATOR_LLM_MODEL || 'claude-haiku-4-5';
  var LLM_KEY = window.NARRATOR_LLM_KEY || '';

  var KOKORO_API = window.NARRATOR_KOKORO_API || '';  // optional server fallback
  var A2F_API = window.NARRATOR_A2F_API || '';        // optional server fallback

  var VOICES_BY_LANG = {
    en: [
      { id: 'bm_george',  label: 'George (M)' },
      { id: 'am_adam',     label: 'Adam (M)' },
      { id: 'am_michael',  label: 'Michael (M)' },
      { id: 'af_heart',   label: 'Heart (F)' },
      { id: 'af_bella',   label: 'Bella (F)' },
      { id: 'af_sarah',   label: 'Sarah (F)' },
      { id: 'bf_emma',    label: 'Emma (F)' }
    ],
    ja: [
      { id: 'jf_alpha',      label: 'Alpha (F)' },
      { id: 'jf_gongitsune', label: 'Gongitsune (F)' },
      { id: 'jm_kumo',       label: 'Kumo (M)' }
    ],
    zh: [
      { id: 'zf_xiaobei',  label: 'Xiaobei (F)' },
      { id: 'zf_xiaoni',   label: 'Xiaoni (F)' },
      { id: 'zm_yunjian',  label: 'Yunjian (M)' }
    ],
    es: [
      { id: 'ef_dora',  label: 'Dora (F)' },
      { id: 'em_alex',  label: 'Alex (M)' }
    ],
    fr: [
      { id: 'ff_siwis',  label: 'Siwis (F)' }
    ]
  };

  var DEFAULT_VOICE = document.body.getAttribute('data-default-voice') || 'bm_george';

  // ---------------------------------------------------------------------------
  // Personality definitions
  // ---------------------------------------------------------------------------

  var PERSONALITIES = [
    {
      id: 'default',
      label: 'Default',
      accent: '#808080',
      system: null // no LLM call — read as-is
    },
    {
      id: 'eli5',
      label: 'ELI5',
      accent: '#60d394',
      system: 'You are explaining this slide to a curious five-year-old. Use very simple words, fun comparisons to toys, animals, or candy, and short sentences. Make it playful and wonder-filled. 2-3 sentences.'
    },
    {
      id: 'eli-hs',
      label: 'ELI HS',
      accent: '#4ade80',
      system: 'You are an enthusiastic high school science teacher explaining a tech presentation slide. Use everyday analogies, keep sentences short, and avoid deep jargon. Make it relatable to a teenager. 2-3 sentences.'
    },
    {
      id: 'eli-college',
      label: 'ELI College',
      accent: '#34d399',
      system: 'You are a college CS professor giving an accessible lecture on this slide content. Assume the audience knows basic programming and math but not ML internals. Use precise language, brief analogies, and one concrete example. 2-3 sentences.'
    },
    {
      id: 'eli-grad',
      label: 'ELI Grad',
      accent: '#2dd4bf',
      system: 'You are a graduate seminar instructor contextualizing this slide for PhD students. Reference relevant papers, contrast with prior art, and note open problems or limitations. Be concise and technically precise. 2-3 sentences.'
    },
    {
      id: 'sarcastic',
      label: 'Sarcastic',
      accent: '#f472b6',
      system: 'You are a dry, sardonic tech commentator who is deeply unimpressed by buzzwords and hype. Rewrite this slide content with withering sarcasm, backhanded compliments, and eye-roll energy. 2-3 sentences max. Be witty, not mean-spirited.'
    },
    {
      id: 'doomer',
      label: 'AI Doomer',
      accent: '#f87171',
      system: 'You are an AI safety researcher who sees existential risk in everything. Rewrite this slide content through the lens of alignment concerns, paperclip maximizers, and impending doom. 2-3 sentences. Sound genuinely worried but articulate.'
    },
    {
      id: 'optimist',
      label: 'Optimist',
      accent: '#fbbf24',
      system: 'You are a tech optimist who sees transformative potential in every AI advancement. You believe AI empowers people and creates abundance. Rewrite this slide content with genuine excitement about the possibilities and how it unlocks new capabilities for everyone. 2-3 sentences. Be inspiring and forward-looking, grounded in real benefits.'
    },
    {
      id: 'custom',
      label: 'Custom',
      accent: '#a78bfa',
      system: '__custom__' // sentinel — replaced at runtime with input box text
    }
  ];

  var LANGUAGES = [
    { id: 'en', label: 'EN', name: 'English' },
    { id: 'ja', label: 'JP', name: 'Japanese' },
    { id: 'zh', label: 'ZH', name: 'Chinese' },
    { id: 'es', label: 'ES', name: 'Spanish' },
    { id: 'fr', label: 'FR', name: 'French' }
  ];

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var selectedPersonality = PERSONALITIES[0];
  var selectedVoice = DEFAULT_VOICE;
  var selectedLanguage = LANGUAGES[0]; // English by default
  var customPrompt = '';
  var isNarrating = false;
  var autoPlay = false;
  var autoSlideIndex = -1; // tracks which slide to narrate next in auto mode
  var currentAudio = null;
  var abortController = null;

  // ---------------------------------------------------------------------------
  // Slide content extraction
  // ---------------------------------------------------------------------------

  /** Get the currently visible slide index from the existing IntersectionObserver. */
  function getCurrentSlideIndex() {
    var slides = document.querySelectorAll('.slide');
    // The slide-nav script tracks currentIndex. We detect it by finding
    // the slide-nav-thumb with .is-active class.
    var activeThumb = document.querySelector('.slide-nav-thumb.is-active');
    if (activeThumb && activeThumb.dataset.index !== undefined) {
      return parseInt(activeThumb.dataset.index, 10);
    }
    // Fallback: find most-visible slide via bounding rect
    var bestIdx = 0;
    var bestVisible = 0;
    slides.forEach(function (slide, i) {
      var rect = slide.getBoundingClientRect();
      var visible = Math.max(0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
      );
      if (visible > bestVisible) {
        bestVisible = visible;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  /** Extract readable text from a slide. */
  function getSlideText(index) {
    var slides = document.querySelectorAll('.slide');
    if (index < 0 || index >= slides.length) return '';
    var slide = slides[index];

    // Explicit narration script takes priority (e.g. image-only slides)
    if (slide.dataset.narration) return slide.dataset.narration;

    var parts = [];

    /** Normalize whitespace: collapse \s+ from HTML source into single space. */
    function cleanText(el) {
      return el.textContent.replace(/\s+/g, ' ').trim();
    }

    // Title
    var titleEl = slide.querySelector('.content-title')
      || slide.querySelector('.glass-panel--divider-title')
      || slide.querySelector('.glass-panel--title');
    if (titleEl) parts.push(cleanText(titleEl));

    // Subtitle / divider body
    var subtitleEl = slide.querySelector('.glass-panel--subtitle')
      || slide.querySelector('.glass-panel--divider-body');
    if (subtitleEl) parts.push(cleanText(subtitleEl));

    // Body content in DOM order: every <li> at any depth + <p> elements.
    // For <li> with nested sub-lists, extract only the direct text so
    // parent and children become separate TTS chunks.
    var bodyEls = slide.querySelectorAll(
      '.content-body li, ' +
      '.content-body > p, .content-body > ul > p'
    );
    bodyEls.forEach(function (el) {
      var text;
      if (el.tagName === 'LI' && el.querySelector('ul, ol')) {
        // Strip nested list content — keep only this item's direct text
        var clone = el.cloneNode(true);
        var nested = clone.querySelectorAll('ul, ol');
        for (var i = 0; i < nested.length; i++) nested[i].parentNode.removeChild(nested[i]);
        text = clone.textContent.replace(/\s+/g, ' ').trim();
      } else {
        text = cleanText(el);
      }
      if (text && parts.indexOf(text) === -1) parts.push(text);
    });

    // Chat thread slides
    var chatBubbles = slide.querySelectorAll('.chat-bubble');
    if (chatBubbles.length > 0 && parts.length <= 1) {
      chatBubbles.forEach(function (b) {
        var name = '';
        var msg = b.closest('.chat-msg');
        if (msg) {
          var nameEl = msg.querySelector('.chat-name');
          if (nameEl) name = cleanText(nameEl) + ' says: ';
        }
        parts.push(name + cleanText(b));
      });
      var annotations = slide.querySelectorAll('.chat-annotation');
      annotations.forEach(function (a) {
        parts.push(cleanText(a));
      });
    }

    // Table cells for framework tables
    var table = slide.querySelector('.framework-table');
    if (table && parts.length <= 1) {
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function (row) {
        var cells = row.querySelectorAll('td');
        var rowText = [];
        cells.forEach(function (td) { rowText.push(cleanText(td)); });
        if (rowText.join('').length > 0) parts.push(rowText.join(' - '));
      });
    }

    return parts.join('\n');
  }

  // ---------------------------------------------------------------------------
  // LLM API
  // ---------------------------------------------------------------------------

  function rewriteWithPersonality(text, personality, signal) {
    // Resolve the system prompt (handle custom personality)
    var systemPrompt = personality.system;
    if (systemPrompt === '__custom__') {
      systemPrompt = customPrompt || null;
    }

    // If no personality and English, skip LLM entirely
    var needsLLM = systemPrompt || selectedLanguage.id !== 'en';
    if (!needsLLM) {
      return Promise.resolve(text);
    }

    // Build system message: personality + language instruction
    var systemParts = [];
    if (systemPrompt) {
      systemParts.push(systemPrompt);
    } else if (selectedLanguage.id !== 'en') {
      systemParts.push('You are a narrator translating slide content for a spoken presentation. Produce a single natural-sounding narration.');
    }
    if (selectedLanguage.id !== 'en') {
      systemParts.push(
        'Respond entirely in ' + selectedLanguage.name + '. ' +
        'Output ONLY the final narration text. ' +
        'Do NOT include any labels, numbering, alternatives, commentary, or translator notes.'
      );
    }
    var fullSystem = systemParts.join('\n\n');
    var userMessage = 'Narrate this slide content:\n\n' + text;

    // --- Chrome Rewriter API (free, on-device) ---
    if (window.ai && window.ai.rewriter) {
      return window.ai.rewriter.create({
        tone: 'as-is',
        sharedContext: fullSystem
      }).then(function (rewriter) {
        var p = rewriter.rewrite(userMessage);
        if (signal) {
          signal.addEventListener('abort', function () { rewriter.destroy(); });
        }
        return p.then(function (result) {
          rewriter.destroy();
          return result;
        });
      }).catch(function (e) {
        console.warn('[Narrator] Chrome Rewriter unavailable:', e.message);
        return rewriteFallbackPromptAPI(fullSystem, userMessage, signal);
      });
    }

    return rewriteFallbackPromptAPI(fullSystem, userMessage, signal);
  }

  /** Chrome Prompt API fallback, then server LLM, then passthrough. */
  function rewriteFallbackPromptAPI(fullSystem, userMessage, signal) {
    // --- Chrome Prompt API (free, on-device) ---
    if (window.ai && window.ai.languageModel) {
      return window.ai.languageModel.create({
        systemPrompt: fullSystem
      }).then(function (session) {
        if (signal) {
          signal.addEventListener('abort', function () { session.destroy(); });
        }
        return session.prompt(userMessage).then(function (result) {
          session.destroy();
          return result;
        });
      }).catch(function (e) {
        console.warn('[Narrator] Chrome Prompt API unavailable:', e.message);
        return rewriteFallbackServerLLM(fullSystem, userMessage, signal);
      });
    }

    return rewriteFallbackServerLLM(fullSystem, userMessage, signal);
  }

  /** Server LLM fallback (when Chrome AI is unavailable). */
  function rewriteFallbackServerLLM(fullSystem, userMessage, signal) {
    if (!LLM_API) {
      // No rewriting available; return original text
      return Promise.resolve(userMessage.replace('Narrate this slide content:\n\n', ''));
    }

    return fetch(LLM_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LLM_KEY
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: fullSystem },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500
      }),
      signal: signal
    }).then(function (r) {
      if (!r.ok) throw new Error('LLM API error: ' + r.status);
      return r.json();
    }).then(function (data) {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      }
      return userMessage.replace('Narrate this slide content:\n\n', '');
    });
  }

  // ---------------------------------------------------------------------------
  // TTS / A2F with sentence-level prefetch
  // ---------------------------------------------------------------------------

  var a2fCache = {};

  // ---------------------------------------------------------------------------
  // Browser TTS via kokoro-js Web Worker
  // ---------------------------------------------------------------------------

  var kokoroWorker = null;
  var kokoroReady = false;
  var kokoroInitFailed = false;    // true if model download/init failed
  var kokoroQueue = [];            // pending {resolve,reject} waiting for model load
  var kokoroAudioResolve = null;   // resolve for current generate request
  var kokoroAudioReject = null;

  function ensureKokoroWorker() {
    if (kokoroWorker) return;
    kokoroWorker = new Worker('kokoro-worker.js', { type: 'module' });
    kokoroWorker.postMessage({ type: 'init' });

    kokoroWorker.onmessage = function (e) {
      if (e.data.type === 'progress') {
        updateLoadingProgress(e.data);
      }
      if (e.data.type === 'ready') {
        kokoroReady = true;
        kokoroInitFailed = false;
        console.log('[Narrator] Kokoro ready — device:', e.data.device || 'unknown');
        hideLoadingProgress();
        // Drain queue: call each pending generate callback
        kokoroQueue.forEach(function (item) { item.onReady(); });
        kokoroQueue = [];
      }
      if (e.data.type === 'audio') {
        if (kokoroAudioResolve) {
          kokoroAudioResolve({ pcm: e.data.pcm, sampleRate: e.data.sampleRate });
          kokoroAudioResolve = null;
          kokoroAudioReject = null;
        }
      }
      if (e.data.type === 'error') {
        console.error('[Kokoro Worker]', e.data.message);
        var err = new Error(e.data.message);
        if (!kokoroReady) {
          // Init failed: reject all queued requests so fallback chain triggers
          kokoroInitFailed = true;
          hideLoadingProgress();
          kokoroQueue.forEach(function (item) { item.onError(err); });
          kokoroQueue = [];
        }
        if (kokoroAudioReject) {
          kokoroAudioReject(err);
          kokoroAudioResolve = null;
          kokoroAudioReject = null;
        }
      }
    };
  }

  /** Encode PCM Float32Array as a 16-bit WAV Blob. */
  function pcmToWavBlob(pcm, sampleRate) {
    var numSamples = pcm.length;
    var bytesPerSample = 2; // 16-bit
    var dataBytes = numSamples * bytesPerSample;
    var buffer = new ArrayBuffer(44 + dataBytes);
    var view = new DataView(buffer);

    function writeStr(offset, str) {
      for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);         // chunk size
    view.setUint16(20, 1, true);           // PCM format
    view.setUint16(22, 1, true);           // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);          // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, dataBytes, true);

    for (var i = 0; i < numSamples; i++) {
      var s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /** Speak text via the in-browser kokoro-js worker (no server needed). */
  function speakBrowserTTS(text, signal, avatarPlayer) {
    ensureKokoroWorker();

    // If init already failed, reject immediately so fallback chain runs
    if (kokoroInitFailed) {
      return Promise.reject(new Error('Kokoro model failed to load'));
    }

    return new Promise(function (resolve, reject) {
      function doGenerate() {
        if (signal && signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }

        kokoroWorker.postMessage({
          type: 'generate',
          text: text,
          voice: selectedVoice,
          speed: 1.0
        });

        kokoroAudioResolve = function (result) {
          if (signal && signal.aborted) { resolve(); return; }

          // Encode PCM as WAV and use <audio> element for AvatarPlayer compatibility
          var wavBlob = pcmToWavBlob(result.pcm, result.sampleRate);
          var audioUrl = URL.createObjectURL(wavBlob);
          currentAudio = new Audio(audioUrl);

          currentAudio.onended = function () {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          currentAudio.onerror = function (err) {
            URL.revokeObjectURL(audioUrl);
            reject(err);
          };
          currentAudio.play().then(function () {
            if (avatarPlayer) avatarPlayer.play(currentAudio);
          }).catch(function (err) {
            URL.revokeObjectURL(audioUrl);
            reject(err);
          });
        };
        kokoroAudioReject = function (err) { reject(err); };
      }

      if (kokoroReady) {
        doGenerate();
      } else {
        kokoroQueue.push({ onReady: doGenerate, onError: reject });
      }
    });
  }

  /** Split text into chunks for per-sentence A2F lip sync + prefetch.
   *  First splits on newlines (bullet points), then on sentence boundaries.
   *  For CJK text, uses extended punctuation set (。！？；—) in addition to .!?
   *  For Latin text, splits on .!? only (preserving natural phrasing). */
  function splitSentences(text) {
    // Detect CJK characters to choose the right punctuation set
    var hasCJK = /[\u3000-\u9fff\uf900-\ufaff]/.test(text);
    var lines = text.split(/\n+/);
    var result = [];
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var sentences;
      if (hasCJK) {
        // CJK: also split on ; —— 。！？；
        sentences = trimmed.match(/(?:[^.!?;\u2014\u3002\uff01\uff1f\uff1b]|\d\.\d)+(?:[.!?;\u2014\u3002\uff01\uff1f\uff1b]+|$)/g);
      } else {
        // Latin: split on .!? only
        sentences = trimmed.match(/(?:[^.!?]|\d\.\d)+(?:[.!?]+|$)/g);
      }
      if (sentences) {
        sentences.forEach(function (s) {
          var t = s.trim();
          if (t) result.push(t);
        });
      } else {
        result.push(trimmed);
      }
    });
    return result.length > 0 ? result : [text];
  }

  /** Fetch A2F data with caching (fire-and-forget safe for prefetch). */
  function fetchA2FCached(text) {
    if (a2fCache[text]) return a2fCache[text];

    var timeoutId;
    var timeoutPromise = new Promise(function (_, reject) {
      timeoutId = setTimeout(function () {
        reject(new Error('A2F timeout (5 s)'));
      }, 5000);
    });

    var fetchPromise = fetch(A2F_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, voice: selectedVoice, speed: 1.0 })
    }).then(function (r) {
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error('A2F API error: ' + r.status);
      return r.json();
    });

    var promise = Promise.race([fetchPromise, timeoutPromise]);
    a2fCache[text] = promise;
    return promise;
  }

  function playA2FData(data, avatarPlayer) {
    var audioBytes = Uint8Array.from(atob(data.audio), function (c) { return c.charCodeAt(0); });
    var audioBlob = new Blob([audioBytes], { type: 'audio/wav' });
    var audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);

    if (avatarPlayer && data.blendshapes) {
      avatarPlayer.setBlendshapeData(data.blendshapes);
    }

    return new Promise(function (resolve, reject) {
      currentAudio.onended = function () {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      currentAudio.onerror = function (err) {
        URL.revokeObjectURL(audioUrl);
        reject(err);
      };
      currentAudio.play().then(function () {
        if (avatarPlayer) {
          avatarPlayer.play(currentAudio);
        }
      }).catch(function (err) {
        URL.revokeObjectURL(audioUrl);
        reject(err);
      });
    });
  }

  function speakKokoro(text, signal, avatarPlayer) {
    return fetch(KOKORO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: selectedVoice,
        response_format: 'mp3',
        speed: 1.0,
        stream: false
      }),
      signal: signal
    }).then(function (r) {
      if (!r.ok) throw new Error('Kokoro API error: ' + r.status);
      return r.blob();
    }).then(function (audioBlob) {
      var audioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(audioUrl);

      return new Promise(function (resolve, reject) {
        currentAudio.onended = function () {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        currentAudio.onerror = function (err) {
          URL.revokeObjectURL(audioUrl);
          reject(err);
        };
        currentAudio.play().then(function () {
          if (avatarPlayer) {
            avatarPlayer.play(currentAudio);
          }
        }).catch(function (err) {
          URL.revokeObjectURL(audioUrl);
          reject(err);
        });
      });
    });
  }

  /**
   * Speak an array of sentences sequentially, using A2F (with prefetch)
   * when available, falling back to plain Kokoro TTS otherwise.
   * Mirrors the prefetch strategy in read-aloud.js.
   */
  function speakSentences(sentences, signal) {
    // Strip smart/curly quotes that cause TTS artifacts (hushed sounds)
    sentences = sentences.map(function (s) {
      return s.replace(/[\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B]/g, '');
    });
    var idx = 0;
    var a2fAvailable = true;
    var avatarPlayer = window.readAloudAvatarPlayer;

    function prefetchUpcoming() {
      if (!a2fAvailable || !avatarPlayer) return;
      for (var i = idx; i < Math.min(idx + 3, sentences.length); i++) {
        fetchA2FCached(sentences[i]);
      }
    }

    function speakNext() {
      if (signal.aborted || idx >= sentences.length) return Promise.resolve();
      var text = sentences[idx];
      idx++;

      prefetchUpcoming();

      if (avatarPlayer && a2fAvailable) {
        return fetchA2FCached(text).then(function (data) {
          delete a2fCache[text];
          if (signal.aborted) return;
          return playA2FData(data, avatarPlayer);
        }).catch(function (err) {
          console.warn('[Narrator] A2F unavailable, falling back to TTS:', err.message);
          a2fAvailable = false;
          a2fCache = {};
          if (signal.aborted) return;
          return speakBrowserTTS(text, signal, avatarPlayer);
        }).then(function () {
          if (signal.aborted) return;
          return speakNext();
        });
      }

      // Browser TTS primary, server Kokoro fallback
      return speakBrowserTTS(text, signal, avatarPlayer).catch(function (err) {
        if (err.name === 'AbortError') throw err;
        if (KOKORO_API) {
          console.warn('[Narrator] Browser TTS failed, falling back to server Kokoro:', err.message);
          return speakKokoro(text, signal, avatarPlayer);
        }
        throw err;
      }).then(function () {
        if (signal.aborted) return;
        return speakNext();
      });
    }

    prefetchUpcoming();
    return speakNext();
  }

  // ---------------------------------------------------------------------------
  // Model loading progress UI
  // ---------------------------------------------------------------------------

  function updateLoadingProgress(data) {
    var bar = document.getElementById('narratorLoadingBar');
    var label = document.getElementById('narratorLoadingLabel');
    var container = document.getElementById('narratorLoading');
    if (!container) return;
    container.style.display = 'block';

    if (data.progress != null && data.total) {
      var pct = Math.round((data.loaded / data.total) * 100);
      if (bar) {
        bar.style.width = pct + '%';
      }
      if (label) {
        var mb = (data.loaded / 1048576).toFixed(1);
        var totalMb = (data.total / 1048576).toFixed(1);
        label.textContent = mb + ' / ' + totalMb + ' MB';
      }
    } else if (data.status === 'initiate' && label) {
      label.textContent = 'Loading model\u2026';
      if (bar) bar.style.width = '0%';
    }
  }

  function hideLoadingProgress() {
    var container = document.getElementById('narratorLoading');
    if (container) container.style.display = 'none';
  }

  // ---------------------------------------------------------------------------
  // Avatar panel helpers
  // ---------------------------------------------------------------------------

  /** Show the digital human avatar panel (created by blendshape-debug.js). */
  function ensureAvatarVisible() {
    var dhPanel = document.getElementById('bsDebugPanel');
    if (dhPanel && !dhPanel.classList.contains('visible')) {
      dhPanel.classList.add('visible');
      // Also expand the DH pill wrapper and mark toggle active
      var dhWrapper = document.getElementById('dhPillWrapper');
      if (dhWrapper) dhWrapper.classList.add('expanded');
      var toggleBtn = document.querySelector('.bs-debug-toggle');
      if (toggleBtn) toggleBtn.classList.add('active');
    }
  }

  /** Scroll to a slide by index. */
  function scrollToSlide(index) {
    var slides = document.querySelectorAll('.slide');
    if (index >= 0 && index < slides.length) {
      slides[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ---------------------------------------------------------------------------
  // Narration control
  // ---------------------------------------------------------------------------

  function stopNarration() {
    var wasAuto = autoPlay && isNarrating;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    a2fCache = {};
    isNarrating = false;
    updateUI();

    var avatarPlayer = window.readAloudAvatarPlayer;
    if (avatarPlayer) {
      avatarPlayer.setAhemPose(false);
      avatarPlayer.stop();
    }

    // If auto-play is on, advance to next slide after a short pause
    if (wasAuto && autoPlay) {
      autoSlideIndex++;
      var totalSlides = document.querySelectorAll('.slide').length;
      if (autoSlideIndex < totalSlides) {
        setTimeout(function () {
          if (!autoPlay) return; // user may have toggled off during pause
          scrollToSlide(autoSlideIndex);
          // Wait for scroll to settle, then narrate
          setTimeout(function () {
            if (!autoPlay) return;
            narrateSlide(autoSlideIndex);
          }, 800);
        }, 600);
      } else {
        // Reached the end
        autoPlay = false;
        autoSlideIndex = -1;
        updateUI();
      }
    }
  }

  /** Narrate a specific slide by index. */
  function narrateSlide(slideIdx) {
    var rawText = getSlideText(slideIdx);
    if (!rawText) {
      // Skip slides with no text (e.g. image-only dividers), advance
      if (autoPlay) {
        autoSlideIndex = slideIdx;
        stopNarration(); // triggers auto-advance via wasAuto check
        // But isNarrating is false, so simulate it:
        autoSlideIndex++;
        var totalSlides = document.querySelectorAll('.slide').length;
        if (autoSlideIndex < totalSlides) {
          setTimeout(function () {
            if (!autoPlay) return;
            scrollToSlide(autoSlideIndex);
            setTimeout(function () {
              if (!autoPlay) return;
              narrateSlide(autoSlideIndex);
            }, 800);
          }, 600);
        } else {
          autoPlay = false;
          autoSlideIndex = -1;
          updateUI();
        }
      }
      return;
    }

    isNarrating = true;
    abortController = new AbortController();
    var signal = abortController.signal;
    updateUI();

    // Show avatar
    ensureAvatarVisible();

    var avatarPlayer = window.readAloudAvatarPlayer;
    if (avatarPlayer) {
      avatarPlayer.setAhemPose(true);
    }

    rewriteWithPersonality(rawText, selectedPersonality, signal)
      .then(function (narrationText) {
        if (signal.aborted) return;

        var previewEl = document.getElementById('narratorPreview');
        if (previewEl) {
          previewEl.textContent = narrationText;
          previewEl.style.display = 'block';
        }

        if (avatarPlayer) {
          avatarPlayer.setAhemPose(false);
        }

        var sentences = splitSentences(narrationText);
        return speakSentences(sentences, signal);
      })
      .then(function () {
        stopNarration(); // will auto-advance if autoPlay is on
      })
      .catch(function (err) {
        if (err.name !== 'AbortError') {
          console.error('[Narrator] Error:', err);
        }
        stopNarration();
      });
  }

  function startNarration() {
    if (isNarrating) {
      // If auto-playing, stop everything including auto mode
      if (autoPlay) {
        autoPlay = false;
        autoSlideIndex = -1;
      }
      stopNarration();
      return;
    }

    var slideIdx = getCurrentSlideIndex();
    if (autoPlay) {
      autoSlideIndex = slideIdx;
    }
    narrateSlide(slideIdx);
  }

  // ---------------------------------------------------------------------------
  // UI construction
  // ---------------------------------------------------------------------------

  function updateUI() {
    var btn = document.getElementById('narratorBtn');
    var btnLabel = document.getElementById('narratorBtnLabel');
    if (!btn) return;

    if (isNarrating) {
      btn.classList.add('narrator-btn--active');
      btnLabel.textContent = 'Stop';
    } else {
      btn.classList.remove('narrator-btn--active');
      btnLabel.textContent = autoPlay ? 'Auto' : 'Narrate';
    }

    // Update personality chip active states
    PERSONALITIES.forEach(function (p) {
      var chip = document.getElementById('narrator-chip-' + p.id);
      if (chip) {
        if (p.id === selectedPersonality.id) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      }
    });

    // Update auto-play toggle
    var autoChip = document.getElementById('narrator-chip-auto');
    if (autoChip) {
      if (autoPlay) {
        autoChip.classList.add('active');
      } else {
        autoChip.classList.remove('active');
      }
    }

    // Show/hide custom input
    var customInput = document.getElementById('narratorCustomInput');
    if (customInput) {
      customInput.style.display = selectedPersonality.id === 'custom' ? 'block' : 'none';
    }

    // Update language chip active states + voice selector
    LANGUAGES.forEach(function (lang) {
      var chip = document.getElementById('narrator-lang-' + lang.id);
      if (chip) {
        if (lang.id === selectedLanguage.id) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      }
    });
    refreshVoiceSelect();
  }

  /** Repopulate the voice <select> for the current language. */
  function refreshVoiceSelect() {
    var voiceSelect = document.getElementById('narratorVoiceSelect');
    if (!voiceSelect) return;
    var voices = VOICES_BY_LANG[selectedLanguage.id] || VOICES_BY_LANG.en;
    voiceSelect.innerHTML = '';
    voices.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.label;
      voiceSelect.appendChild(opt);
    });
    // Preserve current selection if it exists in the new language, otherwise default to first
    var voiceIds = voices.map(function (v) { return v.id; });
    if (voiceIds.indexOf(selectedVoice) === -1) {
      selectedVoice = voices[0].id;
    }
    voiceSelect.value = selectedVoice;
  }

  function buildUI() {
    // --- Main container (hidden by default) ---
    var panel = document.createElement('div');
    panel.className = 'narrator-panel';
    panel.id = 'narratorPanel';

    // --- Header row: title + voice selector ---
    var header = document.createElement('div');
    header.className = 'narrator-header';

    var title = document.createElement('span');
    title.className = 'narrator-title';
    title.textContent = 'Narrator';
    header.appendChild(title);

    // Voice select
    var voiceSelect = document.createElement('select');
    voiceSelect.className = 'narrator-voice-select';
    voiceSelect.id = 'narratorVoiceSelect';
    voiceSelect.addEventListener('change', function () {
      selectedVoice = voiceSelect.value;
    });
    refreshVoiceSelect(); // populate initial options
    header.appendChild(voiceSelect);

    panel.appendChild(header);

    // --- Personality chips ---
    var chipRow = document.createElement('div');
    chipRow.className = 'narrator-chips';

    PERSONALITIES.forEach(function (p) {
      var chip = document.createElement('button');
      chip.className = 'narrator-chip';
      chip.id = 'narrator-chip-' + p.id;
      chip.textContent = p.label;
      chip.style.setProperty('--chip-accent', p.accent);
      if (p.id === selectedPersonality.id) chip.classList.add('active');

      chip.addEventListener('click', function () {
        selectedPersonality = p;
        updateUI();
        // Hide preview when switching personality
        var previewEl = document.getElementById('narratorPreview');
        if (previewEl) previewEl.style.display = 'none';
      });

      chipRow.appendChild(chip);
    });

    panel.appendChild(chipRow);

    // --- Custom personality input (hidden by default) ---
    var customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.className = 'narrator-custom-input';
    customInput.id = 'narratorCustomInput';
    customInput.placeholder = 'e.g. "Narrate like a pirate captain"';
    customInput.style.display = 'none';
    customInput.addEventListener('input', function () {
      customPrompt = customInput.value;
    });
    customInput.addEventListener('keydown', function (e) {
      e.stopPropagation(); // prevent slide keyboard shortcuts while typing
    });
    panel.appendChild(customInput);

    // --- Language chips ---
    var langRow = document.createElement('div');
    langRow.className = 'narrator-chips';

    LANGUAGES.forEach(function (lang) {
      var chip = document.createElement('button');
      chip.className = 'narrator-chip narrator-chip--lang';
      chip.id = 'narrator-lang-' + lang.id;
      chip.textContent = lang.label;
      chip.title = lang.name;
      chip.style.setProperty('--chip-accent', '#38bdf8');
      if (lang.id === selectedLanguage.id) chip.classList.add('active');

      chip.addEventListener('click', function () {
        selectedLanguage = lang;
        updateUI();
      });

      langRow.appendChild(chip);
    });

    panel.appendChild(langRow);

    // --- Controls row: Auto toggle ---
    var controlsRow = document.createElement('div');
    controlsRow.className = 'narrator-chips';

    // Auto-play toggle chip
    var autoChip = document.createElement('button');
    autoChip.className = 'narrator-chip';
    autoChip.id = 'narrator-chip-auto';
    autoChip.textContent = 'Auto';
    autoChip.style.setProperty('--chip-accent', '#60a5fa');
    autoChip.title = 'Auto-advance through all slides';
    autoChip.addEventListener('click', function () {
      autoPlay = !autoPlay;
      if (!autoPlay) {
        autoSlideIndex = -1;
      }
      updateUI();
    });
    controlsRow.appendChild(autoChip);

    panel.appendChild(controlsRow);

    // --- Preview text (hidden by default) ---
    var preview = document.createElement('div');
    preview.className = 'narrator-preview';
    preview.id = 'narratorPreview';
    preview.style.display = 'none';
    panel.appendChild(preview);

    // --- Loading progress (hidden by default, shown during model download) ---
    var loading = document.createElement('div');
    loading.className = 'narrator-loading';
    loading.id = 'narratorLoading';
    loading.style.display = 'none';

    var loadingLabel = document.createElement('span');
    loadingLabel.className = 'narrator-loading-label';
    loadingLabel.id = 'narratorLoadingLabel';
    loadingLabel.textContent = 'Loading model\u2026';
    loading.appendChild(loadingLabel);

    var loadingTrack = document.createElement('div');
    loadingTrack.className = 'narrator-loading-track';
    var loadingBar = document.createElement('div');
    loadingBar.className = 'narrator-loading-bar';
    loadingBar.id = 'narratorLoadingBar';
    loadingTrack.appendChild(loadingBar);
    loading.appendChild(loadingTrack);

    panel.appendChild(loading);

    // --- Narrate button ---
    var btn = document.createElement('button');
    btn.className = 'narrator-btn';
    btn.id = 'narratorBtn';

    var btnIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    btnIcon.setAttribute('width', '18');
    btnIcon.setAttribute('height', '18');
    btnIcon.setAttribute('viewBox', '0 0 24 24');
    btnIcon.setAttribute('fill', 'none');
    btnIcon.setAttribute('stroke', 'currentColor');
    btnIcon.setAttribute('stroke-width', '2');
    btnIcon.setAttribute('stroke-linecap', 'round');
    btnIcon.setAttribute('stroke-linejoin', 'round');
    // Speaker icon
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '11 5 6 9 2 9 2 15 6 15 11 19 11 5');
    btnIcon.appendChild(poly);
    var path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M15.54 8.46a5 5 0 0 1 0 7.07');
    btnIcon.appendChild(path1);
    var path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M19.07 4.93a10 10 0 0 1 0 14.14');
    btnIcon.appendChild(path2);

    btn.appendChild(btnIcon);

    var btnLabel = document.createElement('span');
    btnLabel.id = 'narratorBtnLabel';
    btnLabel.textContent = 'Narrate';
    btn.appendChild(btnLabel);

    btn.addEventListener('click', function () {
      startNarration();
    });

    panel.appendChild(btn);

    // --- Pill wrapper: pill-to-panel expand layout ---
    var wrapper = document.createElement('div');
    wrapper.className = 'pill-wrapper pill-wrapper--narrator';
    wrapper.id = 'narratorPillWrapper';

    // Toggle pill icon
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'narrator-toggle';
    toggleBtn.title = 'Toggle narrator panel';
    toggleBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
      '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
      '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var active = wrapper.classList.toggle('expanded');
      panel.classList.toggle('visible', active);
      toggleBtn.classList.toggle('active', active);
      // Lazy-init: start loading the TTS model when panel is first opened
      if (active) ensureKokoroWorker();
    });

    // Body container for panel (animated open/close)
    var body = document.createElement('div');
    body.className = 'pill-wrapper__body';
    body.appendChild(panel);

    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(body);

    // Insert wrapper into controls
    var controls = document.querySelector('.read-aloud-controls');
    if (controls) {
      controls.appendChild(wrapper);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcut
  // ---------------------------------------------------------------------------

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'n') {
      // 'N' key to toggle narration
      e.preventDefault();
      startNarration();
    } else if (e.key === 'a') {
      // 'A' key to toggle auto-play mode
      e.preventDefault();
      autoPlay = !autoPlay;
      if (!autoPlay) autoSlideIndex = -1;
      updateUI();
    }
  });

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  buildUI();
  updateUI();

})();
