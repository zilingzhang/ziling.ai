// Read Aloud Feature with Kokoro TTS Integration
(function() {
  const button = document.getElementById('readAloudBtn');
  const buttonText = document.getElementById('readAloudText');
  const settingsBtn = document.getElementById('settingsBtn');
  const voiceSelector = document.getElementById('voiceSelector');
  const voiceSelect = document.getElementById('voiceSelect');
  const article = document.querySelector('.article');

  if (!button || !article) return; // Exit if required elements not found

  let isPlaying = false;
  let currentIndex = 0;
  let currentListItemIndex = 0; // Track position within current list
  let readableElements = [];
  let voices = [];
  let selectedVoice = null;

  // Avatar integration: expose a reference that the avatar module can set
  window.readAloudAvatarPlayer = null;

  const KOKORO_API = 'https://grace.bldev.infoprint.com/tts/v1/audio/speech';
  const A2F_API = window.A2F_API_URL || 'https://grace.bldev.infoprint.com/a2f/api/a2f/tts-a2f';
  const KOKORO_VOICES = ['af_heart', 'af_bella', 'af_sarah', 'am_adam', 'am_michael', 'bf_emma', 'bm_george'];
  let useKokoro = false;
  let currentAudio = null;

  // Prefetch cache: maps text -> Promise<{audio, blendshapes}>
  const prefetchCache = new Map();

  // A2F connection status indicator (dot created by blendshape-debug.js)
  const A2F_HEALTH_URL = A2F_API.replace(/\/api\/a2f\/.*$/, '/health/a2f');
  let a2fConnected = false;

  function updateA2FDot(connected, title) {
    var dot = document.getElementById('a2fStatusDot');
    if (dot) {
      dot.className = 'a2f-status ' + (connected ? 'connected' : 'disconnected');
      dot.title = title;
    }
    var label = document.getElementById('a2fStatusLabel');
    if (label) {
      label.textContent = connected ? 'AI Lip Sync' : 'Basic Lip Sync';
    }
  }

  function checkA2FStatus() {
    fetch(A2F_HEALTH_URL, { mode: 'cors' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        a2fConnected = data.status === 'connected';
        updateA2FDot(a2fConnected, a2fConnected ? 'A2F: connected' : 'A2F: disconnected (amplitude fallback)');
      })
      .catch(function() {
        a2fConnected = false;
        updateA2FDot(false, 'A2F: unreachable (amplitude fallback)');
      });
  }
  checkA2FStatus();
  setInterval(checkA2FStatus, 30000);

  // Configure selectors based on page structure
  const hasOrderedLists = article.querySelector('ol') !== null;
  const hasSlideGallery = article.querySelector('.slide-gallery') !== null;

  const elementSelector = hasOrderedLists
    ? '.article > p, .article > h2, .article > h3, .article > blockquote, .article > ul, .article > ol'
    : '.article > p, .article > h2, .article > h3, .article > blockquote, .article > ul';

  const exclusionSelector = hasSlideGallery
    ? '.callout, .author-card, .doc-link-float, .slide-gallery'
    : '.callout, .author-card, .doc-link-float';

  // Load available voices
  function loadVoices() {
    voices = window.speechSynthesis.getVoices();

    // Clear existing options
    while (voiceSelect.firstChild) {
      voiceSelect.removeChild(voiceSelect.firstChild);
    }

    // Add Kokoro voices
    const kokoroGroup = document.createElement('optgroup');
    kokoroGroup.label = 'Kokoro TTS (High Quality)';
    KOKORO_VOICES.forEach(voice => {
      const option = document.createElement('option');
      option.value = 'kokoro:' + voice;
      option.textContent = voice.replace('_', ' ').toUpperCase();
      kokoroGroup.appendChild(option);
    });
    voiceSelect.appendChild(kokoroGroup);

    // Add default option
    const browserGroup = document.createElement('optgroup');
    browserGroup.label = 'Browser TTS';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default';
    browserGroup.appendChild(defaultOption);

    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = 'browser:' + index.toString();
      option.textContent = voice.name + ' (' + voice.lang + ')';
      browserGroup.appendChild(option);
    });
    voiceSelect.appendChild(browserGroup);

    // Check for page-specific default voice via data attribute
    const pageDefaultVoice = document.body.getAttribute('data-default-voice');
    const defaultVoice = pageDefaultVoice ? 'kokoro:' + pageDefaultVoice : 'kokoro:bm_george';
    voiceSelect.value = defaultVoice;
    handleVoiceChange();
  }

  // Load voices on page load and when voices change
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  loadVoices();

  // Add play buttons to all readable paragraphs
  function addPlayButtons() {
    const elements = Array.from(article.querySelectorAll(elementSelector));

    elements.forEach((el, index) => {
      // Skip elements inside exclusion zones
      if (el.closest(exclusionSelector)) {
        return;
      }

      // Create play button with safe DOM methods
      const playBtn = document.createElement('button');
      playBtn.className = 'paragraph-play-button';
      playBtn.setAttribute('aria-label', 'Read from here');
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '5 3 19 12 5 21 5 3');
      svg.appendChild(polygon);
      playBtn.appendChild(svg);

      let hideTimeout;

      // Show button on paragraph hover
      el.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
        playBtn.style.display = 'flex';
      });

      // Hide button when leaving paragraph (with delay)
      el.addEventListener('mouseleave', function() {
        hideTimeout = setTimeout(function() {
          playBtn.style.display = 'none';
        }, 200);
      });

      // Keep button visible when hovering over it
      playBtn.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
        playBtn.style.display = 'flex';
      });

      // Hide button when leaving button
      playBtn.addEventListener('mouseleave', function() {
        hideTimeout = setTimeout(function() {
          playBtn.style.display = 'none';
        }, 200);
      });

      playBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        startReadingFrom(el);
      });

      el.appendChild(playBtn);
    });
  }

  // Start reading from a specific element
  function startReadingFrom(element) {
    // Stop any currently playing audio first
    if (isPlaying) {
      window.speechSynthesis.cancel();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      clearHighlights();
    }

    // Get all readable elements
    const allElements = Array.from(article.querySelectorAll(elementSelector));

    readableElements = allElements.filter(el => {
      return !el.closest(exclusionSelector);
    });

    // Find the index of the clicked element
    currentIndex = readableElements.indexOf(element);

    if (currentIndex === -1) return;

    // Start playing -- show loading until audio begins
    currentListItemIndex = 0;
    isPlaying = true;
    setButtonLoading();
    voiceSelector.classList.remove('show');
    settingsBtn.classList.remove('active');
    speakNext();
  }

  // Initialize play buttons on page load
  addPlayButtons();

  // Handle voice selection
  function handleVoiceChange() {
    prefetchCache.clear(); // voice changed, cached audio is stale
    const value = voiceSelect.value;
    if (value.startsWith('kokoro:')) {
      useKokoro = true;
      selectedVoice = value.replace('kokoro:', '');
    } else if (value.startsWith('browser:')) {
      useKokoro = false;
      const index = parseInt(value.replace('browser:', ''));
      selectedVoice = voices[index];
    } else {
      useKokoro = false;
      selectedVoice = null;
    }
  }

  voiceSelect.addEventListener('change', handleVoiceChange);

  // Toggle settings panel
  settingsBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    voiceSelector.classList.toggle('show');
    settingsBtn.classList.toggle('active');
  });

  // Close settings when clicking outside
  document.addEventListener('click', function(e) {
    if (!voiceSelector.contains(e.target) && e.target !== settingsBtn) {
      voiceSelector.classList.remove('show');
      settingsBtn.classList.remove('active');
    }
  });

  /** Transition button from loading to playing once audio starts. */
  function setButtonPlaying() {
    button.classList.remove('loading');
    button.classList.add('playing');
    buttonText.textContent = 'Stop';
    if (window.readAloudAvatarPlayer) {
      window.readAloudAvatarPlayer.setAhemPose(false);
    }
  }

  /** Show loading pulse while waiting for TTS/A2F response. */
  function setButtonLoading() {
    button.classList.remove('playing');
    button.classList.add('loading');
    buttonText.textContent = 'Ahem\u2026';
    if (window.readAloudAvatarPlayer) {
      window.readAloudAvatarPlayer.setAhemPose(true);
    }
  }

  function clearHighlights() {
    readableElements.forEach(el => el.classList.remove('reading-active'));
  }

  function scrollToElement(element) {
    const rect = element.getBoundingClientRect();
    const offset = window.innerHeight / 3;
    if (rect.top < offset || rect.bottom > window.innerHeight - offset) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Fetch TTS audio + A2F blendshapes for a text string.
   * Returns a cached Promise so the same text is never fetched twice.
   */
  /** Strip smart/curly quotes that cause TTS artifacts (hushed sounds). */
  function sanitizeTTS(text) {
    return text.replace(/[\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B]/g, '');
  }

  function fetchA2F(text) {
    text = sanitizeTTS(text);
    if (prefetchCache.has(text)) return prefetchCache.get(text);

    const promise = fetch(A2F_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: selectedVoice || 'bm_george',
        speed: 1.0
      })
    }).then(function(response) {
      if (!response.ok) throw new Error('A2F API failed: ' + response.status);
      return response.json();
    });

    prefetchCache.set(text, promise);
    return promise;
  }

  /**
   * Play audio and drive avatar blendshapes from a fetchA2F result.
   */
  function playA2FData(data) {
    // Decode base64 WAV audio
    var audioBytes = Uint8Array.from(atob(data.audio), function(c) { return c.charCodeAt(0); });
    var audioBlob = new Blob([audioBytes], { type: 'audio/wav' });
    var audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);

    // Feed blendshape curves to avatar BEFORE playing
    if (window.readAloudAvatarPlayer && data.blendshapes) {
      window.readAloudAvatarPlayer.setBlendshapeData(data.blendshapes);
    }

    return new Promise(function(resolve, reject) {
      currentAudio.onended = function() {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      currentAudio.onerror = reject;
      currentAudio.play().then(function() {
        setButtonPlaying();

        window.dispatchEvent(new CustomEvent('read-aloud-audio', { detail: { audio: currentAudio } }));
        if (window.readAloudAvatarPlayer) {
          window.readAloudAvatarPlayer.play(currentAudio);
        }
      }).catch(function(err) {
        console.error('[Read Aloud] Audio play() rejected:', err);
        URL.revokeObjectURL(audioUrl);
        reject(err);
      });
    });
  }

  /**
   * Get the readable text for the element at a given index.
   * For lists, returns the specified list item's text (or first if not specified).
   */
  function getTextForIndex(idx, listItemIdx) {
    if (idx >= readableElements.length) return null;
    var el = readableElements[idx];
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      var listItems = el.querySelectorAll('li');
      if (listItemIdx !== undefined && listItemIdx < listItems.length) {
        return listItems[listItemIdx].textContent.trim() || null;
      }
      // Default to first item if no listItemIdx specified
      return listItems[0] ? listItems[0].textContent.trim() : null;
    }
    return el.textContent.trim() || null;
  }

  /**
   * Prefetch upcoming paragraphs' A2F data while current audio plays.
   * Fire-and-forget; results are stored in prefetchCache.
   * Handles list items properly by prefetching within the current list and beyond.
   */
  function prefetchNext() {
    if (!useKokoro || !window.readAloudAvatarPlayer) return;

    var prefetchCount = 0;
    var checkIndex = currentIndex;
    var checkListItemIndex = currentListItemIndex;

    while (prefetchCount < 3 && checkIndex < readableElements.length) {
      var el = readableElements[checkIndex];

      if (el.tagName === 'UL' || el.tagName === 'OL') {
        var listItems = el.querySelectorAll('li');

        // Start from next item in current list, or 0 if checking a future list
        var startFrom = (checkIndex === currentIndex) ? checkListItemIndex + 1 : 0;

        for (var liIdx = startFrom; liIdx < listItems.length && prefetchCount < 3; liIdx++) {
          var text = getTextForIndex(checkIndex, liIdx);
          if (text) {
            fetchA2F(text);
            prefetchCount++;
          }
        }
        checkListItemIndex = 0; // Reset for next element
      } else {
        // Regular element (not a list)
        if (checkIndex > currentIndex) { // Don't refetch current element
          var text = getTextForIndex(checkIndex);
          if (text) {
            fetchA2F(text);
            prefetchCount++;
          }
        }
      }

      checkIndex++;
    }
  }

  /**
   * Speak text via Audio2Face pipeline: TTS + blendshape generation in one call.
   * Uses the prefetch cache if available, eliminating latency for pre-fetched text.
   * Falls back to direct Kokoro TTS if A2F is unavailable.
   */
  async function speakWithA2F(text) {
    var data = await fetchA2F(text);
    prefetchCache.delete(text); // free memory after use
    prefetchNext(); // start fetching next paragraph while this audio plays
    return playA2FData(data);
  }

  async function speakWithKokoro(text) {
    text = sanitizeTTS(text);
    // If avatar is active, use Audio2Face pipeline for blendshape-driven lip-sync
    if (window.readAloudAvatarPlayer) {
      try {
        return await speakWithA2F(text);
      } catch (err) {
        console.warn('A2F unavailable, falling back to direct Kokoro TTS:', err.message);
      }
    }

    // Direct Kokoro TTS (no blendshapes, amplitude lip-sync fallback)
    try {
      const response = await fetch(KOKORO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'kokoro',
          input: text,
          voice: selectedVoice || 'bm_george',
          response_format: 'mp3',
          speed: 1.0,
          stream: false
        })
      });

      if (!response.ok) throw new Error('Kokoro API failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(audioUrl);

      return new Promise((resolve, reject) => {
        currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        currentAudio.onerror = reject;
        currentAudio.play().then(() => {
          setButtonPlaying();

          window.dispatchEvent(new CustomEvent('read-aloud-audio', { detail: { audio: currentAudio } }));
          if (window.readAloudAvatarPlayer) {
            window.readAloudAvatarPlayer.play(currentAudio);
          }
        }).catch((err) => {
          console.error('[Read Aloud] Audio play() rejected:', err);
          URL.revokeObjectURL(audioUrl);
          reject(err);
        });
      });
    } catch (error) {
      console.error('Kokoro TTS error:', error);
      throw error;
    }
  }

  function speakWithBrowser(text) {
    text = sanitizeTTS(text);
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (selectedVoice && !useKokoro) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = setButtonPlaying;
      utterance.onend = resolve;
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }

  async function speakNext() {
    if (!isPlaying || currentIndex >= readableElements.length) {
      stopReading();
      return;
    }

    clearHighlights();
    const element = readableElements[currentIndex];
    element.classList.add('reading-active');
    scrollToElement(element);

    // Handle lists (ul/ol) by reading each list item individually
    if (element.tagName === 'UL' || element.tagName === 'OL') {
      const listItems = Array.from(element.querySelectorAll('li'));

      try {
        for (let liIdx = 0; liIdx < listItems.length; liIdx++) {
          if (!isPlaying) break; // Stop if playback was interrupted

          currentListItemIndex = liIdx; // Track position for prefetch
          const li = listItems[liIdx];
          const text = li.textContent.trim();
          if (!text) continue;

          if (useKokoro) {
            await speakWithKokoro(text);
          } else {
            await speakWithBrowser(text);
          }
        }
        currentListItemIndex = 0; // Reset for next element
        currentIndex++;
        speakNext();
      } catch (error) {
        console.error('Speech error:', error);
        stopReading();
      }
      return;
    }

    // Handle non-list elements as before
    const text = element.textContent.trim();
    if (!text) {
      currentIndex++;
      speakNext();
      return;
    }

    try {
      if (useKokoro) {
        await speakWithKokoro(text);
      } else {
        await speakWithBrowser(text);
      }
      currentIndex++;
      speakNext();
    } catch (error) {
      console.error('Speech error:', error);
      stopReading();
    }
  }

  function stopReading() {
    window.speechSynthesis.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    prefetchCache.clear();
    clearHighlights();
    button.classList.remove('playing');
    button.classList.remove('loading');
    buttonText.textContent = 'Read Aloud';
    isPlaying = false;
    currentIndex = 0;
    currentListItemIndex = 0;

    // Avatar integration: notify listeners that reading has stopped
    window.dispatchEvent(new CustomEvent('read-aloud-stop'));
    if (window.readAloudAvatarPlayer) {
      window.readAloudAvatarPlayer.setAhemPose(false);
      window.readAloudAvatarPlayer.stop();
    }
  }

  button.addEventListener('click', function() {
    if (isPlaying) {
      stopReading();
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    // Get all readable elements
    const allElements = Array.from(article.querySelectorAll(elementSelector));

    readableElements = allElements.filter(el => {
      return !el.closest(exclusionSelector);
    });

    if (readableElements.length === 0) {
      alert('No readable content found.');
      return;
    }

    currentIndex = 0;
    currentListItemIndex = 0;
    isPlaying = true;
    setButtonLoading();
    voiceSelector.classList.remove('show');
    settingsBtn.classList.remove('active');
    speakNext();
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', function() {
    if (isPlaying) {
      stopReading();
    }
  });
})();
