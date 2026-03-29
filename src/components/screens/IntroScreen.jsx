export default function IntroScreen() {
  return (
    <section id="screen-intro" className="screen intro intro-screen active">
      <div className="intro-shell intro-shell-cinematic" data-reveal>
        <div className="intro-hero-wrap">
          <div className="intro-hero-left" data-reveal data-reveal-delay="40">
            <p className="hero-overline">Kepler Dataset Story Explorer</p>
            <h2>
              Why We Detect Some <span>Worlds</span> More Than Others
            </h2>
            <p className="intro-sub">
              This project turns NASA Kepler candidate signals into a clear story about detectability bias. Explore how
              transit depth, period, and duration shape which worlds are discovered first.
            </p>
            <div className="btn-row hero-actions">
              <button id="btn-launch">Launch Mission</button>
              <button className="secondary" data-nav="DATASET_STORY">Read Dataset Story</button>
            </div>

            <div className="hero-kpis hero-kpis-cinematic">
              <article className="kpi-card" data-reveal data-reveal-delay="120">
                <span className="kpi-label">Signals analyzed</span>
                <span className="kpi-value" id="hero-coverage">Loading KOI sample...</span>
              </article>
              <article className="kpi-card" data-reveal data-reveal-delay="180">
                <span className="kpi-label">Science signal</span>
                <span className="kpi-value" id="hero-story">Finding strongest transit trends...</span>
              </article>
              <article className="kpi-card" data-reveal data-reveal-delay="240">
                <span className="kpi-label">Confirmed ratio</span>
                <span className="kpi-value" id="hero-confirmed">Calculating...</span>
              </article>
            </div>
          </div>

          <aside className="intro-brief panel-lite intro-brief-cinematic" data-reveal data-reveal-delay="100">
            <h3>Mission Brief</h3>
            <ol className="intro-list intro-list-numbered">
              <li>
                <strong>Discover</strong>
                <span>Scan light-curve telemetry for periodic dips in a star&apos;s fingerprint.</span>
              </li>
              <li>
                <strong>Inspect</strong>
                <span>Use Signal Story and 3D simulations to separate likely transits from uncertain signals.</span>
              </li>
              <li>
                <strong>Decide</strong>
                <span>Prioritize follow-up targets based on detectability, reliability, and scientific value.</span>
              </li>
            </ol>
          </aside>
          <div id="intro-orbit-root" className="intro-earth-stage" aria-hidden="true" />
        </div>

        <div className="mission-ticker panel-lite" data-reveal data-reveal-delay="120">
          <strong>Live Mission Feed:</strong>
          <span id="intro-fact-ticker">Booting discovery feed...</span>
        </div>

        <div className="showcase-grid cinematic-showcase">
          <article className="showcase-card" data-reveal data-reveal-delay="160">
            <h4>Immersive 3D Journey</h4>
            <p className="caption">Every screen includes live space visuals synchronized to real KOI values.</p>
          </article>
          <article className="showcase-card" data-reveal data-reveal-delay="220">
            <h4>Signal Story Engine</h4>
            <p className="caption">Narratives explain why each signal looks strong, weak, or uncertain for follow-up.</p>
          </article>
          <article className="showcase-card" data-reveal data-reveal-delay="280">
            <h4>Story-first Discovery</h4>
            <p className="caption">Clear narrative chapters translate scientific parameters into human-readable insights.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
