## Plan: Stellar Fingerprints End-to-End Blueprint

Build a single-page, CDN-only web app with four runtime layers (UI, ML, data, 3D scene), while doing offline model preparation beforehand. The fastest reliable path is to lock a strict data contract first, prepare a compact TensorFlow.js model with scaler metadata, then implement state-driven UI screens that orchestrate Three.js + D3 + inference with graceful fallback data.

**Steps**
1. Phase 0 - Pre-hackathon Assets and Contracts (blocking foundation)
2. Define the canonical feature schema and label mapping used everywhere: features in order = koi_period, koi_depth, koi_duration, koi_prad, koi_teq, koi_steff, koi_srad; classes in order = CANDIDATE, CONFIRMED, FALSE POSITIVE. Save this as model metadata so browser inference uses the exact same ordering and scaling as training. This prevents silent model drift. (blocks all later ML work)
3. Train and export the classifier offline with reproducible scripts, including: missing-value imputation strategy, standardization stats, class weights for imbalance, and held-out metrics. Export TF.js model plus metadata JSON (means, std devs, class names, training date, validation accuracy). (depends on 1)
4. Curate a fallback KOI sample JSON (150 to 250 rows) with only required columns and precomputed display-friendly fields (spectral class, star color, normalized depth). This allows instant demos if API is slow or blocked. (parallel with 3)
5. Phase 1 - App Skeleton and Screen State Machine
6. Create a single-screen shell with a deterministic state machine for the 5 screens: INTRO, STAR_SELECT, TRANSIT_VIEW, AI_VERDICT, DRAW_MODE. Centralize transitions and guard conditions so each view can be tested independently. (depends on 1)
7. Establish shared app state store for selected KOI record, transit animation time, inference result, draw features, loading/error flags, and active data source (live API or fallback). Keep rendering layers as subscribers to state updates. (depends on 6)
8. Implement dark-space visual system tokens (color variables, spacing scale, typography setup with Boska/Satoshi), responsive layout breakpoints, keyboard navigation order, and reduced-motion branch. (parallel with 7)
9. Phase 2 - Data Layer and Transit Synthesis
10. Implement NASA TAP client for synchronous JSON ADQL queries against cumulative table, with timeout, retry (exponential backoff), and query limiting (TOP 50 or paged fetch). Support sort/filter by spectral class and score. (depends on 7)
11. Add data normalization pipeline: null-safe parsing, unit handling, clamping outliers, and derived fields. Use koi_steff to map spectral class O/B/A/F/G/K/M and visual color. (depends on 10)
12. Build transit synthesis utility that converts KOI period, depth, and duration into a synthetic light-curve dip waveform used for animation and D3 display. This fills the gap that cumulative table does not provide raw cadence arrays. (depends on 11)
13. Wire fallback strategy hierarchy: live TAP success -> cached live data -> bundled sample data, with explicit UI badge showing current source. (depends on 10; parallel with 12)
14. Phase 3 - 3D Scene and Chart Layer
15. Implement Three.js scene module: star sphere shader, corona shell with additive blending, orbiting planet marker, and background starfield. Bind star radius and color from selected KOI. (depends on 11)
16. Implement D3 light-curve component with animated dip, axis labels, hover tooltip, and scrubber synchronized to planet transit animation. (depends on 12)
17. Synchronize timeline controller so Three.js transit and D3 curve stay frame-aligned, including pause/resume and replay controls. (depends on 15 and 16)
18. Phase 4 - ML Inference and Draw Mode
19. Load TF.js model lazily when entering AI_VERDICT or DRAW_MODE. Apply the same scaler metadata before prediction, then map softmax outputs to disposition labels and confidence percentages. (depends on 3 and 7)
20. AI Verdict screen: show predicted class, confidence bars, confidence calibration text, and quick comparison against NASA disposition for selected KOI. (depends on 19)
21. Draw Mode: canvas-based dip sketcher with smoothing, clear/reset, and feature extraction (depth, dip width duration proxy, repeat-spacing period proxy, plus astrophysical placeholders for prad/teq/steff/srad defaults or sliders). Feed into same model pipeline. (depends on 19)
22. Add model safety guards: out-of-distribution warnings when user-drawn features exceed training ranges, and confidence floor messaging to avoid overclaiming. (depends on 21)
23. Phase 5 - Performance, QA, and Demo Readiness
24. Optimize runtime: limit geometry complexity on mobile, dynamic pixel ratio, requestAnimationFrame throttling when tab hidden, and deferred model/data fetch. Target smooth 60 fps desktop and acceptable 30 fps mobile. (depends on 17 and 21)
25. Add robust error UX: API/network/model failures with retry, source fallback messaging, and non-blocking toasts for recoverable issues. (depends on 13 and 19)
26. Validate accessibility and responsiveness: keyboard-only flow through all 5 screens, screen-reader labels for controls/canvas, sufficient contrast, and landscape/portrait mobile checks. (depends on 8 and 25)
27. Final demo packaging: static hosting setup, preflight checklist, and scripted demo path (best KOI examples + draw examples) for consistent judging presentation. (depends on all prior phases)

**Relevant files**
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/stellar-fingerprints.html - single entry page, five-screen shell, shared script/style includes
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/app.js - orchestration of state machine, data flow, scene/chart/model integration
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/model/model.json - TensorFlow.js architecture
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/model/group1-shard1of1.bin - model weights
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/model/model-metadata.json - scaler stats, feature order, class map, training metrics
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/data/koi_sample.json - bundled fallback KOI dataset
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/training/train_koi_model.py - offline training and export script
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/training/README.md - reproducible training instructions
- /Users/nishanthgandhe/College_Classes/Misc/BFG_DataVis/README.md - project setup, run instructions, API caveats, and demo script

**Verification**
1. Data query check: run the TAP request for top KOIs and confirm all required columns are present and non-null-enough for inference after imputation.
2. Contract check: unit-test that browser preprocessing reproduces Python preprocessing for the same sample row within numeric tolerance.
3. Model check: evaluate confusion matrix and macro F1 on held-out set; confirm class ordering in browser matches metadata exactly.
4. UI flow check: manually complete INTRO -> STAR_SELECT -> TRANSIT_VIEW -> AI_VERDICT -> DRAW_MODE without dead-end transitions.
5. Sync check: verify transit animation and D3 dip remain synchronized over repeated play/pause cycles.
6. Draw-mode check: feed known synthetic dips and verify extracted features move predictions in expected direction (deeper/longer dip should generally increase transit-like confidence).
7. Failure check: force API timeout and model load failure; ensure fallback data and user messaging keep app usable.
8. Performance check: profile desktop and mobile, confirm frame rate targets and acceptable load times.
9. Accessibility check: keyboard-only traversal, focus visibility, screen-reader labels, and reduced-motion behavior.
10. Demo check: run full scripted demo in under 4 minutes with one live KOI and one custom drawing.

**Decisions**
- Included: fully client-side inference, live TAP querying, 3D + chart synchronized visualization, and draw-your-own classification.
- Included: offline pretraining pipeline to keep runtime lightweight and hackathon reliable.
- Excluded: backend services, user accounts, persistent cloud storage, and real-time collaborative editing.
- Excluded for v1: physically exact raw Kepler cadence rendering; v1 uses scientifically grounded synthetic transit reconstruction from KOI summary fields.
- Assumption: if direct browser CORS fails for TAP, fallback dataset ensures uninterrupted demo while proxy option remains optional enhancement.

**Further Considerations**
1. Recommended model strategy: start with dense tabular classifier for reliability; optionally add a second sketch-specific model later if draw-mode realism needs improvement.
2. Recommended timeline split for team of 2 to 4: one person on Three.js/UI, one on data+D3, one on ML+draw mode, one on integration/testing.
3. Recommended judging narrative: emphasize that users are applying the same transit-signal reasoning pipeline NASA uses, then show AI uncertainty transparently.