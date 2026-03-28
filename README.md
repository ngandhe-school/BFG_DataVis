# Stellar Fingerprints (Phase 1 Implementation)

An AI-powered exoplanet transit explorer using NASA KOI data, Three.js, D3.js, and TensorFlow.js (browser-side inference).

## Implemented now

- `stellar-fingerprints.html`: single-page UI shell with 5 screens.
- `app.js`: screen state machine, data loading (live/cached/fallback), 3D star scene, transit curve synthesis, and draw-mode prediction flow.
- `data/koi_sample.json`: real KOI fallback dataset fetched from NASA TAP.
- `model/model-metadata.json`: feature/class/scaler contract for preprocessing parity.
- `training/train_koi_model.py`: offline model training/export script.
- `training/README.md`: training and conversion instructions.

## Run locally

From this project root:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/stellar-fingerprints.html`

## Runtime behavior

- Attempts live KOI query through NASA TAP first.
- Falls back to local cache if present.
- Falls back to `data/koi_sample.json` if network query fails.
- Attempts to load `model/model.json` for inference.
- If model is unavailable, uses a heuristic fallback to keep the UI/demo path functional.

## Next implementation targets

1. Replace heuristic inference with exported TF.js model files.
2. Add higher-fidelity shaders and synchronized transit timeline controls.
3. Add accessibility and mobile performance refinements.