# Stellar Fingerprints (Phase 1+ Experience)

Stellar Fingerprints is a browser-only space data story app built on real NASA Kepler KOI records.  
It combines cinematic Three.js rendering, synchronized D3 transit visualization, and in-browser ML inference.

## What is improved

- **Stronger data storytelling:** intro KPI cards and mission insight bullets summarize trends in the currently loaded dataset (live, cached, or fallback).
- **Exceptional 3D UI pass:** upgraded star scene with animated stellar shader, nebula backdrop, plasma shell, dual orbit rings, moving orbit arc, asteroid belt, comet with dynamic tail, moon system, galaxy sprites, shockwave pulses, dust field, and mouse-parallax camera movement.
- **Transit synchronization controls:** interactive timeline scrubber, pause/play, speed control, and phase chips synchronized between 3D planet motion and light-curve chart.
- **Clearer scientific framing:** per-star transit narrative text translates raw depth/period/duration numbers into understandable plain-language story cues.
- **Exploration-focused selection cards:** KOI cards now expose signal style (subtle/moderate/high-contrast dip) and orbit pacing.
- **Hackathon storytelling layer:** guided story mode, period-distribution mini chart, uncertainty warning text, and explainable verdict reasoning bullets.
- **3D throughout the site:** persistent full-page Three.js cosmos background plus mini 3D modules embedded in Intro, Star Select, AI Verdict, and Draw Mode.

## Main files

- `src/App.jsx`: React app shell composed from reusable screen components.
- `src/components/`: reusable layout/screen React components.
- `src/hooks/useLegacyStellarApp.js`: one-time legacy engine bootstrap hook.
- `app.js`: runtime engine (state machine, Three.js scenes, D3, TensorFlow.js inference).
- `data/koi_sample.json`: bundled KOI fallback sample for offline demo reliability.
- `model/model-metadata.json`: feature/class/scaler contract used by browser preprocessing.
- `training/train_koi_model.py`: offline training script.
- `training/README.md`: model preparation and conversion instructions.

## Run locally (React + Vite)

```bash
npm install
npm run dev
```

Open:

- `http://localhost:5173`

## Playwright CLI integration

This repo now includes local `@playwright/cli` integration for browser automation and agent workflows.

Setup:

```bash
npm run pw:skills
```

Common commands:

```bash
npm run pw:open
npm run pw:snapshot
npm run pw:screenshot
npm run pw:console
npm run pw:network
npm run pw:close
```

Notes:
- Default session name is `sf` (shortened to avoid macOS unix socket path length issues).
- Default Playwright CLI config lives at `.playwright/cli.config.json`.
- Project-wide agent guidance is in `.cursor/rules/playwright-cli-workflow.mdc`.

Troubleshooting (macOS):
- If you see `listen EINVAL ... .sock`, run:

```bash
npm run pw:open:fallback
```

## Runtime behavior

1. Tries live KOI query from NASA Exoplanet Archive TAP.
2. If live fetch fails, falls back to cached local payload.
3. If cache is missing, uses `data/koi_sample.json`.
4. Attempts to load `model/model.json`; if unavailable, uses heuristic inference fallback so demo flow remains uninterrupted.

## Suggested next upgrades

1. Add voiceover-style scripted narration synced to guided story chapters.
2. Include mission-history overlays (yearly discovery context) in the period-distribution chart.
3. Add mobile-specific adaptive 3D quality presets for older devices.
