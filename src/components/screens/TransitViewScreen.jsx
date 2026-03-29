export default function TransitViewScreen() {
  return (
    <section id="screen-transit-view" className="screen transit-screen">
      <h2 data-reveal>Transit View</h2>
      <p className="caption" data-reveal data-reveal-delay="40">3D star rendering and synthesized transit curve from KOI parameters.</p>
      <div className="grid-two">
        <div className="panel" data-reveal data-reveal-delay="100">
          <div id="three-root" aria-label="3D star visualization" />
          <div id="size-comparison" className="size-comparison" aria-label="Planet size relative to Earth" />
          <div id="selected-meta" className="meta-grid" style={{ marginTop: 12 }} />
        </div>
        <div className="panel" data-reveal data-reveal-delay="140">
          <div id="lightcurve-chart" />
          <div className="transit-controls">
            <div className="control-row">
              <button className="secondary" id="btn-toggle-timeline">Pause</button>
              <span className="control-chip" id="phase-chip">Phase 0.00</span>
              <span className="control-chip" id="speed-chip">Speed 1.0x</span>
            </div>
            <label className="caption">
              Timeline scrubber
              <input id="timeline-scrubber" type="range" min="0" max="1000" defaultValue="0" />
            </label>
            <label className="caption">
              Playback speed
              <input id="timeline-speed" type="range" min="0.2" max="2.4" step="0.1" defaultValue="1.0" />
            </label>
            <div className="control-row">
              <button className="secondary" id="btn-camera-focus">Focus Camera</button>
              <button className="secondary" id="btn-camera-cinematic">Cinematic Camera</button>
            </div>
            <label className="caption">
              Atmosphere intensity
              <input id="slider-ambience" type="range" min="0.4" max="1.8" step="0.05" defaultValue="1.0" />
            </label>
          </div>
          <p className="caption" id="transit-insight">
            Transit narrative will appear after selecting a star.
          </p>
        </div>
      </div>
      <div className="screen-actions" data-reveal data-reveal-delay="220">
        <button className="secondary" data-nav="STAR_SELECT">Choose Another Star</button>
        <button className="secondary" data-nav="DATA_EXPLAIN">Explain This Star</button>
        <button id="btn-run-ai">Run AI Verdict</button>
      </div>
    </section>
  );
}
