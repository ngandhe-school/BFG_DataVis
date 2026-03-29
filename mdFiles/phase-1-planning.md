## Stellar Fingerprints - Phase 1 Planning

Stellar Fingerprints is an AI-powered exoplanet transit detector that lets users explore real Kepler Objects of Interest (KOIs), visualize transit behavior, and receive in-browser AI classifications.

This document captures the planning baseline for Phase 1 and preserves core project decisions from the full blueprint.

## One-Line Pitch
An AI-powered exoplanet transit detector that lets users hunt for alien worlds using NASA-style light-curve analysis, visualized through an interactive 3D star experience.

## Product Goal
Build a single-page, browser-only experience with no required backend where users can:
- Explore real KOI stars and transit signals.
- Watch synchronized 3D and chart-based transit visualization.
- Get AI disposition predictions (CANDIDATE, CONFIRMED, FALSE POSITIVE).
- Draw their own transit dip and run the same classifier pipeline.

## Core Architecture (4 Layers)
1. Layer 1 - 3D Scene (Three.js)
- Procedural star surface with shaders.
- Corona/glow reacting to stellar temperature and spectral class.

2. Layer 2 - Data Layer (D3.js + NASA TAP)
- Animated/synthetic light-curve display.
- Real KOI metadata from NASA Exoplanet Archive TAP.

3. Layer 3 - ML Classifier (TensorFlow.js)
- Pretrained model loaded in-browser.
- No backend inference.

4. Layer 4 - UI Shell (HTML/CSS)
- Space aesthetic, Boska display + Satoshi body typography.
- State-driven 5-screen flow.

## User Flow (5 Screens)
1. INTRO
- Full-screen starfield and title reveal.

2. STAR SELECT
- Browse/filter KOIs by spectral class and score.

3. TRANSIT VIEW
- Observe transit animation with synchronized light curve.

4. AI VERDICT
- Display class prediction + confidence bars and NASA disposition comparison.

5. DRAW MODE
- User sketches a dip; extracted features are inferred by the same model.

## Data Source and API Contract
Primary source: NASA Exoplanet Archive TAP (table: cumulative)
- Base URL: https://exoplanetarchive.ipac.caltech.edu/TAP/sync
- Response format: json
- Example columns used:
  - kepid
  - kepoi_name
  - koi_disposition
  - koi_period
  - koi_depth
  - koi_duration
  - koi_prad
  - koi_teq
  - koi_steff
  - koi_srad
  - koi_score

Important implementation note:
- Cumulative KOI table provides summary transit parameters, not full cadence light-curve arrays.
- Phase 1 therefore plans to generate scientifically plausible synthetic transit dips from period, depth, and duration for animation.

## ML Planning Contract
Canonical model feature order (must match Python and browser exactly):
1. koi_period
2. koi_depth
3. koi_duration
4. koi_prad
5. koi_teq
6. koi_steff
7. koi_srad

Canonical label order:
1. CANDIDATE
2. CONFIRMED
3. FALSE POSITIVE

Model pipeline expectations:
- Offline training in Python.
- Export to TF.js model format.
- Include metadata with means/std, class map, training metrics, and preprocessing assumptions.
- Browser applies identical preprocessing before inference.

## Spectral Mapping for 3D Star Color
- O: >30000 K, #9bb0ff
- B: 10000-30000 K, #aabfff
- A: 7500-10000 K, #cad7ff
- F: 6000-7500 K, #f8f7ff
- G: 5200-6000 K, #fff4e8
- K: 3700-5200 K, #ffd2a1
- M: <3700 K, #ffcc6f

## Target File Structure (Execution Reference)
- stellar-fingerprints.html
- app.js
- model/model.json
- model/group1-shard1of1.bin
- model/model-metadata.json
- data/koi_sample.json
- training/train_koi_model.py
- training/README.md

## Phase 1 Scope (Planning Baseline)
Phase 1 focus: establish foundations that unblock all later implementation.

### Phase 1 Deliverables
1. Data and model contract finalized
- Feature order, class order, preprocessing rules frozen.

2. Offline model export package prepared
- TF.js model files + metadata JSON complete.

3. Fallback dataset prepared
- Curated KOI sample JSON for offline/slow API conditions.

4. Application skeleton and state machine designed
- Screen transitions and shared state shape defined.

5. API access strategy validated
- TAP query construction, timeout/retry, and source fallback policy documented.

### Phase 1 Acceptance Criteria
- A single source-of-truth contract exists for features, labels, and preprocessing.
- Browser inference can be validated against Python preprocessing numerically.
- A fallback KOI dataset is available and compatible with the same data shape.
- Screen-state transition map is deterministic with no dead-end routes.
- API failure path still leaves app demo-capable through fallback data.

## Risks and Mitigations (Phase 1)
1. API reliability/CORS variability
- Mitigation: fallback bundled data and optional proxy strategy.

2. Model-data mismatch
- Mitigation: metadata-driven preprocessing contract and parity checks.

3. Overconfidence in draw-mode predictions
- Mitigation: out-of-distribution detection and confidence-floor messaging.

4. Mobile performance constraints
- Mitigation: lazy loading, reduced geometry detail, and deferred heavy assets.

## Verification Checklist for Phase 1 Exit
1. TAP query returns all required columns in expected types.
2. Sample KOI row can pass through parsing/normalization without manual fixes.
3. Python and browser preprocessing parity test passes within tolerance.
4. TF.js model loads and returns probability vector of length 3.
5. Fallback data loads when network/API is unavailable.
6. State machine map covers all 5 screens and valid transitions.

## Scope Boundaries
Included in Phase 1:
- Planning contracts, model/package prep, data fallback strategy, app state design.

Excluded from Phase 1:
- Final shader polish, full UI polish, full accessibility pass, final performance tuning.
- Backend services, auth, persistent user storage.

## Current Phase 1+ Implementation Snapshot
- Data-source resilience is active (live NASA TAP -> cache -> bundled fallback).
- 5-screen deterministic state-machine flow is implemented end-to-end.
- Enhanced 3D star experience now includes shader-driven star surface, orbit context ring, nebula background, and bloom pass.
- Transit chart now supports synchronized playhead + timeline controls (scrub, speed, pause/play) aligned with 3D motion.
- Narrative-first UX is added through mission insight cards and plain-language transit explanations.

## Decision Log Snapshot
- Runtime architecture remains frontend-only (CDN libs + static assets).
- KOI cumulative remains primary source for live data.
- Synthetic transit reconstruction is accepted for v1 visualization realism.
- Dense tabular classifier is preferred for reliability in hackathon timeline.
