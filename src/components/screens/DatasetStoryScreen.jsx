export default function DatasetStoryScreen() {
  return (
    <section id="screen-dataset-story" className="screen dataset-screen">
      <p className="hero-overline" data-reveal>Dataset Story</p>
      <h2 data-reveal data-reveal-delay="40">How Detection Bias Shapes Discovery</h2>
      <p className="caption" data-reveal data-reveal-delay="80">
        This project uses NASA Exoplanet Archive Kepler candidate records. Each row is a candidate signal from
        starlight dips, not a direct telescope image of a planet. The core story is simple: easier signals get found first.
      </p>

      <div className="dataset-flow">
        <article data-reveal data-reveal-delay="120">
          <h3>Source</h3>
          <p>
            Kepler monitored stellar brightness over time. The archive stores KOI records with derived parameters
            including orbital period, transit depth, transit duration, stellar temperature, and planet radius estimates.
          </p>
        </article>
        <article data-reveal data-reveal-delay="180">
          <h3>What A Row Means</h3>
          <p>
            A single KOI row describes one potential exoplanet signal around one host star. Labels like confirmed,
            candidate, and false positive are confidence checkpoints, not final truth for every signal.
          </p>
        </article>
        <article data-reveal data-reveal-delay="240">
          <h3>Core Story</h3>
          <p>
            The visualization highlights detectability bias: short-period, deeper transits are easier to detect, so they
            appear more often and with stronger confidence in exploratory AI predictions.
          </p>
        </article>
        <article data-reveal data-reveal-delay="300">
          <h3>How To Read This App</h3>
          <p>
            Start in Star Select for sample-level patterns, inspect one target in Transit View, then open Signal Story for a
            plain-language interpretation of why the signal looks strong or uncertain.
          </p>
        </article>
      </div>

      <p className="caption dataset-caveat" data-reveal data-reveal-delay="340">
        Scientific note: these views are educational and exploratory. They should support understanding, not replace
        peer-reviewed validation pipelines.
      </p>
      <div className="screen-actions" data-reveal data-reveal-delay="380">
        <button className="secondary" data-nav="STAR_SELECT">Continue to Star Select</button>
      </div>
    </section>
  );
}
