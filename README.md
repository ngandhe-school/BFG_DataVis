# Stellar Fingerprints

**An interactive data story about the hidden bias in how we discover new planets.**

Stellar Fingerprints transforms NASA's Kepler Space Telescope dataset into a cinematic, browser-based experience that guides non-scientists through the science of exoplanet detection — revealing why some planets are dramatically easier to find than others.

> Built for the BFG Hackathon 2026 — Space Data Visualization Track.

---

## The Story

NASA's Kepler mission stared at 150,000+ stars for over nine years, watching for the tiny brightness dips caused by planets crossing in front of their host stars. It confirmed 2,700+ exoplanets and flagged thousands more as candidates.

But the transit method has a fundamental observational bias: **planets that orbit fast and block more starlight are far easier to confirm.** An Earth-sized planet in a year-long orbit barely registers, while a hot Jupiter on a 3-day orbit transits dozens of times during the mission — each pass reinforcing the signal.

Stellar Fingerprints makes this bias visible and tangible. Users explore the Kepler dataset interactively, inspect individual star systems in 3D, draw their own transit signals, and see how an AI model interprets the evidence — all in the browser, with no backend required.

---

## Features

### Six-Screen Narrative Flow

| Screen | What It Does |
|---|---|
| **Mission Brief** | Cinematic intro with animated KPIs, live data ticker, and 3D Earth scene |
| **Star Select** | Filterable catalog of Kepler Objects of Interest with spectral class filtering, period distribution chart, and top-pick leaderboard |
| **Transit View** | Real-time 3D star system (Three.js) synchronized with a D3 light curve, timeline scrubber, planet-vs-Earth size comparison, and camera controls |
| **Star Dossier** | Field-by-field explanation of every measurement with plain-English "human scale" translations |
| **Dataset Story** | Rich narrative about the Kepler mission, interactive data visualizations, a draw-your-own-light-curve canvas, and a habitable zone explorer |
| **Signal Story** | AI verdict with confidence meter, feature-level reasoning, counterfactual analysis, and uncertainty messaging |

### Interactive Elements

- **Draw Your Own Light Curve** — Sketch a transit dip on an HTML5 Canvas. The app analyzes the shape, estimates planet type (Earth-like through Gas Giant), and runs the signal through the AI heuristic model.
- **Habitable Zone Explorer** — Adjust star temperature and radius with sliders to see how the habitable zone shifts. Dataset planets are plotted in real-time, colored by disposition.
- **3D Star System** — Cinematic Three.js scene with procedural star surfaces, planetary orbits, comet trails, asteroid belts, and pointer-reactive camera movement.
- **Timeline Controls** — Scrub through orbital phase, adjust playback speed, toggle camera modes (Focus / Cinematic), and control atmosphere intensity.

### Data & AI

- **Resilient data pipeline**: Live NASA Exoplanet Archive TAP query → localStorage cache → bundled fallback sample. The app always works, even offline.
- **In-browser ML inference**: TensorFlow.js model path with automatic fallback to a deterministic heuristic when model artifacts aren't available. Both paths produce identical UX.
- **Human-scale translations**: Every raw measurement (ppm, Kelvin, Earth radii, orbital days) gets a plain-English companion — "Like briefly dimming a room light by 0.05%", "About the size of Neptune's core", etc.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Shell | React 18 + Vite 5 |
| 3D Rendering | Three.js (procedural shaders, multi-scene architecture) |
| Data Visualization | D3.js (scatter plots, bar charts, histograms, SVG habitable zone) |
| ML Inference | TensorFlow.js (with heuristic fallback) |
| Canvas Interaction | HTML5 Canvas API (freehand drawing + signal analysis) |
| Typography | Boska (serif headings) + Satoshi (sans-serif body) via Fontshare |
| Deployment | Vercel (static SPA) |

**No backend. No API keys. Runs entirely in the browser.**

---

## Quick Start

```bash
git clone https://github.com/ngandhe-school/BFG_DataVis.git
cd BFG_DataVis
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

### Environment Variables (optional)

| Variable | Default | Description |
|---|---|---|
| `VITE_ENABLE_LIVE_API` | `false` | Set to `true` to fetch live data from NASA's Exoplanet Archive TAP service instead of using the bundled sample |

---

## Project Structure

```
BFG_DataVis/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppHeader.jsx          # Navigation bar with progress dots
│   │   └── screens/
│   │       ├── IntroScreen.jsx         # Mission Brief landing screen
│   │       ├── StarSelectScreen.jsx    # Filterable KOI catalog
│   │       ├── TransitViewScreen.jsx   # 3D scene + light curve
│   │       ├── DataExplainScreen.jsx   # Star Dossier with field glossary
│   │       ├── DatasetStoryScreen.jsx  # Narrative + interactive features
│   │       └── AIVerdictScreen.jsx     # Signal Story with AI analysis
│   ├── hooks/
│   │   └── useLegacyStellarApp.js      # Bridges React lifecycle to app.js
│   ├── App.jsx                         # Root component and screen stack
│   ├── main.jsx                        # React entry point
│   └── styles.css                      # Design system (tokens, layout, components)
├── app.js                              # Runtime engine: state, routing, 3D, D3, ML, events
├── public/
│   ├── data/
│   │   └── koi_sample.json             # Bundled fallback dataset (120 KOIs)
│   └── model/
│       └── model-metadata.json         # Feature order, scaler contract, class labels
├── data/
│   └── koi_sample.json                 # Source dataset
├── model/
│   └── model-metadata.json             # Source model metadata
├── training/
│   ├── train_koi_model.py              # Offline Keras training script
│   └── README.md                       # Training pipeline documentation
├── index.html                          # HTML entry with font imports
├── vite.config.js                      # Vite configuration
├── vercel.json                         # Vercel deployment config (SPA rewrites)
└── package.json
```

### Architecture

React provides the UI shell and screen structure. The runtime engine (`app.js`) handles all application behavior — state management, hash-based routing, data fetching, Three.js rendering, D3 chart rendering, Canvas interaction, and ML inference — by targeting DOM element IDs directly. This hybrid approach keeps 3D performance high while preserving React's component model for layout.

```
React (App.jsx)                    app.js (Runtime Engine)
┌─────────────────┐               ┌─────────────────────────┐
│ Screen JSX      │──── DOM IDs ──│ State Machine            │
│ (containers)    │               │ Hash Router              │
│                 │               │ Three.js (4 scenes)      │
│ AppHeader       │               │ D3 Charts                │
│ IntroScreen     │               │ Canvas Drawing           │
│ StarSelectScreen│               │ TF.js / Heuristic Model  │
│ TransitView     │               │ Habitable Zone Explorer  │
│ DataExplain     │               │ Event Binding            │
│ DatasetStory    │               │ Reveal Animations        │
│ AIVerdict       │               └─────────────────────────┘
└─────────────────┘
```

---

## Dataset

**Source**: [NASA Exoplanet Archive — Kepler Cumulative Table](https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=cumulative)

The app uses 8 fields per Kepler Object of Interest (KOI):

| Field | Unit | Description |
|---|---|---|
| `koi_period` | days | Orbital period |
| `koi_depth` | ppm | Transit depth (brightness drop) |
| `koi_duration` | hours | Transit crossing time |
| `koi_prad` | Earth radii | Estimated planet radius |
| `koi_teq` | Kelvin | Equilibrium temperature |
| `koi_steff` | Kelvin | Host star effective temperature |
| `koi_srad` | Solar radii | Host star radius |
| `koi_disposition` | label | NASA classification (Confirmed / Candidate / False Positive) |

The bundled sample contains 120 KOIs. When `VITE_ENABLE_LIVE_API=true`, the app queries the archive for the top 120 records sorted by `koi_score`.

---

## Deployment

The app is configured for Vercel static deployment:

```bash
npm run build    # outputs to dist/
```

The included `vercel.json` handles SPA routing and ensures static assets (`/data/*`, `/model/*`) are served directly while all other routes fall through to `index.html`.

---

## Credits

- **Data**: NASA Exoplanet Archive, Kepler Cumulative Table
- **Fonts**: [Boska](https://www.fontshare.com/fonts/boska) and [Satoshi](https://www.fontshare.com/fonts/satoshi) by Indian Type Foundry via Fontshare
- **Built with**: React, Vite, Three.js, D3.js, TensorFlow.js

---

## License

This project was built for the BFG Hackathon 2026 Space Data Visualization challenge.
