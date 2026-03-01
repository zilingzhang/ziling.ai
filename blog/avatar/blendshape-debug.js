/**
 * Blendshape Debug Visualiser
 *
 * Renders all 52 ARKit blendshape weights in a compact 3-column grid,
 * grouped by facial region. Each cell shows a color-coded mini bar and
 * the current weight value.
 *
 * All cells are always visible. Active weights are highlighted; inactive
 * ones are dimmed.
 *
 * Usage: include this script (non-module) before blendshape-debug-preview.js.
 */
(function () {
  // --- ARKit 52 blendshapes by category ------------------------------------
  var CATEGORIES = [
    { label: 'Eye', color: '#3498db', names: [
      'eyeBlinkLeft', 'eyeBlinkRight',
      'eyeLookDownLeft', 'eyeLookDownRight',
      'eyeLookInLeft', 'eyeLookInRight',
      'eyeLookOutLeft', 'eyeLookOutRight',
      'eyeLookUpLeft', 'eyeLookUpRight',
      'eyeSquintLeft', 'eyeSquintRight',
      'eyeWideLeft', 'eyeWideRight'
    ]},
    { label: 'Jaw', color: '#e74c3c', names: [
      'jawForward', 'jawLeft', 'jawRight', 'jawOpen'
    ]},
    { label: 'Mouth', color: '#e67e22', names: [
      'mouthClose', 'mouthFunnel', 'mouthPucker',
      'mouthLeft', 'mouthRight',
      'mouthSmileLeft', 'mouthSmileRight',
      'mouthFrownLeft', 'mouthFrownRight',
      'mouthDimpleLeft', 'mouthDimpleRight',
      'mouthStretchLeft', 'mouthStretchRight',
      'mouthRollLower', 'mouthRollUpper',
      'mouthShrugLower', 'mouthShrugUpper',
      'mouthPressLeft', 'mouthPressRight',
      'mouthLowerDownLeft', 'mouthLowerDownRight',
      'mouthUpperUpLeft', 'mouthUpperUpRight'
    ]},
    { label: 'Brow', color: '#2ecc71', names: [
      'browDownLeft', 'browDownRight', 'browInnerUp',
      'browOuterUpLeft', 'browOuterUpRight'
    ]},
    { label: 'Cheek', color: '#9b59b6', names: [
      'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight'
    ]},
    { label: 'Nose', color: '#1abc9c', names: [
      'noseSneerLeft', 'noseSneerRight'
    ]},
    { label: 'Tongue', color: '#f39c12', names: [
      'tongueOut'
    ]}
  ];

  // Short display names: strip prefix, abbreviate L/R
  function shortName(name) {
    var s = name.replace(/^(eye|jaw|mouth|brow|cheek|nose|tongue)/, '');
    s = s.charAt(0).toLowerCase() + s.slice(1);
    s = s.replace(/Left$/, 'L').replace(/Right$/, 'R');
    return s || name;
  }

  // --- DOM setup ----------------------------------------------------------

  var panel = document.createElement('div');
  panel.className = 'bs-debug-panel';
  panel.id = 'bsDebugPanel';

  // Header
  var header = document.createElement('div');
  header.className = 'bs-debug-header';
  var title = document.createElement('span');
  title.className = 'bs-debug-title';
  title.textContent = 'Digital Human';
  var counter = document.createElement('span');
  counter.className = 'bs-debug-fps';
  counter.id = 'bsDebugFps';
  counter.textContent = '0/52';
  // Metrics toggle button (chevron)
  var metricsBtn = document.createElement('button');
  metricsBtn.className = 'bs-metrics-toggle';
  metricsBtn.title = 'Show blendshape metrics';
  metricsBtn.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="6 9 12 15 18 9"/></svg>';
  var a2fDot = document.createElement('span');
  a2fDot.className = 'a2f-status';
  a2fDot.id = 'a2fStatusDot';
  a2fDot.title = 'A2F: checking...';
  var a2fLabel = document.createElement('span');
  a2fLabel.className = 'a2f-status-label';
  a2fLabel.id = 'a2fStatusLabel';
  a2fLabel.textContent = '';
  header.appendChild(title);
  header.appendChild(a2fDot);
  header.appendChild(a2fLabel);
  header.appendChild(counter);
  header.appendChild(metricsBtn);
  panel.appendChild(header);

  // Rows container (preview canvas inserted between header and rows by module script)
  var rowsContainer = document.createElement('div');
  rowsContainer.id = 'bsDebugRows';
  rowsContainer.className = 'bs-debug-rows-collapsed';
  panel.appendChild(rowsContainer);

  // Metrics toggle handler
  metricsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var expanded = rowsContainer.classList.toggle('bs-debug-rows-collapsed');
    metricsBtn.classList.toggle('active', !expanded);
    panel.classList.toggle('bs-debug-expanded', !expanded);
  });

  // --- Build all 52 cells, grouped by category in a 3-col grid ------------
  var cellMap = {}; // name -> { bar, val, cell }

  for (var c = 0; c < CATEGORIES.length; c++) {
    var cat = CATEGORIES[c];

    // Category label spanning full width
    var catLabel = document.createElement('div');
    catLabel.className = 'bs-cat-label';
    catLabel.innerHTML = '<span class="bs-cat-dot" style="background:' + cat.color + '"></span>' + cat.label;
    rowsContainer.appendChild(catLabel);

    // Grid for this category
    var grid = document.createElement('div');
    grid.className = 'bs-grid';
    rowsContainer.appendChild(grid);

    for (var i = 0; i < cat.names.length; i++) {
      var name = cat.names[i];

      var cell = document.createElement('div');
      cell.className = 'bs-cell';

      var label = document.createElement('div');
      label.className = 'bs-cell-label';
      label.textContent = shortName(name);

      var barWrap = document.createElement('div');
      barWrap.className = 'bs-cell-track';
      var bar = document.createElement('div');
      bar.className = 'bs-cell-bar';
      bar.style.background = cat.color;
      barWrap.appendChild(bar);

      var val = document.createElement('div');
      val.className = 'bs-cell-val';
      val.textContent = '.00';

      cell.appendChild(label);
      cell.appendChild(barWrap);
      cell.appendChild(val);
      grid.appendChild(cell);

      cellMap[name] = { bar: bar, val: val, cell: cell };
    }
  }

  // --- Pill wrapper: pill-to-panel expand layout ---
  var wrapper = document.createElement('div');
  wrapper.className = 'pill-wrapper pill-wrapper--dh';
  wrapper.id = 'dhPillWrapper';

  // Toggle pill icon
  var toggleBtn = document.createElement('button');
  toggleBtn.className = 'bs-debug-toggle';
  toggleBtn.title = 'Toggle digital human';
  toggleBtn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="8" r="5"/>' +
    '<path d="M20 21a8 8 0 1 0-16 0"/></svg>';

  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var active = wrapper.classList.toggle('expanded');
    panel.classList.toggle('visible', active);
    toggleBtn.classList.toggle('active', active);
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

  // --- Render loop --------------------------------------------------------
  var lastFrame = 0;
  var INTERVAL = 33;
  var THRESHOLD = 0.005;

  function update(ts) {
    requestAnimationFrame(update);
    if (ts - lastFrame < INTERVAL) return;
    lastFrame = ts;
    if (!panel.classList.contains('visible')) return;

    var player = window.readAloudAvatarPlayer;
    if (!player || typeof player.getWeights !== 'function') return;

    var weights = player.getWeights();
    var activeCount = 0;

    for (var name in cellMap) {
      if (!cellMap.hasOwnProperty(name)) continue;
      var entry = cellMap[name];
      var w = weights[name] || 0;

      entry.bar.style.width = Math.min(100, w * 100) + '%';
      entry.val.textContent = w > 0.005 ? w.toFixed(2) : '.00';

      if (w > THRESHOLD) {
        entry.cell.classList.add('bs-cell-active');
        activeCount++;
      } else {
        entry.cell.classList.remove('bs-cell-active');
      }
    }

    counter.textContent = activeCount + '/52';
  }

  requestAnimationFrame(update);
})();
