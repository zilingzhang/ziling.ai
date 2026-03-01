/* ═══════════════════════════════════════════════════════════════
   Slide boilerplate injector — auto-numbers, adds footer/logo/illust
   ═══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.slide').forEach((slide, i) => {
  // Illustration
  const img = slide.dataset.img;
  if (img) {
    const div = document.createElement('div');
    div.className = 'illust';
    div.innerHTML = `<img src="${img}" alt="${slide.dataset.alt || ''}">`;
    slide.appendChild(div);
  }
  // Slide number (skip first slide)
  if (!slide.hasAttribute('data-no-num') && i > 0) {
    const num = document.createElement('div');
    num.className = 'slide-num';
    num.textContent = i + 1;
    slide.appendChild(num);
  }
  // Logo pill (personal domain — no corporate branding)
  // Intentionally left empty for personal publishing
});

/* ═══════════════════════════════════════════════════════════════
   Slide Navigation — liquid glass pill with thumbnail panel
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  const TOTAL = slides.length;
  if (TOTAL === 0) return;

  /* ── Assign hash-addressable IDs from slide titles ──────────── */
  const usedSlugs = {};
  slides.forEach((s, i) => {
    if (s.id) { usedSlugs[s.id] = true; return; }
    const titleEl = s.querySelector('.content-title')
      || s.querySelector('.glass-panel--divider-title')
      || s.querySelector('.glass-panel--title');
    let slug = titleEl
      ? titleEl.textContent.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      : 'slide-' + (i + 1);
    if (usedSlugs[slug]) { slug += '-' + (i + 1); }
    usedSlugs[slug] = true;
    s.id = slug;
  });

  // Scroll to slide matching URL hash on load (IDs just assigned)
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('slide')) {
      // Defer to let images/layout settle, then scroll
      setTimeout(() => fastScrollTo(target, 120), 50);
    }
  }

  /* ── Detect act boundaries from slide--desk dividers ────────── */
  const actStarts = [];
  slides.forEach((s, i) => {
    if (!s.classList.contains('slide--desk')) return;
    const el = s.querySelector('.glass-panel--divider-title') ||
      s.querySelector('.glass-panel--title');
    const label = el ? el.textContent.trim() : 'Slides';
    actStarts.push({ label, start: i });
  });
  if (actStarts.length === 0) actStarts.push({ label: 'Slides', start: 0 });

  /* ── Build collapsed pill ───────────────────────────────────── */
  const nav = document.createElement('nav');
  nav.id = 'slide-nav';
  nav.className = 'slide-nav-pill';
  nav.setAttribute('aria-label', 'Slide navigation');

  const track = document.createElement('div');
  track.className = 'slide-nav-pill__track';
  actStarts.forEach(() => {
    const dot = document.createElement('div');
    dot.className = 'slide-nav-pill__dot';
    track.appendChild(dot);
  });
  const indicator = document.createElement('div');
  indicator.className = 'slide-nav-pill__indicator';
  track.appendChild(indicator);
  nav.appendChild(track);

  /* ── Build expanded panel with thumbnails ───────────────────── */
  const panel = document.createElement('div');
  panel.className = 'slide-nav-panel';
  const scroll = document.createElement('div');
  scroll.className = 'slide-nav-panel__scroll';

  const thumbButtons = [];

  actStarts.forEach((act, actIdx) => {
    const group = document.createElement('div');
    group.className = 'slide-nav-group';

    const label = document.createElement('div');
    label.className = 'slide-nav-group__label';
    label.textContent = act.label;
    group.appendChild(label);

    const thumbs = document.createElement('div');
    thumbs.className = 'slide-nav-group__thumbs';

    const nextStart = actIdx < actStarts.length - 1 ? actStarts[actIdx + 1].start : TOTAL;

    for (let i = act.start; i < nextStart; i++) {
      const btn = document.createElement('button');
      btn.className = 'slide-nav-thumb';
      btn.dataset.index = i;

      const preview = document.createElement('div');
      preview.className = 'slide-nav-thumb__preview';

      // Extract the primary image from the slide for thumbnail
      const deskImg = slides[i].querySelector('.desk-sketch img');
      const illustImg = slides[i].querySelector('.illust img');
      const anyImg = slides[i].querySelector('img');
      const thumbSrc = slides[i].dataset.img
        || (deskImg ? deskImg.src : null)
        || (illustImg ? illustImg.src : null)
        || (anyImg ? anyImg.src : null);
      if (thumbSrc) {
        preview.style.backgroundImage = 'url(' + thumbSrc + ')';
      } else {
        // Chat/text slides: tinted placeholder
        preview.classList.add('slide-nav-thumb__preview--text');
      }

      // Slide title overlay
      const titleEl = slides[i].querySelector('.content-title')
        || slides[i].querySelector('.glass-panel--divider-title')
        || slides[i].querySelector('.glass-panel--title');
      const titleText = titleEl ? titleEl.textContent.trim() : '';

      const caption = document.createElement('span');
      caption.className = 'slide-nav-thumb__caption';
      caption.textContent = (i + 1) + (titleText ? '. ' + titleText : '');
      preview.appendChild(caption);

      btn.appendChild(preview);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        fastScrollTo(slides[i]);
        closeNav();
      });

      thumbs.appendChild(btn);
      thumbButtons.push(btn);
    }

    group.appendChild(thumbs);
    scroll.appendChild(group);
  });

  panel.appendChild(scroll);
  nav.appendChild(panel);
  document.body.appendChild(nav);

  /* ── Fast scroll helper ───────────────────────────────────── */
  function fastScrollTo(el, duration) {
    duration = duration || 180;
    const start = window.scrollY;
    const rect = el.getBoundingClientRect();
    const end = start + rect.top + rect.height / 2 - window.innerHeight / 2;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      window.scrollTo(0, start + (end - start) * ease);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ── Toggle expand / collapse ──────────────────────────────── */
  let isExpanded = false;
  let autoCloseTimeout;

  function openNav() {
    isExpanded = true;
    nav.classList.add('is-expanded');
    setTimeout(() => {
      const active = nav.querySelector('.slide-nav-thumb.is-active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 450);
  }

  function closeNav() {
    isExpanded = false;
    nav.classList.remove('is-expanded');
    clearTimeout(autoCloseTimeout);
  }

  // Click pill to toggle (but not if clicking a thumbnail)
  nav.addEventListener('click', (e) => {
    if (e.target.closest('.slide-nav-thumb')) return;
    isExpanded ? closeNav() : openNav();
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (isExpanded && !nav.contains(e.target)) closeNav();
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isExpanded) closeNav();
  });

  // Auto-hide when mouse leaves the nav
  nav.addEventListener('mouseleave', () => {
    if (isExpanded) {
      autoCloseTimeout = setTimeout(closeNav, 600);
    }
  });
  nav.addEventListener('mouseenter', () => {
    clearTimeout(autoCloseTimeout);
  });

  /* ── Track current slide via IntersectionObserver ───────────── */
  let currentIndex = 0;

  function updateActiveThumb() {
    thumbButtons.forEach(b => b.classList.remove('is-active'));
    const active = thumbButtons.find(b => Number(b.dataset.index) === currentIndex);
    if (active) active.classList.add('is-active');
  }

  function updateIndicator() {
    const pct = TOTAL > 1 ? (currentIndex / (TOTAL - 1)) * 100 : 0;
    indicator.style.top = pct + '%';
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        const idx = slides.indexOf(entry.target);
        if (idx !== -1 && idx !== currentIndex) {
          currentIndex = idx;
          updateActiveThumb();
          updateIndicator();
          // Update URL hash without scrolling
          if (slides[idx].id) {
            history.replaceState(null, '', '#' + slides[idx].id);
          }
        }
      }
    });
  }, { threshold: 0.5 });

  slides.forEach(s => observer.observe(s));

  // Initialize
  updateActiveThumb();
  updateIndicator();

})();

/* ═══════════════════════════════════════════════════════════════
   Fullscreen toggle — liquid glass pill (top-right, before DH/Narrator)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var btn = document.createElement('button');
  btn.className = 'fullscreen-toggle';
  btn.title = 'Toggle fullscreen';

  var enterIcon =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/>' +
    '<path d="M21 8V5a2 2 0 0 0-2-2h-3"/>' +
    '<path d="M3 16v3a2 2 0 0 0 2 2h3"/>' +
    '<path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

  var exitIcon =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 3v3a2 2 0 0 1-2 2H3"/>' +
    '<path d="M21 8h-3a2 2 0 0 1-2-2V3"/>' +
    '<path d="M3 16h3a2 2 0 0 1 2 2v3"/>' +
    '<path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

  btn.innerHTML = enterIcon;

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function updateIcon() {
    btn.innerHTML = isFullscreen() ? exitIcon : enterIcon;
    btn.classList.toggle('active', isFullscreen());
  }

  btn.addEventListener('click', function () {
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    }
  });

  document.addEventListener('fullscreenchange', updateIcon);
  document.addEventListener('webkitfullscreenchange', updateIcon);

  // Insert as first child of .read-aloud-controls
  var controls = document.querySelector('.read-aloud-controls');
  if (controls) {
    controls.insertBefore(btn, controls.firstChild);
  } else {
    document.body.appendChild(btn);
  }
})();
