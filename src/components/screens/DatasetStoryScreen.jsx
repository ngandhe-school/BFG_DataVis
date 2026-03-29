export default function DatasetStoryScreen() {
  return (
    <section id="screen-dataset-story" className="screen dataset-screen">
      <p className="hero-overline" data-reveal>The Data Behind the Discovery</p>
      <h2 data-reveal data-reveal-delay="40">Not Every Planet Gets Found Equally</h2>
      <p className="caption dataset-intro-text" data-reveal data-reveal-delay="80">
        NASA's Kepler telescope monitored starlight for years, looking for tiny dips caused by planets crossing in front of their stars.
        But the method has a built-in bias: some signals are far easier to spot than others.
      </p>

      <div id="dataset-key-finding" className="key-finding" data-reveal data-reveal-delay="120" />

      <div className="dataset-charts-row">
        <div className="dataset-chart-wrap" data-reveal data-reveal-delay="160">
          <h3>Signal Outcomes</h3>
          <p className="caption">How are these candidate signals classified?</p>
          <div id="disposition-chart" />
        </div>
        <div className="dataset-chart-wrap" data-reveal data-reveal-delay="220">
          <h3>The Bias Pattern</h3>
          <p className="caption">Short-period, deep-dip signals dominate confirmed detections.</p>
          <div id="bias-scatter" />
        </div>
      </div>

      <div className="dataset-flow">
        <article data-reveal data-reveal-delay="280">
          <h3>What This Means</h3>
          <p>
            Planets that orbit quickly and block more light are dramatically easier to confirm.
            This doesn't mean they're more common — just more visible to our instruments.
            The universe likely holds far more worlds than we've confirmed.
          </p>
        </article>
        <article data-reveal data-reveal-delay="340">
          <h3>How To Explore</h3>
          <p>
            Select a star in the catalog, watch its transit in 3D, read its dossier,
            then see what the AI model thinks. Each step adds a layer of understanding
            to how we evaluate these faint signals from distant worlds.
          </p>
        </article>
      </div>

      <p className="caption dataset-caveat" data-reveal data-reveal-delay="380">
        These views are educational and exploratory — they support understanding, not replace peer-reviewed validation.
      </p>
      <div className="screen-actions" data-reveal data-reveal-delay="420">
        <button className="secondary" data-nav="STAR_SELECT">Explore the Catalog</button>
      </div>
    </section>
  );
}
