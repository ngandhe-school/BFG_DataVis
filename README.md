# Stellar Fingerprints

Stellar Fingerprints is a browser-based exoplanet storytelling app built on NASA Kepler KOI data.  
It combines a React UI shell with a runtime engine for Three.js visuals, D3-based transit views, and in-browser TensorFlow.js inference.

## Features

- Interactive multi-screen mission flow for exploration and explanation.
- Synchronized 3D transit scene and light-curve behavior.
- AI verdict narrative with uncertainty messaging.
- Resilient data loading path (live API -> local fallback).

## Quick Start

```bash
npm install
npm run dev
```

App URL: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Playwright CLI (optional)

```bash
npm run pw:skills
npm run pw:open
npm run pw:snapshot
npm run pw:screenshot
npm run pw:console
npm run pw:network
npm run pw:close
```

Fallback for macOS socket path issues:

```bash
npm run pw:open:fallback
```

## Project Structure

```text
BFG_DataVis/
├── src/                         # React app shell and styles
│   ├── components/
│   ├── hooks/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── app.js                       # Runtime engine (Three.js, D3, TF.js, state machine)
├── data/                        # Local fallback dataset
├── model/                       # Model metadata / TF.js model artifacts
├── training/                    # Offline training pipeline
├── docs/
│   ├── planning/                # Planning and blueprint docs
│   └── legacy/                  # Archived legacy entry files
├── index.html
├── vite.config.js
└── package.json
```

## Runtime Behavior

1. Attempts live NASA Exoplanet Archive KOI fetch.
2. Falls back to bundled sample data when needed.
3. Loads model metadata and attempts TF.js model load.
4. Uses heuristic fallback when model artifacts are unavailable.
