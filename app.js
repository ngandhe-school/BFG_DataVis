import * as THREE from 'three';
import * as d3 from 'd3';
import * as tf from '@tensorflow/tfjs';

const SCREENS = Object.freeze({
  INTRO: 'INTRO',
  STAR_SELECT: 'STAR_SELECT',
  TRANSIT_VIEW: 'TRANSIT_VIEW',
  DATA_EXPLAIN: 'DATA_EXPLAIN',
  DATASET_STORY: 'DATASET_STORY',
  AI_VERDICT: 'AI_VERDICT',
});

const SCREEN_PATHS = Object.freeze({
  [SCREENS.INTRO]: '/intro',
  [SCREENS.STAR_SELECT]: '/star-select',
  [SCREENS.TRANSIT_VIEW]: '/transit-view',
  [SCREENS.DATA_EXPLAIN]: '/data-explain',
  [SCREENS.DATASET_STORY]: '/dataset-story',
  [SCREENS.AI_VERDICT]: '/ai-verdict',
});

const ROUTE_TO_SCREEN = Object.freeze(
  Object.fromEntries(
    Object.entries(SCREEN_PATHS).map(([screen, route]) => [route, screen]),
  ),
);

const DEFAULT_ROUTE = SCREEN_PATHS[SCREENS.INTRO];

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
const ENABLE_LIVE_API = import.meta.env.VITE_ENABLE_LIVE_API === 'true';

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
  timeline: {
    phase: 0,
    speed: 0.16,
    speedMultiplier: 1,
    paused: false,
  },
  view: {
    targetCameraZ: 7.4,
    mode: 'focus',
    ambience: 1,
    cinematicTime: 0,
  },
};

const dom = {
  statusPill: document.getElementById('status-pill'),
  launchButton: document.getElementById('btn-launch'),
  spaceBgRoot: document.getElementById('space-bg-root'),
  introOrbitRoot: document.getElementById('intro-orbit-root'),
  catalog3dRoot: document.getElementById('catalog-3d-root'),
  verdict3dRoot: document.getElementById('verdict-3d-root'),
  starList: document.getElementById('star-list'),
  searchInput: document.getElementById('search-koi'),
  spectralFilter: document.getElementById('filter-spectral'),
  selectedMeta: document.getElementById('selected-meta'),
  runAiButton: document.getElementById('btn-run-ai'),
  verdictLabel: document.getElementById('verdict-label'),
  verdictDetail: document.getElementById('verdict-detail'),
  verdictSummary: document.getElementById('verdict-summary'),
  heroStory: document.getElementById('hero-story'),
  heroCoverage: document.getElementById('hero-coverage'),
  heroConfirmed: document.getElementById('hero-confirmed'),
  insightList: document.getElementById('insight-list'),
  toggleTimeline: document.getElementById('btn-toggle-timeline'),
  timelineScrubber: document.getElementById('timeline-scrubber'),
  timelineSpeed: document.getElementById('timeline-speed'),
  phaseChip: document.getElementById('phase-chip'),
  speedChip: document.getElementById('speed-chip'),
  transitInsight: document.getElementById('transit-insight'),
  periodDistribution: document.getElementById('period-distribution'),
  verdictWarning: document.getElementById('verdict-warning'),
  reasonList: document.getElementById('reason-list'),
  dataSourceNote: document.getElementById('data-source-note'),
  selectedStarName: document.getElementById('selected-star-name'),
  starWhere: document.getElementById('star-where'),
  starWhat: document.getElementById('star-what'),
  starWhy: document.getElementById('star-why'),
  dossierFieldGrid: document.getElementById('dossier-field-grid'),
  dataLegendList: document.getElementById('data-legend-list'),
  introFactTicker: document.getElementById('intro-fact-ticker'),
  leaderboardList: document.getElementById('leaderboard-list'),
  cameraFocusButton: document.getElementById('btn-camera-focus'),
  cameraCinematicButton: document.getElementById('btn-camera-cinematic'),
  ambienceSlider: document.getElementById('slider-ambience'),
  screens: {
    [SCREENS.INTRO]: document.getElementById('screen-intro'),
    [SCREENS.STAR_SELECT]: document.getElementById('screen-star-select'),
    [SCREENS.TRANSIT_VIEW]: document.getElementById('screen-transit-view'),
    [SCREENS.DATA_EXPLAIN]: document.getElementById('screen-data-explain'),
    [SCREENS.DATASET_STORY]: document.getElementById('screen-dataset-story'),
    [SCREENS.AI_VERDICT]: document.getElementById('screen-ai-verdict'),
  },
};

let threeRuntime = null;
let chartRuntime = null;
let ambient3dRuntime = null;
let revealObserver = null;

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
  const modelLabel = state.modelStatus === 'ready' ? 'AI Ready' : state.modelStatus === 'loading' ? 'AI Loading' : 'AI Standby';
  const dataLabel = state.dataSource === 'live-api' ? 'Live Data' : state.dataSource === 'cached' ? 'Cached Data' : 'Fallback Data';
  const text = `${dataLabel} • ${modelLabel}`;
  dom.statusPill.textContent = text;
}

function normalizeHashRoute(hashText = window.location.hash) {
  const raw = (hashText || '').replace(/^#/, '').trim();
  if (!raw) return DEFAULT_ROUTE;
  const route = raw.startsWith('/') ? raw : `/${raw}`;
  return ROUTE_TO_SCREEN[route] ? route : DEFAULT_ROUTE;
}

function getScreenFromHash(hashText = window.location.hash) {
  return ROUTE_TO_SCREEN[normalizeHashRoute(hashText)] || SCREENS.INTRO;
}

function syncRouteFromScreen(screen, { replace = false } = {}) {
  const route = SCREEN_PATHS[screen] || DEFAULT_ROUTE;
  const nextHash = `#${route}`;
  if (window.location.hash === nextHash) return;

  if (replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    return;
  }

  window.location.hash = route;
}

function syncScreenFromRoute() {
  const targetScreen = getScreenFromHash();
  if (targetScreen !== state.activeScreen) {
    transitionTo(targetScreen, { syncHash: false });
    return;
  }
  syncRouteFromScreen(targetScreen, { replace: true });
}

function transitionTo(nextScreen, { syncHash = true } = {}) {
  if (!SCREEN_PATHS[nextScreen]) return;
  if (state.activeScreen === nextScreen) return;

  state.activeScreen = nextScreen;
  renderScreens();
  if (syncHash) {
    syncRouteFromScreen(nextScreen);
  }

  if (nextScreen === SCREENS.TRANSIT_VIEW) {
    syncTransitView();
  }

  if (nextScreen === SCREENS.DATA_EXPLAIN) {
    renderDataExplain();
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
  document.querySelectorAll('[data-screen-link]').forEach((node) => {
    const target = node.getAttribute('data-screen-link');
    node.classList.toggle('active', target === state.activeScreen);
  });
  setStatusPill();
}

function setupRevealNode(node) {
  node.classList.add('reveal-on-scroll');
  const delay = Number(node.getAttribute('data-reveal-delay') || 0);
  if (Number.isFinite(delay) && delay > 0) {
    node.style.setProperty('--reveal-delay', `${delay}ms`);
  }
}

function revealNodeImmediately(node) {
  setupRevealNode(node);
  node.classList.add('is-visible');
}

function observeRevealElements(scope = document) {
  const revealNodes = scope.querySelectorAll('[data-reveal]');
  if (!revealNodes.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    revealNodes.forEach((node) => revealNodeImmediately(node));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target;
          node.classList.add('is-visible');
          revealObserver?.unobserve(node);
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px',
      },
    );
  }

  revealNodes.forEach((node) => {
    setupRevealNode(node);
    if (!node.classList.contains('is-visible')) {
      revealObserver.observe(node);
    }
  });
}

function scoredLabel(score) {
  if (score >= 0.85) return 'A';
  if (score >= 0.7) return 'B';
  if (score >= 0.5) return 'C';
  return 'D';
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function buildDatasetInsights(rows) {
  if (!rows.length) {
    return {
      storyLine: 'No KOI rows loaded yet',
      coverageLine: '0 stars',
      confirmedLine: '0%',
      bullets: ['Load data to generate insights.'],
    };
  }

  const byDisposition = rows.reduce(
    (acc, row) => {
      acc[row.koi_disposition] = (acc[row.koi_disposition] || 0) + 1;
      return acc;
    },
    { CANDIDATE: 0, CONFIRMED: 0, 'FALSE POSITIVE': 0 },
  );

  const confirmedRatio = (byDisposition.CONFIRMED / rows.length) * 100;
  const hotWorlds = rows.filter((row) => row.koi_teq >= 1200).length;
  const coolWorlds = rows.filter((row) => row.koi_teq <= 450).length;
  const superDeep = rows.filter((row) => row.koi_depth >= 10000).length;

  const medianDepth = median(rows.map((row) => row.koi_depth));
  const medianPeriod = median(rows.map((row) => row.koi_period));
  const medianDuration = median(rows.map((row) => row.koi_duration));

  const storyLine =
    hotWorlds > coolWorlds
      ? 'Detection bias signal: short-period, hotter systems dominate this sample.'
      : 'Detection bias signal: cooler, longer-period systems are harder but still represented.';

  return {
    storyLine,
    coverageLine: `${rows.length} KOIs loaded (${state.dataSource})`,
    confirmedLine: `${confirmedRatio.toFixed(1)}% confirmed`,
    bullets: [
      `${byDisposition.CONFIRMED} confirmed, ${byDisposition.CANDIDATE} candidates, ${byDisposition['FALSE POSITIVE']} false positives.`,
      `${superDeep} KOIs have very deep transits (> 10,000 ppm), which are easy to detect but often need stronger validation.`,
      `Median signal profile: ${medianDepth.toFixed(0)} ppm depth, ${medianDuration.toFixed(2)} h duration, ${medianPeriod.toFixed(2)} day period.`,
      `${hotWorlds} hotter worlds (>= 1200 K) vs ${coolWorlds} cooler worlds (<= 450 K), showing discovery bias toward easier signals.`,
    ],
  };
}

function renderMissionInsights() {
  const insight = buildDatasetInsights(state.koiRecords);
  dom.heroStory.textContent = insight.storyLine;
  dom.heroCoverage.textContent = insight.coverageLine;
  dom.heroConfirmed.textContent = insight.confirmedLine;
  dom.insightList.innerHTML = insight.bullets.map((bullet) => `<li><strong>Insight:</strong> ${bullet}</li>`).join('');
}

function renderIntroTicker() {
  if (!dom.introFactTicker) return;
  const rows = state.koiRecords;
  if (!rows.length) {
    dom.introFactTicker.textContent = 'Waiting for dataset...';
    return;
  }
  const hottest = [...rows].sort((a, b) => b.koi_teq - a.koi_teq)[0];
  const deepest = [...rows].sort((a, b) => b.koi_depth - a.koi_depth)[0];
  const longest = [...rows].sort((a, b) => b.koi_period - a.koi_period)[0];
  const facts = [
    `Hottest world in this sample: ${hottest.kepoi_name} at ${Math.round(hottest.koi_teq)} K.`,
    `Deepest transit signature: ${deepest.kepoi_name} at ${Math.round(deepest.koi_depth)} ppm.`,
    `Longest orbital period currently loaded: ${longest.kepoi_name} (${longest.koi_period.toFixed(1)} days).`,
  ];
  let idx = 0;
  dom.introFactTicker.textContent = facts[0];
  window.setInterval(() => {
    idx = (idx + 1) % facts.length;
    dom.introFactTicker.textContent = facts[idx];
  }, 3600);
}

function renderLeaderboard(rows) {
  if (!dom.leaderboardList) return;
  if (!rows.length) {
    dom.leaderboardList.innerHTML = '<p class="caption">No leaderboard data.</p>';
    return;
  }
  const top = [...rows].sort((a, b) => b.koi_score - a.koi_score).slice(0, 5);
  dom.leaderboardList.innerHTML = top
    .map(
      (row, index) => `
      <div class="leader-item">
        <div>
          <strong>#${index + 1} ${row.kepoi_name}</strong>
          <br />
          <small>${row.koi_disposition} | score ${row.koi_score.toFixed(2)}</small>
        </div>
        <button class="secondary" data-quick-select="${row.kepoi_name}">Inspect</button>
      </div>
    `,
    )
    .join('');
}

function renderPeriodDistribution(rows) {
  if (!dom.periodDistribution) return;
  dom.periodDistribution.innerHTML = '';
  if (!rows.length) return;

  const width = Math.max(280, dom.periodDistribution.clientWidth || 340);
  const height = 150;
  const margin = { top: 8, right: 6, bottom: 24, left: 34 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const logPeriods = rows.map((row) => Math.log10(clamp(row.koi_period, 0.2, 1200)));
  const bins = d3
    .bin()
    .domain([Math.log10(0.2), Math.log10(1200)])
    .thresholds(8)(logPeriods);

  const x = d3
    .scaleBand()
    .domain(bins.map((_, i) => String(i)))
    .range([0, innerWidth])
    .padding(0.14);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (b) => b.length) || 1])
    .nice()
    .range([innerHeight, 0]);

  const svg = d3
    .select(dom.periodDistribution)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  root
    .selectAll('rect')
    .data(bins)
    .enter()
    .append('rect')
    .attr('x', (_, i) => x(String(i)))
    .attr('y', (d) => y(d.length))
    .attr('width', x.bandwidth())
    .attr('height', (d) => innerHeight - y(d.length))
    .attr('fill', '#7ab8ff')
    .attr('opacity', 0.7);

  root
    .append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues([0, 2, 4, 6, 7].map(String))
        .tickFormat((v) => {
          const idx = Number(v);
          const b = bins[idx];
          if (!b) return '';
          return `${Math.round(Math.pow(10, b.x0))}d`;
        }),
    )
    .selectAll('text')
    .attr('fill', '#b7c8ef')
    .style('font-size', '10px');

  root
    .append('g')
    .call(d3.axisLeft(y).ticks(4))
    .selectAll('text')
    .attr('fill', '#b7c8ef')
    .style('font-size', '10px');
}

function cardTemplate(koi) {
  const transitStrength = clamp(koi.koi_depth / 20000, 0, 1);
  const strengthLabel =
    transitStrength > 0.66 ? 'High-contrast dip' : transitStrength > 0.34 ? 'Moderate dip' : 'Subtle dip';
  const orbitFlavor = koi.koi_period < 10 ? 'Fast orbit' : koi.koi_period < 80 ? 'Mid orbit' : 'Long orbit';
  const scoreClass = scoredLabel(koi.koi_score);

  return `
    <article class="star-card" data-koi="${koi.kepoi_name}">
      <div class="star-head">
        <h3 class="star-title">
          <span class="star-orb" style="background: radial-gradient(circle at 32% 24%, #fff, ${koi.starColor})"></span>
          ${koi.kepoi_name}
        </h3>
        <span class="score-pill">SCORE: ${(koi.koi_score * 100).toFixed(1)}</span>
      </div>
      <p class="caption">${koi.koi_disposition} | Spectral ${koi.spectralClass} | Score ${koi.koi_score.toFixed(2)} (${scoreClass})</p>
      <div class="tag-row">
        <span class="mini-tag">Spectral ${koi.spectralClass}</span>
        <span class="mini-tag">${strengthLabel}</span>
        <span class="mini-tag">${orbitFlavor}</span>
      </div>
      <p class="caption">${koi.koi_period.toFixed(2)} day orbit</p>
      <div class="btn-row">
        <button class="secondary inspect-btn" data-select-koi="${koi.kepoi_name}">Inspect Transit</button>
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
    renderPeriodDistribution([]);
    renderLeaderboard([]);
    return;
  }

  dom.starList.innerHTML = rows
    .slice(0, 80)
    .map((koi) => cardTemplate(koi))
    .join('');
  renderPeriodDistribution(rows);
  renderLeaderboard(rows);
  syncCatalogColumnHeights();
}

function syncCatalogColumnHeights() {
  const rightColumn = document.querySelector('.catalog-grid .catalog-insight');
  if (!dom.starList || !rightColumn) return;

  const rightHeight = rightColumn.scrollHeight;
  if (!rightHeight || rightHeight < 100) return;

  dom.starList.style.maxHeight = `${rightHeight}px`;
  dom.starList.style.minHeight = `${rightHeight}px`;
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

function renderTransitNarrative(koi) {
  if (!koi) {
    dom.transitInsight.textContent = 'Transit narrative will appear after selecting a star.';
    return;
  }

  const relativeDepth = clamp((koi.koi_depth / 100000) * 100, 0.01, 100);
  const durationStyle = koi.koi_duration > 8 ? 'long' : koi.koi_duration > 3 ? 'moderate' : 'brief';
  const periodStyle = koi.koi_period > 150 ? 'slow and wide' : koi.koi_period > 20 ? 'steady' : 'rapid';
  dom.transitInsight.innerHTML =
    `<strong>Story:</strong> ${koi.kepoi_name} shows a <strong>${durationStyle}</strong> transit with ` +
    `${relativeDepth.toFixed(2)}% starlight reduction equivalent, on a <strong>${periodStyle}</strong> orbit ` +
    `(${koi.koi_period.toFixed(2)} days).`;
}

function renderDataExplain() {
  if (!dom.dataSourceNote || !dom.selectedStarName || !dom.starWhere || !dom.starWhat || !dom.starWhy) return;

  if (!state.selectedKoi) {
    dom.dataSourceNote.textContent =
      'Source: NASA Exoplanet Archive (Kepler cumulative table), normalized for interactive exploration.';
    dom.selectedStarName.textContent = 'No star selected';
    dom.starWhere.textContent = 'Where: select a KOI from Star Select to load full context.';
    dom.starWhat.textContent = 'What: this page explains what each field means and how it was used.';
    dom.starWhy.textContent = 'Why: linking raw measurements to scientific interpretation helps trust the AI verdict.';
    if (dom.dossierFieldGrid) {
      dom.dossierFieldGrid.innerHTML = '';
    }
    if (dom.dataLegendList) {
      dom.dataLegendList.innerHTML = '<li>Pick a star to see a field-by-field explanation.</li>';
    }
    return;
  }

  const s = state.selectedKoi;
  const sourceLabel = state.dataSource === 'live-api' ? 'Live API' : state.dataSource === 'cached' ? 'Cached sample' : 'Fallback sample';
  const habitability = Math.round(computeScienceScores(s).habitability * 100);
  const detectability = Math.round(computeScienceScores(s).detectability * 100);

  dom.dataSourceNote.textContent =
    `Source: ${sourceLabel} from NASA Exoplanet Archive (Kepler). Values are clamped for stable browser-side modeling and visuals.`;
  dom.selectedStarName.textContent = `${s.kepoi_name} • Spectral ${s.spectralClass} • ${s.koi_disposition}`;
  dom.starWhere.textContent =
    `Where: this target is from Kepler's KOI catalog (KepID ${s.kepid}) with transit-derived orbital and stellar parameters.`;
  dom.starWhat.textContent =
    `What: period ${s.koi_period.toFixed(2)} d, depth ${s.koi_depth.toFixed(1)} ppm, duration ${s.koi_duration.toFixed(2)} h, planet radius ${s.koi_prad.toFixed(2)} Re.`;
  dom.starWhy.textContent =
    `Why: detectability ${detectability}/100 is driven by depth + cadence, while habitability ${habitability}/100 blends size, temperature, and orbit distance proxies.`;

  if (dom.dossierFieldGrid) {
    dom.dossierFieldGrid.innerHTML = [
      `<div><span>KOI Name</span><strong>${s.kepoi_name}</strong></div>`,
      `<div><span>Disposition</span><strong>${s.koi_disposition}</strong></div>`,
      `<div><span>Orbital Period</span><strong>${s.koi_period.toFixed(3)} days</strong></div>`,
      `<div><span>Transit Depth</span><strong>${s.koi_depth.toFixed(1)} ppm</strong></div>`,
      `<div><span>Transit Duration</span><strong>${s.koi_duration.toFixed(2)} h</strong></div>`,
      `<div><span>Planet Radius</span><strong>${s.koi_prad.toFixed(2)} Re</strong></div>`,
      `<div><span>Equilibrium Temp</span><strong>${Math.round(s.koi_teq)} K</strong></div>`,
      `<div><span>Stellar Temp</span><strong>${Math.round(s.koi_steff)} K</strong></div>`,
      `<div><span>Stellar Radius</span><strong>${s.koi_srad.toFixed(2)} Rsolar</strong></div>`,
      `<div><span>Catalog Score</span><strong>${s.koi_score.toFixed(2)}</strong></div>`,
    ].join('');
  }

  if (dom.dataLegendList) {
    dom.dataLegendList.innerHTML = [
      '<li><strong>koi_period:</strong> orbit cadence. Shorter periods produce more transit events and faster evidence accumulation.</li>',
      '<li><strong>koi_depth:</strong> brightness drop in ppm. Larger depth generally means larger occulter or possible stellar binary contamination.</li>',
      '<li><strong>koi_duration:</strong> crossing time of a single transit event; helps separate grazing, central, and blended geometries.</li>',
      '<li><strong>koi_prad:</strong> inferred planet radius in Earth radii, estimated from depth and stellar radius assumptions.</li>',
      '<li><strong>koi_teq:</strong> estimated equilibrium temperature used as a rough climate proxy, not a direct surface temperature.</li>',
      '<li><strong>koi_steff + koi_srad:</strong> host-star temperature and size, used to interpret illumination and transit scale.</li>',
      '<li><strong>koi_disposition:</strong> NASA checkpoint label used for context; this app focuses on detectability and reliability storytelling.</li>',
    ].join('');
  }
}

function computeScienceScores(koi, probabilities = null) {
  // Retained for existing non-verdict features (mission and dossier narration).
  if (!koi) {
    return { habitability: 0, detectability: 0, confidence: 0 };
  }
  const tempComfort = 1 - clamp(Math.abs(koi.koi_teq - 290) / 1300, 0, 1);
  const sizeComfort = 1 - clamp(Math.abs(koi.koi_prad - 1.5) / 12, 0, 1);
  const periodComfort = 1 - clamp(Math.abs(koi.koi_period - 120) / 360, 0, 1);
  const habitability = clamp(tempComfort * 0.45 + sizeComfort * 0.35 + periodComfort * 0.2, 0, 1);

  const depthSignal = clamp(koi.koi_depth / 12000, 0, 1);
  const durationSignal = clamp(koi.koi_duration / 10, 0, 1);
  const periodSignal = 1 - clamp(koi.koi_period / 500, 0, 1);
  const detectability = clamp(depthSignal * 0.5 + durationSignal * 0.2 + periodSignal * 0.3, 0, 1);

  const confidence = probabilities ? Math.max(...probabilities) : 0;
  return { habitability, detectability, confidence };
}

function getSignalFeaturesFromKoi(koi) {
  if (!koi) return null;
  return {
    period: koi.koi_period,
    depth: koi.koi_depth,
    duration: koi.koi_duration,
    prad: koi.koi_prad,
    teq: koi.koi_teq,
    steff: koi.koi_steff,
    srad: koi.koi_srad,
  };
}

function buildReasonList(features) {
  if (!features) return ['Run analysis to view feature-level reasoning.'];
  const reasons = [];

  if (features.depth > 10000) {
    reasons.push('The dip is very deep, so it is easy to detect, but deep events can also come from eclipsing binaries.');
  } else if (features.depth < 500) {
    reasons.push('The dip is shallow, which makes this signal easy to miss without stable repeated observations.');
  } else {
    reasons.push('The dip depth is in a moderate range, which usually supports a more believable transit signal.');
  }

  if (features.period < 10) {
    reasons.push('The orbital period is short, so repeat transits are frequent and easier to validate.');
  } else if (features.period > 150) {
    reasons.push('The orbital period is long, so fewer transits are observed and confidence builds more slowly.');
  }

  if (features.prad > 10) {
    reasons.push('The inferred radius is very large, which can overlap with blended or non-planet scenarios.');
  } else if (features.prad < 2.5) {
    reasons.push('The inferred radius is in a smaller range, which is more consistent with planet-scale objects.');
  }

  return reasons.slice(0, 4);
}

async function loadKoiData() {
  const cache = localStorage.getItem('stellar-fingerprints-koi-cache');
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      state.koiRecords = parsed.map(normalizeKoi);
      state.dataSource = 'cached';
      return;
    } catch (error) {
      console.warn('Cached KOI dataset is invalid. Falling back to local sample.', error);
      localStorage.removeItem('stellar-fingerprints-koi-cache');
      localStorage.removeItem('stellar-fingerprints-koi-cache-ts');
    }
  }

  if (!ENABLE_LIVE_API) {
    const fallbackResponse = await fetch('./data/koi_sample.json');
    const fallbackPayload = await fallbackResponse.json();
    state.koiRecords = fallbackPayload.map(normalizeKoi);
    state.dataSource = 'fallback';
    return;
  }

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

  const transitBand = root
    .append('rect')
    .attr('fill', 'rgba(122, 184, 255, 0.12)')
    .attr('stroke', 'rgba(122, 184, 255, 0.25)')
    .attr('stroke-width', 1)
    .attr('rx', 5)
    .attr('ry', 5);

  const playhead = root
    .append('line')
    .attr('y1', 0)
    .attr('stroke', '#ffd7a7')
    .attr('stroke-width', 1.2)
    .attr('stroke-dasharray', '3 4');

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
    transitBand,
    playhead,
    marker,
    innerHeight,
    innerWidth,
    curveRows: [],
  };
}

function renderTransitCurve(koi) {
  if (!chartRuntime) {
    initChart();
  }

  const rows = generateTransitCurve(koi);
  chartRuntime.curveRows = rows;
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
  const durationFraction = clamp(koi.koi_duration / (koi.koi_period * 24), 0.004, 0.19);
  const left = clamp(0.5 - durationFraction * 1.4, 0, 1);
  const right = clamp(0.5 + durationFraction * 1.4, 0, 1);

  chartRuntime.transitBand
    .attr('x', chartRuntime.x(left))
    .attr('y', 0)
    .attr('width', Math.max(1, chartRuntime.x(right) - chartRuntime.x(left)))
    .attr('height', chartRuntime.innerHeight);

  chartRuntime.playhead
    .attr('x1', chartRuntime.x(state.timeline.phase))
    .attr('x2', chartRuntime.x(state.timeline.phase))
    .attr('y2', chartRuntime.innerHeight);

  chartRuntime.marker
    .attr('cx', chartRuntime.x(activePoint.phase))
    .attr('cy', chartRuntime.y(activePoint.flux));
}

function createRendererForContainer(container, pixelRatioCap = 1.4) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
  renderer.setSize(container.clientWidth || 300, container.clientHeight || 200);
  container.appendChild(renderer.domElement);
  return renderer;
}

function initAmbient3d() {
  if (ambient3dRuntime) return;

  const scenes = [];
  const clock = new THREE.Clock();

  function registerScene(runtime) {
    if (!runtime) return;
    scenes.push(runtime);
  }

  function initGlobalScene() {
    const container = dom.spaceBgRoot;
    if (!container) return null;

    const renderer = createRendererForContainer(container, 1.2);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      56,
      container.clientWidth / container.clientHeight || 1,
      0.1,
      240,
    );
    camera.position.set(0, 0, 28);

    const starfieldGeo = new THREE.BufferGeometry();
    const count = 5200;
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 45 + Math.random() * 85;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      coords[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      coords[i * 3 + 2] = r * Math.cos(phi);
    }
    starfieldGeo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
    const starfield = new THREE.Points(
      starfieldGeo,
      new THREE.PointsMaterial({
        size: 0.35,
        color: '#9ac8ff',
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    scene.add(starfield);

    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(110, 64, 64),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vPos;
          void main() {
            float c1 = sin(vPos.x * 0.03 + uTime * 0.06) * 0.5 + 0.5;
            float c2 = cos(vPos.y * 0.035 - uTime * 0.04) * 0.5 + 0.5;
            float blend = smoothstep(0.2, 0.9, c1 * c2);
            vec3 color = mix(vec3(0.02, 0.04, 0.1), vec3(0.11, 0.08, 0.2), blend);
            gl_FragColor = vec4(color, 0.42);
          }
        `,
      }),
    );
    scene.add(nebula);

    const driftPlanets = [];
    for (let i = 0; i < 7; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.8 + Math.random() * 1.6, 28, 28),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? '#7ea4e8' : '#c4a6ff',
          roughness: 0.85,
          metalness: 0.08,
          transparent: true,
          opacity: 0.18,
        }),
      );
      mesh.position.set((Math.random() - 0.5) * 68, (Math.random() - 0.5) * 28, -18 - Math.random() * 60);
      scene.add(mesh);
      driftPlanets.push(mesh);
    }

    const ambient = new THREE.AmbientLight(0x99b4ff, 0.25);
    scene.add(ambient);
    const point = new THREE.PointLight(0x8aa8ff, 0.8, 180);
    point.position.set(0, 0, 20);
    scene.add(point);

    return {
      key: 'global',
      renderer,
      scene,
      camera,
      onResize() {
        renderer.setSize(container.clientWidth || 300, container.clientHeight || 200);
        camera.aspect = (container.clientWidth || 300) / (container.clientHeight || 200);
        camera.updateProjectionMatrix();
      },
      update(elapsed) {
        starfield.rotation.y += 0.00006;
        starfield.rotation.x = Math.sin(elapsed * 0.08) * 0.06;
        nebula.material.uniforms.uTime.value = elapsed;
        driftPlanets.forEach((planet, idx) => {
          planet.position.x += Math.sin(elapsed * 0.12 + idx) * 0.002;
          planet.position.y += Math.cos(elapsed * 0.15 + idx) * 0.0015;
          planet.rotation.y += 0.0008 + idx * 0.0001;
        });
        renderer.render(scene, camera);
      },
      tint(color) {
        const c = new THREE.Color(color);
        point.color.copy(c);
      },
    };
  }

  function initIntroMiniScene() {
    const container = dom.introOrbitRoot;
    if (!container) return null;
    const renderer = createRendererForContainer(container, 1.5);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight || 1, 0.1, 100);
    camera.position.set(0.2, 0.08, 7.2);

    const ambient = new THREE.AmbientLight(0xbfd2ff, 0.36);
    scene.add(ambient);
    const point = new THREE.PointLight(0x9ed2ff, 1.5, 50);
    point.position.set(2.8, 1.3, 3.2);
    scene.add(point);

    const earthUniforms = {
      uTime: { value: 0 },
      uTint: { value: new THREE.Color('#6be5ff') },
    };
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 96, 96),
      new THREE.ShaderMaterial({
        uniforms: earthUniforms,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uTint;
          varying vec3 vNormal;
          varying vec3 vWorld;
          float terrain(vec3 p) {
            float n = sin(p.x * 3.6 + uTime * 0.25) * 0.38;
            n += cos(p.y * 4.8 - uTime * 0.19) * 0.32;
            n += sin((p.x + p.z) * 5.4 + uTime * 0.15) * 0.18;
            return n;
          }
          void main() {
            vec3 nrm = normalize(vNormal);
            vec3 p = normalize(vWorld) + vec3(uTime * 0.035, 0.0, 0.0);
            float n = terrain(p);
            float coast = smoothstep(-0.08, 0.05, n);
            vec3 ocean = vec3(0.02, 0.12, 0.28);
            vec3 deep = vec3(0.01, 0.06, 0.17);
            vec3 landA = vec3(0.10, 0.47, 0.26);
            vec3 landB = vec3(0.33, 0.61, 0.34);
            vec3 oceanMix = mix(deep, ocean, smoothstep(-0.55, 0.4, n));
            vec3 landMix = mix(landA, landB, smoothstep(0.02, 0.5, n));
            vec3 base = mix(oceanMix, landMix, coast);
            vec3 lightDir = normalize(vec3(0.45, 0.35, 0.8));
            float lambert = max(dot(nrm, lightDir), 0.0);
            float fres = pow(1.0 - max(dot(nrm, vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
            vec3 color = base * (0.22 + lambert * 1.15);
            color += uTint * 0.18 * fres;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    );

    const cloudUniforms = {
      uTime: { value: 0 },
    };
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.81, 72, 72),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: cloudUniforms,
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vPos;
          void main() {
            float c = sin(vPos.x * 11.0 + uTime * 0.25) * 0.4;
            c += cos(vPos.y * 9.0 - uTime * 0.21) * 0.34;
            c += sin((vPos.x + vPos.z) * 13.0 + uTime * 0.14) * 0.26;
            float a = smoothstep(0.36, 0.68, c);
            gl_FragColor = vec4(vec3(0.82, 0.91, 1.0), a * 0.36);
          }
        `,
      }),
    );

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.95, 68, 68),
      new THREE.MeshBasicMaterial({
        color: '#56d5ff',
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    );

    const moonPivot = new THREE.Group();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 28, 28),
      new THREE.MeshStandardMaterial({ color: '#c6cfe4', roughness: 0.82, metalness: 0.04 }),
    );
    moon.position.set(3.15, 0.22, -0.72);
    moonPivot.add(moon);

    const orbitGlow = new THREE.Mesh(
      new THREE.TorusGeometry(3.14, 0.02, 8, 220),
      new THREE.MeshBasicMaterial({
        color: '#5ed8ff',
        transparent: true,
        opacity: 0.34,
      }),
    );
    orbitGlow.rotation.x = 1.22;

    const sparkleGeo = new THREE.BufferGeometry();
    const sparkleCount = 650;
    const sparkleCoords = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i += 1) {
      const r = 5 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 6;
      sparkleCoords[i * 3] = Math.cos(a) * r;
      sparkleCoords[i * 3 + 1] = y;
      sparkleCoords[i * 3 + 2] = Math.sin(a) * r;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparkleCoords, 3));
    const sparkles = new THREE.Points(
      sparkleGeo,
      new THREE.PointsMaterial({
        color: '#95c8ff',
        size: 0.035,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );

    const earthGroup = new THREE.Group();
    earthGroup.add(earth);
    earthGroup.add(clouds);
    earthGroup.add(atmosphere);
    scene.add(earthGroup);
    scene.add(moonPivot);
    scene.add(orbitGlow);
    scene.add(sparkles);

    let targetPointerX = 0;
    let targetPointerY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      targetPointerX = clamp(px, -1, 1);
      targetPointerY = clamp(py, -1, 1);
    };

    const onPointerLeave = () => {
      targetPointerX = 0;
      targetPointerY = 0;
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    return {
      key: 'intro',
      renderer,
      scene,
      camera,
      onResize() {
        renderer.setSize(container.clientWidth || 300, container.clientHeight || 180);
        camera.aspect = (container.clientWidth || 300) / (container.clientHeight || 180);
        camera.updateProjectionMatrix();
      },
      update(elapsed) {
        pointerX += (targetPointerX - pointerX) * 0.045;
        pointerY += (targetPointerY - pointerY) * 0.045;

        earthUniforms.uTime.value = elapsed;
        cloudUniforms.uTime.value = elapsed;
        earth.rotation.y += 0.0024;
        earth.rotation.x = pointerY * 0.16 + Math.sin(elapsed * 0.3) * 0.03;
        clouds.rotation.y += 0.00295;
        atmosphere.rotation.y += 0.0013;
        atmosphere.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.008);

        moonPivot.rotation.y += 0.0034;
        moon.position.y = 0.16 + Math.sin(elapsed * 1.2) * 0.14;
        orbitGlow.rotation.z += 0.0014;
        sparkles.rotation.y -= 0.0004;
        sparkles.rotation.x = Math.sin(elapsed * 0.2) * 0.06;

        camera.position.x = 0.18 + pointerX * 0.55 + Math.sin(elapsed * 0.14) * 0.18;
        camera.position.y = 0.08 - pointerY * 0.35 + Math.cos(elapsed * 0.21) * 0.08;
        camera.lookAt(0, 0, 0);
        point.intensity = 1.35 + (pointerX * 0.18) + Math.sin(elapsed * 0.8) * 0.08;
        renderer.render(scene, camera);
      },
      tint(color) {
        const c = new THREE.Color(color);
        earthUniforms.uTint.value.copy(c);
        orbitGlow.material.color = c.clone().lerp(new THREE.Color('#8bd5ff'), 0.48);
        point.color.copy(c.clone().lerp(new THREE.Color('#d9e6ff'), 0.42));
      },
    };
  }

  function initCatalogMiniScene() {
    const container = dom.catalog3dRoot;
    if (!container) return null;
    const renderer = createRendererForContainer(container, 1.4);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight || 1, 0.1, 80);
    camera.position.set(0, 0, 6);

    const geo = new THREE.BufferGeometry();
    const pointsN = 900;
    const arr = new Float32Array(pointsN * 3);
    for (let i = 0; i < pointsN; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const cloud = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.04,
        color: '#8fb8ff',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(cloud);

    const frame = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.3, 0.07, 160, 22, 2, 5),
      new THREE.MeshBasicMaterial({ color: '#bad2ff', wireframe: true, transparent: true, opacity: 0.35 }),
    );
    scene.add(frame);

    return {
      key: 'catalog',
      renderer,
      scene,
      camera,
      onResize() {
        renderer.setSize(container.clientWidth || 300, container.clientHeight || 170);
        camera.aspect = (container.clientWidth || 300) / (container.clientHeight || 170);
        camera.updateProjectionMatrix();
      },
      update() {
        cloud.rotation.y += 0.0018;
        frame.rotation.x += 0.0022;
        frame.rotation.y += 0.0014;
        renderer.render(scene, camera);
      },
      tint(color) {
        const c = new THREE.Color(color);
        cloud.material.color = c;
      },
    };
  }

  function initVerdictMiniScene() {
    const container = dom.verdict3dRoot;
    if (!container) return null;
    const renderer = createRendererForContainer(container, 1.5);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight || 1, 0.1, 80);
    camera.position.set(0, 0.1, 6.3);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 3),
      new THREE.MeshStandardMaterial({
        color: '#9ec3ff',
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        emissive: '#173058',
        emissiveIntensity: 0.45,
      }),
    );
    scene.add(shell);
    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.022, 8, 120),
      new THREE.MeshBasicMaterial({ color: '#7eb7ff', transparent: true, opacity: 0.45 }),
    );
    ringA.rotation.x = 1.2;
    scene.add(ringA);
    const ringB = ringA.clone();
    ringB.rotation.y = 1.3;
    scene.add(ringB);

    return {
      key: 'verdict',
      renderer,
      scene,
      camera,
      shell,
      ringA,
      ringB,
      pulse: 0.45,
      onResize() {
        renderer.setSize(container.clientWidth || 300, container.clientHeight || 170);
        camera.aspect = (container.clientWidth || 300) / (container.clientHeight || 170);
        camera.updateProjectionMatrix();
      },
      update(elapsed) {
        shell.rotation.x += 0.003;
        shell.rotation.y += 0.0045;
        ringA.rotation.z += 0.005;
        ringB.rotation.x += 0.004;
        shell.material.opacity = 0.38 + this.pulse * (0.2 + Math.sin(elapsed * 2.2) * 0.1);
        renderer.render(scene, camera);
      },
      tint(color) {
        const c = new THREE.Color(color);
        shell.material.color = c;
        ringA.material.color = c;
        ringB.material.color = c;
      },
      setProbabilities(probabilities) {
        if (!Array.isArray(probabilities) || probabilities.length < 3) return;
        this.pulse = clamp(Math.max(...probabilities), 0.2, 1);
      },
    };
  }

  registerScene(initGlobalScene());
  registerScene(initIntroMiniScene());
  registerScene(initCatalogMiniScene());
  registerScene(initVerdictMiniScene());

  function onResize() {
    scenes.forEach((runtime) => runtime.onResize?.());
  }
  window.addEventListener('resize', onResize);

  function tick() {
    const elapsed = clock.getElapsedTime();
    scenes.forEach((runtime) => runtime.update?.(elapsed));
    requestAnimationFrame(tick);
  }
  tick();

  ambient3dRuntime = {
    scenes,
    tint(color) {
      scenes.forEach((runtime) => runtime.tint?.(color));
    },
    updateVerdict(probabilities) {
      const verdictScene = scenes.find((runtime) => runtime.key === 'verdict');
      verdictScene?.setProbabilities?.(probabilities);
    },
  };
}

function syncTimelineUi() {
  if (
    !dom.timelineScrubber ||
    !dom.phaseChip ||
    !dom.speedChip ||
    !dom.toggleTimeline
  ) {
    return;
  }
  const phase = clamp(state.timeline.phase, 0, 1);
  dom.timelineScrubber.value = String(Math.round(phase * 1000));
  dom.phaseChip.textContent = `Phase ${phase.toFixed(3)}`;
  dom.speedChip.textContent = `Speed ${state.timeline.speedMultiplier.toFixed(1)}x`;
  dom.toggleTimeline.textContent = state.timeline.paused ? 'Play' : 'Pause';
}

function applyCameraMode(mode) {
  state.view.mode = mode === 'cinematic' ? 'cinematic' : 'focus';
  if (state.view.mode === 'focus') {
    state.view.targetCameraZ = clamp(state.view.targetCameraZ - 0.4, 6.8, 8.6);
  } else {
    state.view.targetCameraZ = clamp(state.view.targetCameraZ + 0.85, 7.4, 9.8);
  }

  if (dom.cameraFocusButton) {
    dom.cameraFocusButton.classList.toggle('mode-active', state.view.mode === 'focus');
  }
  if (dom.cameraCinematicButton) {
    dom.cameraCinematicButton.classList.toggle('mode-active', state.view.mode === 'cinematic');
  }
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
    47,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0.16, state.view.targetCameraZ);
  const cameraBasePosition = new THREE.Vector3(0, 0.16, state.view.targetCameraZ);

  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0xffffff, 2.4, 24);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const starGeometry = new THREE.SphereGeometry(1.66, 90, 90);
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color('#fff4e8') },
      uPulse: { value: 1 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform float uPulse;
      uniform float uTime;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amp * noise(p);
          p *= 2.02;
          amp *= 0.52;
        }
        return value;
      }

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 viewDir = normalize(vViewDir);
        float nDotV = clamp(dot(normal, viewDir), 0.0, 1.0);

        vec2 flowUv = vUv * 8.0 + vec2(uTime * 0.045, -uTime * 0.031);
        float cell = fbm(flowUv);
        float grain = smoothstep(0.28, 0.86, cell);

        vec3 coreColor = uBaseColor * 1.1 + vec3(0.2, 0.09, 0.03) * grain;
        vec3 darkPatch = uBaseColor * 0.55 + vec3(0.08, 0.03, 0.015) * (1.0 - grain);
        vec3 surface = mix(darkPatch, coreColor, grain);

        float limbGlow = pow(1.0 - nDotV, 2.3);
        float limbDarkening = mix(0.58, 1.0, pow(nDotV, 0.7));

        vec3 flare = uBaseColor * (0.24 + 0.16 * uPulse) * limbGlow;
        vec3 color = surface * limbDarkening + flare;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const starMesh = new THREE.Mesh(starGeometry, starMaterial);
  scene.add(starMesh);

  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(2.08, 64, 64),
    new THREE.MeshBasicMaterial({
      color: '#ffd7a7',
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(corona);

  const haloSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      color: '#ffd7a7',
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  haloSprite.scale.set(6.7, 6.7, 1);
  scene.add(haloSprite);

  const plasmaShell = new THREE.Mesh(
    new THREE.SphereGeometry(2.52, 80, 80),
    new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffd7a7') },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normal;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          float stripe = sin(vPos.y * 5.2 + uTime * 1.5) * 0.5 + 0.5;
          float swirl = cos(vPos.x * 6.6 - uTime * 1.1) * 0.5 + 0.5;
          float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 3.0);
          float alpha = (stripe * 0.4 + swirl * 0.35 + rim * 0.7) * 0.19;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    }),
  );
  scene.add(plasmaShell);

  const orbitRing = new THREE.Mesh(
    new THREE.RingGeometry(2.28, 2.31, 128),
    new THREE.MeshBasicMaterial({
      color: '#8abfff',
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  orbitRing.rotation.x = Math.PI / 2;
  scene.add(orbitRing);

  const orbitRingOuter = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.24, 128),
    new THREE.MeshBasicMaterial({
      color: '#88aef7',
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    }),
  );
  orbitRingOuter.rotation.x = Math.PI / 2;
  scene.add(orbitRingOuter);

  const orbitArc = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.012, 8, 140, Math.PI * 0.36),
    new THREE.MeshBasicMaterial({
      color: '#cfe3ff',
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    }),
  );
  orbitArc.rotation.x = Math.PI / 2;
  scene.add(orbitArc);

  const orbitGroup = new THREE.Group();
  const planetSystem = new THREE.Group();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 28),
    new THREE.MeshStandardMaterial({ color: '#79bfff', roughness: 0.45, metalness: 0.15 }),
  );
  planet.position.set(2.72, 0, 0);
  planetSystem.add(planet);
  orbitGroup.add(planetSystem);

  const moonPivot = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 20, 20),
    new THREE.MeshStandardMaterial({
      color: '#d7deea',
      roughness: 0.88,
      metalness: 0.04,
      emissive: '#111b2a',
      emissiveIntensity: 0.35,
    }),
  );
  moon.position.set(0.34, 0.04, 0);
  moonPivot.add(moon);
  planet.add(moonPivot);

  const planetTrailCurvePoints = [];
  for (let i = 0; i <= 140; i += 1) {
    const a = (i / 140) * Math.PI * 2;
    planetTrailCurvePoints.push(new THREE.Vector3(Math.cos(a) * 2.8, 0, Math.sin(a) * 0.9));
  }
  const planetTrailGeometry = new THREE.BufferGeometry().setFromPoints(planetTrailCurvePoints);
  const planetTrail = new THREE.Line(
    planetTrailGeometry,
    new THREE.LineBasicMaterial({
      color: '#8ec5ff',
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(planetTrail);

  const shockwaveRings = [0, 1, 2].map((index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.33, 96),
      new THREE.MeshBasicMaterial({
        color: '#9ecbff',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.userData = { phaseOffset: index * 1.85 };
    scene.add(ring);
    return ring;
  });

  const asteroidBeltGeo = new THREE.BufferGeometry();
  const asteroidCount = 1800;
  const asteroidCoords = new Float32Array(asteroidCount * 3);
  for (let i = 0; i < asteroidCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.65 + Math.random() * 0.75;
    const y = (Math.random() - 0.5) * 0.26;
    asteroidCoords[i * 3] = Math.cos(angle) * radius;
    asteroidCoords[i * 3 + 1] = y;
    asteroidCoords[i * 3 + 2] = Math.sin(angle) * radius;
  }
  asteroidBeltGeo.setAttribute('position', new THREE.BufferAttribute(asteroidCoords, 3));
  const asteroidBelt = new THREE.Points(
    asteroidBeltGeo,
    new THREE.PointsMaterial({
      size: 0.018,
      color: '#b5c8de',
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(asteroidBelt);

  const cometHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 18, 18),
    new THREE.MeshBasicMaterial({
      color: '#d6efff',
      transparent: true,
      opacity: 0.95,
    }),
  );
  scene.add(cometHead);

  const cometTailPoints = new Array(28).fill(0).map(() => new THREE.Vector3(0, 0, 0));
  const cometTailGeo = new THREE.BufferGeometry().setFromPoints(cometTailPoints);
  const cometTail = new THREE.Line(
    cometTailGeo,
    new THREE.LineBasicMaterial({
      color: '#9ed7ff',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(cometTail);

  const galaxySprites = [];
  for (let i = 0; i < 8; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: i % 2 === 0 ? '#7fa8ff' : '#c89bff',
        transparent: true,
        opacity: 0.08 + Math.random() * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sprite.position.set(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 14,
      -10 - Math.random() * 15,
    );
    const s = 2.5 + Math.random() * 3.8;
    sprite.scale.set(s, s, 1);
    scene.add(sprite);
    galaxySprites.push(sprite);
  }
  scene.add(orbitGroup);

  const nebula = new THREE.Mesh(
    new THREE.SphereGeometry(16, 48, 48),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vPosition;
        void main() {
          float wave = sin(vPosition.x * 0.38 + uTime * 0.1) * cos(vPosition.y * 0.36 - uTime * 0.07);
          float mask = smoothstep(-0.3, 0.8, wave);
          vec3 color = mix(vec3(0.08, 0.1, 0.2), vec3(0.18, 0.12, 0.32), mask);
          gl_FragColor = vec4(color, 0.35);
        }
      `,
    }),
  );
  scene.add(nebula);

  const starfieldGeo = new THREE.BufferGeometry();
  const starCount = 900;
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

  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 1200;
  const dustCoords = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    dustCoords[i * 3] = (Math.random() - 0.5) * 48;
    dustCoords[i * 3 + 1] = (Math.random() - 0.5) * 30;
    dustCoords[i * 3 + 2] = (Math.random() - 0.5) * 48;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustCoords, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.015,
      color: '#9cc8ff',
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(dust);

  const clock = new THREE.Clock();
  const pointer = { x: 0, y: 0 };
  const cometVelocity = new THREE.Vector3();

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    pointer.x = clamp(px * 2 - 1, -1, 1);
    pointer.y = clamp(py * 2 - 1, -1, 1);
  }
  container.addEventListener('pointermove', onPointerMove);

  function tick() {
    const elapsed = clock.getElapsedTime();
    const step = state.timeline.speed * state.timeline.speedMultiplier * 0.002;
    if (!state.timeline.paused) {
      state.timeline.phase = (state.timeline.phase + step) % 1;
    }
    syncTimelineUi();

    starMaterial.uniforms.uTime.value = elapsed;
    starMaterial.uniforms.uPulse.value = 1 + Math.sin(elapsed * 1.3) * 0.08;
    nebula.material.uniforms.uTime.value = elapsed;
    plasmaShell.material.uniforms.uTime.value = elapsed;
    starMesh.rotation.y += 0.0024;
    corona.rotation.y -= 0.0018;
    haloSprite.material.opacity = 0.22 + Math.sin(elapsed * 1.1) * 0.04;
    plasmaShell.rotation.y += 0.0012;
    dust.rotation.y += 0.00022;
    asteroidBelt.rotation.y += 0.0006;
    orbitArc.rotation.z = elapsed * 0.42;
    orbitRingOuter.rotation.z = -elapsed * 0.03;
    planetSystem.rotation.y += 0.004;
    moonPivot.rotation.y += 0.032;
    moon.position.y = Math.sin(elapsed * 2.8) * 0.03;

    shockwaveRings.forEach((ring) => {
      const wave = (elapsed * 0.62 + ring.userData.phaseOffset) % 2.8;
      const progress = wave / 2.8;
      const scale = 1 + progress * 0.95;
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = (1 - progress) * 0.24 * state.view.ambience;
    });

    const phaseAngle = state.timeline.phase * Math.PI * 2;
    orbitGroup.rotation.y = phaseAngle;

    const orbitRadius = 2.78;
    const orbitalY = Math.sin(phaseAngle) * 0.24;
    planet.position.x = Math.cos(phaseAngle) * orbitRadius;
    planet.position.y = orbitalY;
    planet.position.z = Math.sin(phaseAngle) * 0.9;

    const cometAngle = elapsed * 0.18;
    const cometRadius = 6.2;
    const cometTilt = Math.sin(elapsed * 0.5) * 0.9;
    const prevComet = cometHead.position.clone();
    cometHead.position.set(
      Math.cos(cometAngle) * cometRadius,
      Math.sin(cometAngle * 1.8) * 0.9 + cometTilt,
      Math.sin(cometAngle) * cometRadius * 0.55,
    );
    cometVelocity.copy(cometHead.position).sub(prevComet).normalize().multiplyScalar(-0.55);
    cometTailPoints.unshift(cometHead.position.clone());
    cometTailPoints.pop();
    cometTailPoints.forEach((p, idx) => {
      const jitter = idx * 0.014;
      p.addScaledVector(cometVelocity, jitter);
    });
    cometTail.geometry.setFromPoints(cometTailPoints);
    cometTail.geometry.attributes.position.needsUpdate = true;

    galaxySprites.forEach((sprite, idx) => {
      sprite.material.opacity = 0.06 + (Math.sin(elapsed * 0.26 + idx) + 1) * 0.05;
      sprite.position.x += Math.sin(elapsed * 0.08 + idx) * 0.0009;
    });

    cameraBasePosition.z += (state.view.targetCameraZ - cameraBasePosition.z) * 0.04;
    const driftFactor = state.view.mode === 'cinematic' ? 0.52 : 0.12;
    const yFactor = state.view.mode === 'cinematic' ? -0.3 : -0.1;
    const easing = state.view.mode === 'cinematic' ? 0.042 : 0.08;
    camera.position.x += (cameraBasePosition.x + pointer.x * driftFactor - camera.position.x) * easing;
    camera.position.y += (cameraBasePosition.y + pointer.y * yFactor - camera.position.y) * easing;
    camera.position.z += (cameraBasePosition.z - camera.position.z) * 0.07;
    if (state.view.mode === 'cinematic') {
      state.view.cinematicTime += 0.008;
      camera.position.x += Math.sin(state.view.cinematicTime) * 0.012;
      camera.position.y += Math.cos(state.view.cinematicTime * 0.7) * 0.008;
      camera.position.z += Math.sin(state.view.cinematicTime * 0.6) * 0.005;
    } else {
      state.view.cinematicTime = 0;
    }
    camera.lookAt(0, 0, 0);

    const baseHaloOpacity = threeRuntime?.haloBaseOpacity ?? 0.22;
    haloSprite.material.opacity = clamp(baseHaloOpacity * state.view.ambience, 0.08, 0.45);
    dust.material.opacity = clamp(0.18 + state.view.ambience * 0.26, 0.14, 0.55);
    nebula.material.opacity = clamp(0.18 + state.view.ambience * 0.2, 0.15, 0.45);

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
    haloSprite,
    haloBaseOpacity: 0.22,
    plasmaShell,
    orbitRing,
    orbitRingOuter,
    orbitArc,
    planet,
    moon,
    moonPivot,
    planetTrail,
    shockwaveRings,
    asteroidBelt,
    cometHead,
    cometTail,
    galaxySprites,
    starMesh,
    pointLight,
    nebula,
  };
}

function updateThreeFromKoi(koi) {
  if (!threeRuntime || !koi) return;

  const starColor = new THREE.Color(koi.starColor);
  threeRuntime.starMaterial.uniforms.uBaseColor.value = starColor;
  threeRuntime.corona.material.color = starColor;
  threeRuntime.haloSprite.material.color = starColor;
  threeRuntime.plasmaShell.material.uniforms.uColor.value = starColor;
  threeRuntime.pointLight.color = starColor;
  threeRuntime.orbitRing.material.color = starColor;
  threeRuntime.orbitRingOuter.material.color = starColor;
  threeRuntime.orbitArc.material.color = starColor;

  const radiusScale = clamp(0.78 + koi.koi_srad * 0.4, 0.64, 1.95);
  threeRuntime.starMesh.scale.setScalar(radiusScale);
  threeRuntime.corona.scale.setScalar(clamp(radiusScale * 1.06, 0.84, 2.25));
  threeRuntime.plasmaShell.scale.setScalar(clamp(radiusScale * 1.1, 0.92, 2.45));
  threeRuntime.pointLight.intensity = clamp(1.2 + radiusScale * 0.7, 1.1, 2.8);
  state.view.targetCameraZ = clamp(7.0 + radiusScale * 0.9, 7.1, 8.8);

  const planetScale = clamp(0.06 + koi.koi_prad * 0.03, 0.08, 0.45);
  threeRuntime.planet.scale.setScalar(planetScale);
  const moonScale = clamp(0.03 + planetScale * 0.22, 0.025, 0.11);
  threeRuntime.moon.scale.setScalar(moonScale);
  threeRuntime.moon.position.x = clamp(0.2 + planetScale * 0.9, 0.24, 0.65);

  const heat = clamp((koi.koi_teq - 120) / (2200 - 120), 0, 1);
  const planetColor = new THREE.Color().setHSL(0.58 - heat * 0.48, 0.8, 0.58);
  threeRuntime.planet.material.color = planetColor;
  threeRuntime.haloBaseOpacity = clamp(0.15 + (koi.koi_steff - 3500) / 24000, 0.12, 0.3);
  threeRuntime.haloSprite.material.opacity = clamp(threeRuntime.haloBaseOpacity * state.view.ambience, 0.08, 0.45);
  threeRuntime.orbitRing.material.opacity = clamp(0.16 + koi.koi_score * 0.24, 0.14, 0.42);
  threeRuntime.orbitRingOuter.material.opacity = clamp(0.08 + (1 - koi.koi_score) * 0.18, 0.08, 0.28);
  threeRuntime.orbitArc.material.opacity = clamp(0.2 + planetScale * 0.6, 0.22, 0.55);
  threeRuntime.asteroidBelt.material.opacity = clamp(0.38 + (koi.koi_period / 1200) * 0.36, 0.32, 0.76);
  threeRuntime.cometTail.material.color = starColor.clone().lerp(new THREE.Color('#9ed7ff'), 0.55);
  threeRuntime.shockwaveRings.forEach((ring) => {
    ring.material.color = starColor;
  });

  const galaxyTint = starColor.clone().lerp(new THREE.Color('#a9bfff'), 0.45);
  threeRuntime.galaxySprites.forEach((sprite) => {
    sprite.material.color = galaxyTint;
  });
}

function syncTransitView() {
  if (!state.selectedKoi) return;
  renderSelectedMeta();
  renderTransitNarrative(state.selectedKoi);
  renderDataExplain();
  if (dom.verdictSummary) {
    dom.verdictSummary.textContent = 'What this means will appear here after analysis.';
  }
  if (dom.verdictWarning) {
    dom.verdictWarning.textContent = 'No uncertainty warning yet.';
  }
  ambient3dRuntime?.tint(state.selectedKoi.starColor);
  if (dom.reasonList) {
    dom.reasonList.innerHTML = '<li>Run analysis to view feature-level reasoning.</li>';
  }
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

function buildStoryConclusion(features) {
  if (!features) return 'Run analysis to generate an evidence summary.';
  if (features.depth >= 9000 && features.period <= 20) {
    return 'Strongly detectable signal, but verify for false-positive scenarios before claiming a planet.';
  }
  if (features.depth <= 500 || features.period >= 150) {
    return 'Possible transit signal, but detection confidence is limited by weak depth or sparse repeats.';
  }
  return 'Moderate transit evidence: plausible signal with follow-up needed for stronger confidence.';
}

function buildVerdictDetail(originalLabel) {
  return `NASA baseline label: ${originalLabel}. This view explains what in the signal supports or weakens confidence.`;
}

function applyVerdictToUi(result, originalLabel) {
  const probabilities = result.probabilities;
  const features = getSignalFeaturesFromKoi(state.selectedKoi);
  const sorted = [...probabilities].sort((a, b) => b - a);
  const margin = sorted[0] - sorted[1];

  state.inference = {
    summary: buildStoryConclusion(features),
    probabilities,
    source: result.source,
    margin,
  };

  dom.verdictLabel.textContent = 'Signal Interpretation Ready';
  dom.verdictDetail.textContent = buildVerdictDetail(originalLabel);
  if (dom.verdictSummary) {
    dom.verdictSummary.textContent = buildStoryConclusion(features);
  }

  if (dom.verdictWarning) {
    if (sorted[0] < 0.55 || margin < 0.1) {
      dom.verdictWarning.textContent =
        'Uncertainty warning: class probabilities are close. Treat this as exploratory guidance.';
    } else {
      dom.verdictWarning.textContent = 'Uncertainty check: model separation is decent, but this is still not proof.';
    }
  }

  ambient3dRuntime?.updateVerdict(probabilities);
  if (dom.reasonList) {
    const reasons = buildReasonList(features);
    dom.reasonList.innerHTML = reasons.map((item) => `<li>${item}</li>`).join('');
  }
}

async function runPredictionFromSelected() {
  if (!state.selectedKoi) return;

  const vector = FEATURE_ORDER.map((feature) => state.selectedKoi[feature]);
  const result = await predictFromFeatures(vector);
  applyVerdictToUi(result, state.selectedKoi.koi_disposition);
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

  if (dom.leaderboardList) {
    dom.leaderboardList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const name = target.getAttribute('data-quick-select');
      if (!name) return;
      const picked = state.koiRecords.find((row) => row.kepoi_name === name);
      if (!picked) return;
      state.selectedKoi = picked;
      state.inference = null;
      transitionTo(SCREENS.TRANSIT_VIEW);
    });
  }

  dom.runAiButton.addEventListener('click', async () => {
    await runPredictionFromSelected();
    transitionTo(SCREENS.AI_VERDICT);
  });

  if (dom.toggleTimeline) {
    dom.toggleTimeline.addEventListener('click', () => {
      state.timeline.paused = !state.timeline.paused;
      syncTimelineUi();
    });
  }

  if (dom.timelineScrubber) {
    dom.timelineScrubber.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      state.timeline.phase = clamp(safeNumber(target.value, 0) / 1000, 0, 1);
      if (state.selectedKoi) {
        renderTransitCurve(state.selectedKoi);
      }
      syncTimelineUi();
    });
  }

  if (dom.timelineSpeed) {
    dom.timelineSpeed.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      state.timeline.speedMultiplier = clamp(safeNumber(target.value, 1), 0.2, 2.4);
      syncTimelineUi();
    });
  }

  if (dom.cameraFocusButton) {
    dom.cameraFocusButton.addEventListener('click', () => {
      applyCameraMode('focus');
    });
  }
  if (dom.cameraCinematicButton) {
    dom.cameraCinematicButton.addEventListener('click', () => {
      applyCameraMode('cinematic');
    });
  }
  if (dom.ambienceSlider) {
    dom.ambienceSlider.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      state.view.ambience = clamp(safeNumber(target.value, 1), 0.4, 1.8);
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && state.activeScreen === SCREENS.TRANSIT_VIEW) {
      event.preventDefault();
      state.timeline.paused = !state.timeline.paused;
      syncTimelineUi();
    }
  });

  window.addEventListener('resize', () => {
    syncCatalogColumnHeights();
  });

  window.addEventListener('hashchange', () => {
    syncScreenFromRoute();
  });
}

async function initialize() {
  state.activeScreen = getScreenFromHash();
  syncRouteFromScreen(state.activeScreen, { replace: true });
  bindEvents();
  initAmbient3d();
  renderDataExplain();
  renderScreens();
  observeRevealElements();
  syncTimelineUi();
  applyCameraMode('focus');
  if (dom.verdictSummary) {
    dom.verdictSummary.textContent = 'What this means will appear here after analysis.';
  }
  if (dom.verdictWarning) {
    dom.verdictWarning.textContent = 'No uncertainty warning yet.';
  }

  await loadKoiData();
  renderStarList();
  renderMissionInsights();
  renderIntroTicker();
  const initialTint = state.koiRecords[0]?.starColor || '#8fb8ff';
  ambient3dRuntime?.tint(initialTint);
  setStatusPill();
}

initialize().catch((error) => {
  console.error(error);
  dom.statusPill.textContent = `Initialization failed: ${error.message}`;
});
