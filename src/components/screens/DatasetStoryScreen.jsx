export default function DatasetStoryScreen() {
  return (
    <section id="screen-dataset-story" className="screen dataset-screen">

      {/* Section A: Mission Context */}
      <div className="story-section" data-reveal>
        <p className="hero-overline">The Kepler Mission</p>
        <h2 data-reveal data-reveal-delay="40">9 Years of Staring at Stars</h2>
        <p className="caption dataset-intro-text" data-reveal data-reveal-delay="80">
          In March 2009, NASA launched the Kepler Space Telescope with a single, audacious goal:
          find Earth-sized planets orbiting other stars. For over four years, Kepler stared at a
          single patch of sky in the constellation Cygnus, monitoring the brightness of more than
          150,000 stars simultaneously &mdash; watching for the tiny, periodic dips that betray a
          planet crossing in front of its host star.
        </p>
        <p className="caption dataset-intro-text" data-reveal data-reveal-delay="120">
          The method is called <strong>transit photometry</strong>: when a planet passes between us
          and its star, the star dims by a fraction of a percent. Earth blocking the Sun, for
          instance, would cause a dip of just 0.008%. Kepler was sensitive enough to detect even
          fainter signals, but that sensitivity came with a catch &mdash; not all planets produce
          equally detectable transits.
        </p>
        <div className="mission-stats" data-reveal data-reveal-delay="160">
          <div className="mission-stat">
            <span className="stat-value" id="stat-years">9+</span>
            <span className="stat-label">Years of data</span>
          </div>
          <div className="mission-stat">
            <span className="stat-value" id="stat-confirmed">2,700+</span>
            <span className="stat-label">Confirmed planets</span>
          </div>
          <div className="mission-stat">
            <span className="stat-value" id="stat-candidates">4,000+</span>
            <span className="stat-label">Planet candidates</span>
          </div>
          <div className="mission-stat">
            <span className="stat-value" id="stat-stars">150,000+</span>
            <span className="stat-label">Stars monitored</span>
          </div>
        </div>
      </div>

      {/* Section B: Understanding the Data */}
      <div className="story-section" data-reveal data-reveal-delay="80">
        <h2>What Each Measurement Tells Us</h2>
        <p className="caption dataset-intro-text">
          The dataset used in this project is the Kepler Cumulative Table of Kepler Objects of
          Interest (KOIs) from NASA&apos;s Exoplanet Archive. Each row represents a transit signal
          detected by the Kepler pipeline. Here are the eight fields we use and why each matters
          for understanding planet detectability.
        </p>
        <div className="field-glossary" id="field-glossary">
          <div className="field-card" data-reveal data-reveal-delay="100">
            <h4>koi_period</h4>
            <span className="field-unit">days</span>
            <p>How long the planet takes to complete one orbit. Shorter periods mean more transits
              observed during Kepler&apos;s mission, making confirmation far easier.</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="120">
            <h4>koi_depth</h4>
            <span className="field-unit">ppm (parts per million)</span>
            <p>How much the star dims during a transit. Deeper dips produce stronger signals with
              higher signal-to-noise ratios, but very deep dips can also indicate eclipsing binary
              stars rather than planets.</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="140">
            <h4>koi_duration</h4>
            <span className="field-unit">hours</span>
            <p>How long the transit event lasts. Duration helps distinguish central transits from
              grazing ones and constrains the planet&apos;s orbital geometry.</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="160">
            <h4>koi_prad</h4>
            <span className="field-unit">Earth radii</span>
            <p>Estimated planet radius derived from the transit depth and the host star&apos;s size.
              Larger planets block more light and are easier to detect, but smaller rocky worlds
              are more scientifically valuable.</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="180">
            <h4>koi_teq</h4>
            <span className="field-unit">Kelvin</span>
            <p>Equilibrium temperature &mdash; a rough estimate of the planet&apos;s surface
              conditions assuming no atmosphere. Used as a habitability proxy:
              250&ndash;320 K is the &ldquo;Goldilocks zone.&rdquo;</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="200">
            <h4>koi_steff</h4>
            <span className="field-unit">Kelvin</span>
            <p>Effective temperature of the host star. Determines spectral class, luminosity,
              and how much energy the planet receives. Sun-like stars sit around 5,778 K.</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="220">
            <h4>koi_srad</h4>
            <span className="field-unit">Solar radii</span>
            <p>Radius of the host star relative to our Sun. Combined with transit depth, this
              sets the scale for planet size estimation. Larger stars make small planets harder
              to detect.</p>
          </div>
          <div className="field-card" data-reveal data-reveal-delay="240">
            <h4>koi_disposition</h4>
            <span className="field-unit">label</span>
            <p>NASA&apos;s classification of each signal: Confirmed (real planet), Candidate
              (promising but unverified), or False Positive (likely not a planet). This label
              is the ground truth our analysis tries to understand.</p>
          </div>
        </div>
      </div>

      {/* Section C: The Detection Bias Story */}
      <div className="story-section" data-reveal data-reveal-delay="60">
        <h2>Not Every Planet Gets Found Equally</h2>
        <p className="caption dataset-intro-text">
          Transit photometry has a built-in observational bias: planets that orbit quickly and block
          more starlight are dramatically easier to detect and confirm. A planet with a 3-day orbit
          will transit dozens of times during Kepler&apos;s 4-year primary mission, each transit
          reinforcing the signal. A planet with a 400-day orbit might transit only 3&ndash;4 times
          &mdash; barely enough to establish a pattern.
        </p>
        <p className="caption dataset-intro-text" data-reveal data-reveal-delay="80">
          Similarly, the signal-to-noise ratio scales with transit depth. A Jupiter-sized planet
          blocking 1% of its star&apos;s light produces a signal that is 100x stronger than an
          Earth-sized planet blocking 0.01%. The result: our confirmed planet catalog is heavily
          skewed toward hot Jupiters and short-period super-Earths &mdash; not because these are
          the most common planets, but because they are the easiest to find.
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
      </div>

      {/* Section D: Try It Yourself - Draw a Light Curve */}
      <div className="story-section" data-reveal data-reveal-delay="60">
        <h2>Try It Yourself</h2>
        <p className="caption dataset-intro-text">
          Draw a transit dip on the canvas below. Sketch how much light you think a planet would
          block as it crosses its star. The app will interpret your drawing and estimate what kind
          of planet could cause that signal.
        </p>
        <div className="draw-canvas-wrap" data-reveal data-reveal-delay="100">
          <div className="draw-canvas-area">
            <canvas id="draw-lightcurve-canvas" width="480" height="200" />
            <div className="draw-canvas-labels">
              <span className="draw-label-y">Brightness</span>
              <span className="draw-label-x">Time &rarr;</span>
            </div>
          </div>
          <div className="draw-controls">
            <button className="secondary" id="btn-draw-reset">Reset Canvas</button>
            <button id="btn-draw-analyze">Analyze My Drawing</button>
          </div>
          <div id="draw-result-panel" className="draw-result-panel" />
        </div>
      </div>

      {/* Section E: Habitable Zone Explorer */}
      <div className="story-section" data-reveal data-reveal-delay="60">
        <h2>Habitable Zone Explorer</h2>
        <p className="caption dataset-intro-text">
          Adjust the star&apos;s temperature and size to see how the habitable zone shifts. Planets
          from the dataset are plotted by their equilibrium temperature &mdash; see which ones fall
          in the &ldquo;Goldilocks zone&rdquo; where liquid water could exist.
        </p>
        <div className="hz-explorer" data-reveal data-reveal-delay="100">
          <div className="hz-controls">
            <label className="hz-slider-label">
              <span>Star Temperature</span>
              <span className="hz-slider-value" id="hz-temp-value">5778 K</span>
              <input id="hz-temp-slider" type="range" min="2500" max="8000" step="50" defaultValue="5778" />
            </label>
            <label className="hz-slider-label">
              <span>Star Radius</span>
              <span className="hz-slider-value" id="hz-radius-value">1.00 R&#x2609;</span>
              <input id="hz-radius-slider" type="range" min="0.4" max="2.5" step="0.05" defaultValue="1.0" />
            </label>
          </div>
          <div id="hz-strip-container" className="hz-strip-container" />
          <p className="caption hz-counter" id="hz-counter">Calculating habitable zone...</p>
        </div>
      </div>

      {/* Section F: Closing */}
      <div className="story-section" data-reveal data-reveal-delay="60">
        <div className="dataset-flow">
          <article data-reveal data-reveal-delay="80">
            <h3>What This Means for Discovery</h3>
            <p>
              Our confirmed exoplanet catalog is a biased sample of reality. Planets that orbit
              quickly and block more light are dramatically overrepresented. The universe almost
              certainly holds billions of Earth-like planets in temperate orbits around Sun-like
              stars &mdash; worlds that are simply too subtle for Kepler&apos;s transit method to
              reliably detect. Understanding this bias is the first step toward correcting for it,
              and future missions like JWST and PLATO are designed to push into the parameter space
              Kepler could not reach.
            </p>
          </article>
          <article data-reveal data-reveal-delay="140">
            <h3>How To Explore</h3>
            <p>
              Select a star in the catalog, watch its transit in 3D, read its dossier,
              then see what the AI model thinks. Each step adds a layer of understanding
              to how we evaluate these faint signals from distant worlds.
            </p>
          </article>
        </div>

        <p className="caption dataset-caveat" data-reveal data-reveal-delay="180">
          These views are educational and exploratory &mdash; they support understanding, not replace peer-reviewed validation.
        </p>
        <div className="screen-actions" data-reveal data-reveal-delay="220">
          <button className="secondary" data-nav="STAR_SELECT">Explore the Catalog</button>
          <button className="secondary" data-nav="AI_VERDICT">See Signal Story</button>
        </div>
      </div>
    </section>
  );
}
