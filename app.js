import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const SCREENS = Object.freeze({
  INTRO: 'INTRO',
  STAR_SELECT: 'STAR_SELECT',
  TRANSIT_VIEW: 'TRANSIT_VIEW',
  AI_VERDICT: 'AI_VERDICT',
  DRAW_MODE: 'DRAW_MODE',
});

const SCREEN_ROUTES = Object.freeze({
  INTRO: [SCREENS.STAR_SELECT],
  STAR_SELECT: [SCREENS.INTRO, SCREENS.TRANSIT_VIEW],
  TRANSIT_VIEW: [SCREENS.STAR_SELECT, SCREENS.AI_VERDICT],
  AI_VERDICT: [SCREENS.TRANSIT_VIEW, SCREENS.DRAW_MODE],
  DRAW_MODE: [SCREENS.AI_VERDICT],
});

const FEATURE_ORDER = [
  'koi_period',
  'koi_depth',
  'koi_duration',
  'koi_prad',
  'koi_teq',
  'koi_steff',
  'koi_srad',
];

const CLASS_ORDER = ['CANDIDATE', 'CONFIRMED', 'FALSE POSITIVE'];

const LIVE_QUERY =
  'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=' +
  'select+top+120+kepid,kepoi_name,koi_disposition,koi_period,koi_depth,koi_duration,koi_prad,koi_teq,koi_steff,koi_srad,koi_score' +
  '+from+cumulative+where+koi_disposition+is+not+null+order+by+koi_score+desc&format=json';

const DEFAULT_METADATA = {
  feature_order: FEATURE_ORDER,
  class_order: CLASS_ORDER,
  scaler: {
    means: [35.0, 850.0, 5.5, 2.8, 700.0, 5600.0, 1.0],
    stds: [45.0, 900.0, 3.4, 2.0, 350.0, 800.0, 0.5],
  },
};

const state = {
  activeScreen: SCREENS.INTRO,
  koiRecords: [],
  selectedKoi: null,
  dataSource: 'loading',
  modelStatus: 'idle',
  model: null,
  metadata: DEFAULT_METADATA,
  inference: null,
  timeline: { phase: 0, speed: 0.16 },
  draw: {
    isDrawing: false,
    points: [],
  },
};

const dom = {
  statusPill: document.getElementById('status-pill'),
  launchButton: document.getElementById('btn-launch'),
  starList: document.getElementById('star-list'),
  searchInput: document.getElementById('search-koi'),
  spectralFilter: document.getElementById('filter-spectral'),
  selectedMeta: document.getElementById('selected-meta'),
  runAiButton: document.getElementById('btn-run-ai'),
  openDrawButton: document.getElementById('btn-open-draw'),
  verdictLabel: document.getElementById('verdict-label'),
  verdictDetail: document.getElementById('verdict-detail'),
  bars: {
    candidate: document.getElementById('bar-candidate'),
    confirmed: document.getElementById('bar-confirmed'),
    falsePositive: document.getElementById('bar-false'),
  },
  percentages: {
    candidate: document.getElementById('txt-candidate'),
    confirmed: document.getElementById('txt-confirmed'),
    falsePositive: document.getElementById('txt-false'),
  },
  drawCanvas: document.getElementById('draw-canvas'),
  clearCanvas: document.getElementById('btn-clear-canvas'),
  predictDrawing: document.getElementById('btn-predict-drawing'),
  drawPreview: document.getElementById('draw-feature-preview'),
  sliders: {
    prad: document.getElementById('slider-prad'),
    teq: document.getElementById('slider-teq'),
    steff: document.getElementById('slider-steff'),
    srad: document.getElementById('slider-srad'),
  },
  screens: {
    [SCREENS.INTRO]: document.getElementById('screen-intro'),
    [SCREENS.STAR_SELECT]: document.getElementById('screen-star-select'),
    [SCREENS.TRANSIT_VIEW]: document.getElementById('screen-transit-view'),
    [SCREENS.AI_VERDICT]: document.getElementById('screen-ai-verdict'),
    [SCREENS.DRAW_MODE]: document.getElementById('screen-draw-mode'),
  },
};

let threeRuntime = null;
let chartRuntime = null;
let drawCtx = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSpectralClass(temperature) {
  const t = safeNumber(temperature, 5600);
  if (t > 30000) return 'O';
  if (t >= 10000) return 'B';
  if (t >= 7500) return 'A';
  if (t >= 6000) return 'F';
  if (t >= 5200) return 'G';
  if (t >= 3700) return 'K';
  return 'M';
}

function getSpectralColor(temperature) {
  const spectralClass = getSpectralClass(temperature);
  switch (spectralClass) {
    case 'O':
      return '#9bb0ff';
    case 'B':
      return '#aabfff';
    case 'A':
      return '#cad7ff';
    case 'F':
      return '#f8f7ff';
    case 'G':
      return '#fff4e8';
    case 'K':
      return '#ffd2a1';
    default:
      return '#ffcc6f';
  }
}

function normalizeKoi(raw) {
  const normalized = {
    kepid: safeNumber(raw.kepid, -1),
    kepoi_name: String(raw.kepoi_name || 'Unknown KOI'),
    koi_disposition: String(raw.koi_disposition || 'CANDIDATE').toUpperCase(),
    koi_period: clamp(safeNumber(raw.koi_period, 20), 0.2, 1200),
    koi_depth: clamp(safeNumber(raw.koi_depth, 600), 20, 100000),
    koi_duration: clamp(safeNumber(raw.koi_duration, 5), 0.3, 30),
    koi_prad: clamp(safeNumber(raw.koi_prad, 2), 0.2, 50),
    koi_teq: clamp(safeNumber(raw.koi_teq, 650), 120, 4000),
    koi_steff: clamp(safeNumber(raw.koi_steff, 5600), 2500, 45000),
    koi_srad: clamp(safeNumber(raw.koi_srad, 1), 0.1, 20),
    koi_score: clamp(safeNumber(raw.koi_score, 0.5), 0, 1),
  };
  normalized.spectralClass = getSpectralClass(normalized.koi_steff);
  normalized.starColor = getSpectralColor(normalized.koi_steff);
  return normalized;
}

function setStatusPill() {
  const text = [
    `Screen: ${state.activeScreen.replace('_', ' ')}`,
    `Data: ${state.dataSource}`,
    `Model: ${state.modelStatus}`,
  ].join(' | ');
  dom.statusPill.textContent = text;
}

function transitionTo(nextScreen) {
  if (state.activeScreen === nextScreen) return;
  const allowed = SCREEN_ROUTES[state.activeScreen] || [];
  if (!allowed.includes(nextScreen)) return;

  if (
    [SCREENS.TRANSIT_VIEW, SCREENS.AI_VERDICT, SCREENS.DRAW_MODE].includes(nextScreen) &&
    !state.selectedKoi
  ) {
    dom.verdictDetail.textContent = 'Pick a KOI from Star Select first.';
    return;
  }

  state.activeScreen = nextScreen;
  renderScreens();

  if (nextScreen === SCREENS.TRANSIT_VIEW) {
    syncTransitView();
  }

  if (nextScreen === SCREENS.AI_VERDICT && state.selectedKoi && !state.inference) {
    runPredictionFromSelected().catch((error) => {
      dom.verdictDetail.textContent = `Prediction failed: ${error.message}`;
    });
  }
}

function renderScreens() {
  Object.entries(dom.screens).forEach(([screenKey, node]) => {
    node.classList.toggle('active', screenKey === state.activeScreen);
  });
  setStatusPill();
}

function scoredLabel(score) {
  if (score >= 0.85) return 'A';
  if (score >= 0.7) return 'B';
  if (score >= 0.5) return 'C';
  return 'D';
}

function cardTemplate(koi) {
  return `
    <article class="star-card" data-koi="${koi.kepoi_name}">
      <h3 class="star-title">
        <span class="dot" style="background:${koi.starColor}"></span>
        ${koi.kepoi_name}
      </h3>
      <p class="caption">${koi.koi_disposition} | Spectral ${koi.spectralClass} | Score ${koi.koi_score.toFixed(2)} (${scoredLabel(koi.koi_score)})</p>
      <div class="btn-row">
        <button class="secondary" data-select-koi="${koi.kepoi_name}">Inspect Transit</button>
      </div>
    </article>
  `;
}

function renderStarList() {
  const search = dom.searchInput.value.trim().toLowerCase();
  const spectral = dom.spectralFilter.value;

  const rows = state.koiRecords.filter((row) => {
    const byName = row.kepoi_name.toLowerCase().includes(search);
    const bySpectral = spectral === 'ALL' ? true : row.spectralClass === spectral;
    return byName && bySpectral;
  });

  if (rows.length === 0) {
    dom.starList.innerHTML = '<p class="caption">No KOIs matched your filters.</p>';
    return;
  }

  dom.starList.innerHTML = rows
    .slice(0, 80)
    .map((koi) => cardTemplate(koi))
    .join('');
}

function renderSelectedMeta() {
  if (!state.selectedKoi) {
    dom.selectedMeta.innerHTML = '';
    return;
  }

  const s = state.selectedKoi;
  dom.selectedMeta.innerHTML = [
    `<div><span>KOI</span><strong>${s.kepoi_name}</strong></div>`,
    `<div><span>Disposition</span><strong>${s.koi_disposition}</strong></div>`,
    `<div><span>Period (days)</span><strong>${s.koi_period.toFixed(3)}</strong></div>`,
    `<div><span>Depth (ppm)</span><strong>${s.koi_depth.toFixed(1)}</strong></div>`,
    `<div><span>Duration (h)</span><strong>${s.koi_duration.toFixed(2)}</strong></div>`,
    `<div><span>Stellar Temp (K)</span><strong>${Math.round(s.koi_steff)}</strong></div>`,
    `<div><span>Planet Radius (Re)</span><strong>${s.koi_prad.toFixed(2)}</strong></div>`,
    `<div><span>Stellar Radius (Rsolar)</span><strong>${s.koi_srad.toFixed(2)}</strong></div>`,
  ].join('');
}

async function loadKoiData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(LIVE_QUERY, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`TAP query failed (${response.status})`);
    }
    const payload = await response.json();
    const rows = payload.map(normalizeKoi).filter((row) => row.koi_period > 0 && row.koi_depth > 0);

    if (rows.length === 0) {
      throw new Error('No rows returned from live query');
    }

    state.koiRecords = rows;
    state.dataSource = 'live-api';
    localStorage.setItem('stellar-fingerprints-koi-cache', JSON.stringify(rows));
    localStorage.setItem('stellar-fingerprints-koi-cache-ts', String(Date.now()));
  } catch (liveError) {
    const cache = localStorage.getItem('stellar-fingerprints-koi-cache');
    if (cache) {
      const parsed = JSON.parse(cache);
      state.koiRecords = parsed.map(normalizeKoi);
      state.dataSource = 'cached';
      return;
    }

    const fallbackResponse = await fetch('./data/koi_sample.json');
    const fallbackPayload = await fallbackResponse.json();
    state.koiRecords = fallbackPayload.map(normalizeKoi);
    state.dataSource = 'fallback';
    console.warn('Live API unavailable. Using fallback dataset.', liveError);
  } finally {
    clearTimeout(timeout);
  }
}

function generateTransitCurve(koi, points = 280) {
  const depthFraction = clamp(koi.koi_depth / 1_000_000, 0.00002, 0.09);
  const durationFraction = clamp(koi.koi_duration / (koi.koi_period * 24), 0.004, 0.19);
  const sigma = clamp(durationFraction / 2.8, 0.006, 0.06);

  const rows = [];
  for (let i = 0; i < points; i += 1) {
    const phase = i / (points - 1);
    const distance = phase - 0.5;
    const dip = depthFraction * Math.exp(-(distance * distance) / (2 * sigma * sigma));
    const microNoise = Math.sin(phase * Math.PI * 18) * depthFraction * 0.02;
    rows.push({ phase, flux: 1 - dip + microNoise });
  }
  return rows;
}

function initChart() {
  const container = document.getElementById('lightcurve-chart');
  const width = container.clientWidth || 480;
  const height = 220;

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const margin = { top: 12, right: 16, bottom: 28, left: 44 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0.998, 1.001]).range([innerHeight, 0]);

  const xAxis = root.append('g').attr('transform', `translate(0,${innerHeight})`);
  const yAxis = root.append('g');

  const line = root
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', '#7ab8ff')
    .attr('stroke-width', 2);

  const marker = root.append('circle').attr('r', 4).attr('fill', '#ffd7a7');

  root
    .append('text')
    .attr('x', innerWidth - 6)
    .attr('y', innerHeight - 4)
    .attr('fill', '#b7c8ef')
    .attr('font-size', 12)
    .attr('text-anchor', 'end')
    .text('Orbital phase');

  chartRuntime = {
    root,
    x,
    y,
    xAxis,
    yAxis,
    line,
    marker,
    innerHeight,
    innerWidth,
  };
}

function renderTransitCurve(koi) {
  if (!chartRuntime) {
    initChart();
  }

  const rows = generateTransitCurve(koi);
  const minFlux = d3.min(rows, (d) => d.flux);
  const maxFlux = d3.max(rows, (d) => d.flux);

  chartRuntime.y.domain([minFlux * 0.9998, maxFlux * 1.0002]);

  chartRuntime.xAxis.call(d3.axisBottom(chartRuntime.x).ticks(6));
  chartRuntime.yAxis.call(d3.axisLeft(chartRuntime.y).ticks(5));

  const lineGenerator = d3
    .line()
    .x((d) => chartRuntime.x(d.phase))
    .y((d) => chartRuntime.y(d.flux));

  chartRuntime.line.datum(rows).attr('d', lineGenerator);

  const activePoint = rows[Math.floor(state.timeline.phase * (rows.length - 1))] || rows[0];
  chartRuntime.marker
    .attr('cx', chartRuntime.x(activePoint.phase))
    .attr('cy', chartRuntime.y(activePoint.flux));
}

function initThree() {
  if (threeRuntime) return;

  const container = document.getElementById('three-root');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0.2, 6.8);

  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0xffffff, 2.4, 24);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const starGeometry = new THREE.SphereGeometry(1.7, 90, 90);
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color('#fff4e8') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying float vWave;

      void main() {
        vNormal = normal;
        float wave = sin(position.x * 6.0 + uTime * 2.4) * 0.05;
        wave += sin(position.y * 7.0 - uTime * 1.8) * 0.04;
        vWave = wave;
        vec3 newPosition = position + normal * wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      varying vec3 vNormal;
      varying float vWave;

      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
        vec3 color = uBaseColor;
        color += vec3(0.09, 0.05, 0.02) * vWave * 2.0;
        color += vec3(0.25, 0.18, 0.1) * fresnel;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const starMesh = new THREE.Mesh(starGeometry, starMaterial);
  scene.add(starMesh);

  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(2.15, 64, 64),
    new THREE.MeshBasicMaterial({
      color: '#ffd7a7',
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(corona);

  const orbitGroup = new THREE.Group();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 28),
    new THREE.MeshStandardMaterial({ color: '#79bfff', roughness: 0.45, metalness: 0.15 }),
  );
  planet.position.set(2.8, 0, 0);
  orbitGroup.add(planet);
  scene.add(orbitGroup);

  const starfieldGeo = new THREE.BufferGeometry();
  const starCount = 420;
  const coords = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    coords[i * 3] = (Math.random() - 0.5) * 30;
    coords[i * 3 + 1] = (Math.random() - 0.5) * 16;
    coords[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  starfieldGeo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const starfield = new THREE.Points(
    starfieldGeo,
    new THREE.PointsMaterial({ size: 0.03, color: '#cddcff' }),
  );
  scene.add(starfield);

  const clock = new THREE.Clock();

  function tick() {
    const elapsed = clock.getElapsedTime();
    state.timeline.phase = (state.timeline.phase + state.timeline.speed * 0.002) % 1;

    starMaterial.uniforms.uTime.value = elapsed;
    starMesh.rotation.y += 0.0024;
    corona.rotation.y -= 0.0018;
    orbitGroup.rotation.y = state.timeline.phase * Math.PI * 2;

    if (state.selectedKoi && chartRuntime) {
      renderTransitCurve(state.selectedKoi);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();

  function onResize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', onResize);

  threeRuntime = {
    renderer,
    scene,
    camera,
    starMaterial,
    corona,
    planet,
    starMesh,
    pointLight,
  };
}

function updateThreeFromKoi(koi) {
  if (!threeRuntime || !koi) return;

  const starColor = new THREE.Color(koi.starColor);
  threeRuntime.starMaterial.uniforms.uBaseColor.value = starColor;
  threeRuntime.corona.material.color = starColor;
  threeRuntime.pointLight.color = starColor;

  const radiusScale = clamp(0.8 + koi.koi_srad * 0.5, 0.6, 2.5);
  threeRuntime.starMesh.scale.setScalar(radiusScale);

  const planetScale = clamp(0.06 + koi.koi_prad * 0.03, 0.08, 0.45);
  threeRuntime.planet.scale.setScalar(planetScale);

  const heat = clamp((koi.koi_teq - 120) / (2200 - 120), 0, 1);
  const planetColor = new THREE.Color().setHSL(0.58 - heat * 0.48, 0.8, 0.58);
  threeRuntime.planet.material.color = planetColor;
}

function syncTransitView() {
  if (!state.selectedKoi) return;
  renderSelectedMeta();
  initThree();
  updateThreeFromKoi(state.selectedKoi);
  renderTransitCurve(state.selectedKoi);
}

function applyScaling(features, metadata) {
  const means = metadata?.scaler?.means;
  const stds = metadata?.scaler?.stds;
  if (!Array.isArray(means) || !Array.isArray(stds) || means.length !== features.length) {
    return features;
  }

  return features.map((value, index) => {
    const std = stds[index] || 1;
    if (std === 0) return value;
    return (value - means[index]) / std;
  });
}

async function ensureModelLoaded() {
  if (state.model || state.modelStatus === 'unavailable') return;

  state.modelStatus = 'loading';
  setStatusPill();

  try {
    const metadataResponse = await fetch('./model/model-metadata.json');
    if (metadataResponse.ok) {
      state.metadata = await metadataResponse.json();
    }

    const model = await tf.loadLayersModel('./model/model.json');
    state.model = model;
    state.modelStatus = 'ready';
  } catch (error) {
    state.modelStatus = 'unavailable';
    console.warn('Model load skipped. Using heuristic fallback.', error);
  } finally {
    setStatusPill();
  }
}

function heuristicProbabilities(features) {
  const [period, depth, duration] = features;

  const depthNorm = clamp(depth / 3000, 0, 1);
  const durationNorm = clamp(duration / 12, 0, 1);
  const periodNorm = clamp(period / 100, 0, 1);

  let candidate = 0.28 + durationNorm * 0.16 + periodNorm * 0.1;
  let confirmed = 0.22 + (1 - depthNorm) * 0.23 + durationNorm * 0.18;
  let falsePositive = 0.22 + depthNorm * 0.35;

  const total = candidate + confirmed + falsePositive;
  candidate /= total;
  confirmed /= total;
  falsePositive /= total;

  return [candidate, confirmed, falsePositive];
}

async function predictFromFeatures(features) {
  await ensureModelLoaded();

  const scaled = applyScaling(features, state.metadata);

  if (!state.model) {
    return { probabilities: heuristicProbabilities(features), source: 'heuristic' };
  }

  const input = tf.tensor2d([scaled], [1, scaled.length]);
  const output = state.model.predict(input);
  const values = Array.from(await output.data());

  input.dispose();
  output.dispose();

  return {
    probabilities: values,
    source: 'model',
  };
}

function applyVerdictToUi(result, originalLabel) {
  const probabilities = result.probabilities;
  const winningIndex = probabilities.indexOf(Math.max(...probabilities));
  const predicted = CLASS_ORDER[winningIndex];

  state.inference = {
    predicted,
    probabilities,
    source: result.source,
  };

  dom.verdictLabel.textContent = `${predicted} (${result.source})`;
  dom.verdictDetail.textContent = `NASA label: ${originalLabel}. This is a v1 classifier and should be treated as exploratory output.`;

  const keys = ['candidate', 'confirmed', 'falsePositive'];
  probabilities.forEach((value, index) => {
    const pct = `${Math.round(value * 100)}%`;
    dom.bars[keys[index]].style.width = pct;
    dom.percentages[keys[index]].textContent = pct;
  });
}

async function runPredictionFromSelected() {
  if (!state.selectedKoi) return;

  const vector = FEATURE_ORDER.map((feature) => state.selectedKoi[feature]);
  const result = await predictFromFeatures(vector);
  applyVerdictToUi(result, state.selectedKoi.koi_disposition);
}

function setupDrawCanvas() {
  drawCtx = dom.drawCanvas.getContext('2d');
  drawCtx.lineWidth = 2;
  drawCtx.lineCap = 'round';
  drawCtx.strokeStyle = '#7ab8ff';

  clearCanvas();

  const getPos = (event) => {
    const rect = dom.drawCanvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    const x = source.clientX - rect.left;
    const y = source.clientY - rect.top;
    return {
      x: clamp(x, 0, rect.width),
      y: clamp(y, 0, rect.height),
      nx: clamp(x / rect.width, 0, 1),
      ny: clamp(y / rect.height, 0, 1),
    };
  };

  const begin = (event) => {
    event.preventDefault();
    state.draw.isDrawing = true;
    const p = getPos(event);
    state.draw.points.push(p);
    drawCtx.beginPath();
    drawCtx.moveTo(p.x, p.y);
  };

  const move = (event) => {
    if (!state.draw.isDrawing) return;
    event.preventDefault();
    const p = getPos(event);
    state.draw.points.push(p);
    drawCtx.lineTo(p.x, p.y);
    drawCtx.stroke();
  };

  const end = () => {
    state.draw.isDrawing = false;
    updateDrawPreview();
  };

  dom.drawCanvas.addEventListener('mousedown', begin);
  dom.drawCanvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);

  dom.drawCanvas.addEventListener('touchstart', begin, { passive: false });
  dom.drawCanvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
}

function clearCanvas() {
  if (!drawCtx) return;
  drawCtx.fillStyle = 'rgba(6, 10, 24, 0.95)';
  drawCtx.fillRect(0, 0, dom.drawCanvas.width, dom.drawCanvas.height);

  drawCtx.strokeStyle = 'rgba(181, 198, 240, 0.26)';
  drawCtx.lineWidth = 1;
  drawCtx.beginPath();
  drawCtx.moveTo(0, dom.drawCanvas.height * 0.28);
  drawCtx.lineTo(dom.drawCanvas.width, dom.drawCanvas.height * 0.28);
  drawCtx.stroke();

  drawCtx.strokeStyle = '#7ab8ff';
  drawCtx.lineWidth = 2;

  state.draw.points = [];
  dom.drawPreview.textContent = 'Draw a dip to preview extracted features.';
}

function extractDrawFeatures() {
  const points = state.draw.points;
  if (!points.length) {
    return null;
  }

  const xValues = points.map((p) => p.nx);
  const yValues = points.map((p) => p.ny);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const dipHeight = clamp(maxY - minY, 0.01, 1);
  const width = clamp(maxX - minX, 0.01, 1);

  const period = clamp((1 / width) * 2.5, 0.6, 1200);
  const depth = clamp(dipHeight * 6500, 40, 100000);
  const duration = clamp(width * 24, 0.4, 30);

  const prad = safeNumber(dom.sliders.prad.value, 2);
  const teq = safeNumber(dom.sliders.teq.value, 600);
  const steff = safeNumber(dom.sliders.steff.value, 5600);
  const srad = safeNumber(dom.sliders.srad.value, 1);

  return {
    vector: [period, depth, duration, prad, teq, steff, srad],
    preview: {
      period,
      depth,
      duration,
      prad,
      teq,
      steff,
      srad,
    },
  };
}

function updateDrawPreview() {
  const extracted = extractDrawFeatures();
  if (!extracted) return;

  const p = extracted.preview;
  dom.drawPreview.textContent =
    `Extracted -> period ${p.period.toFixed(2)} d, depth ${p.depth.toFixed(1)} ppm, ` +
    `duration ${p.duration.toFixed(2)} h, prad ${p.prad.toFixed(2)}.`;
}

async function predictDrawing() {
  const extracted = extractDrawFeatures();
  if (!extracted) {
    dom.drawPreview.textContent = 'Draw a dip first, then run prediction.';
    return;
  }

  const result = await predictFromFeatures(extracted.vector);
  applyVerdictToUi(result, 'USER_DRAWN');
  transitionTo(SCREENS.AI_VERDICT);
}

function bindEvents() {
  dom.launchButton.addEventListener('click', () => transitionTo(SCREENS.STAR_SELECT));

  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-nav');
      transitionTo(target);
    });
  });

  dom.searchInput.addEventListener('input', renderStarList);
  dom.spectralFilter.addEventListener('change', renderStarList);

  dom.starList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const name = target.getAttribute('data-select-koi');
    if (!name) return;

    const picked = state.koiRecords.find((row) => row.kepoi_name === name);
    if (!picked) return;

    state.selectedKoi = picked;
    state.inference = null;
    transitionTo(SCREENS.TRANSIT_VIEW);
  });

  dom.runAiButton.addEventListener('click', async () => {
    await runPredictionFromSelected();
    transitionTo(SCREENS.AI_VERDICT);
  });

  dom.openDrawButton.addEventListener('click', () => transitionTo(SCREENS.DRAW_MODE));
  dom.clearCanvas.addEventListener('click', clearCanvas);
  dom.predictDrawing.addEventListener('click', () => {
    predictDrawing().catch((error) => {
      dom.drawPreview.textContent = `Prediction failed: ${error.message}`;
    });
  });

  Object.values(dom.sliders).forEach((slider) => {
    slider.addEventListener('input', updateDrawPreview);
  });
}

async function initialize() {
  bindEvents();
  setupDrawCanvas();
  renderScreens();

  await loadKoiData();
  renderStarList();
  setStatusPill();
}

initialize().catch((error) => {
  console.error(error);
  dom.statusPill.textContent = `Initialization failed: ${error.message}`;
});
