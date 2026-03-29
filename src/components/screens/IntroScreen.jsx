export default function IntroScreen() {
  return (
    <section id="screen-intro" className="screen intro intro-screen">
      <div className="intro-shell intro-shell-cinematic" data-reveal>
        <div className="intro-hero-wrap">
          <div className="intro-hero-left" data-reveal data-reveal-delay="40">
            <p className="hero-overline">A NASA Kepler Data Story</p>
            <h2>
              Not Every Planet Gets <span>Discovered</span> Equally
            </h2>
            <p className="intro-sub">
              Of the thousands of signals Kepler recorded, only some became confirmed worlds.
              Explore the hidden bias in how we find new planets — and why the easiest signals
              get found first.
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
            <h4>See the Transit</h4>
            <p className="caption">Watch a planet cross its star in 3D, synchronized to real NASA measurements.</p>
          </article>
          <article className="showcase-card" data-reveal data-reveal-delay="220">
            <h4>Understand the Bias</h4>
            <p className="caption">Discover why short-period, deep-dip signals dominate our confirmed planet catalog.</p>
          </article>
          <article className="showcase-card" data-reveal data-reveal-delay="280">
            <h4>Read the Verdict</h4>
            <p className="caption">An AI model interprets each signal — with plain-language reasoning you can follow.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
