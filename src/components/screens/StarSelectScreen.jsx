export default function StarSelectScreen() {
  return (
    <section id="screen-star-select" className="screen catalog-screen">
      <h2 data-reveal>Catalog Objects</h2>
      <p className="caption" data-reveal data-reveal-delay="40">Refining candidate targets for transit analysis.</p>
      <div className="filters" data-reveal data-reveal-delay="80">
        <input id="search-koi" type="search" placeholder="Search KOI name" />
        <select id="filter-spectral" aria-label="Filter by spectral class">
          <option value="ALL">All Spectral Classes</option>
          <option value="O">O</option>
          <option value="B">B</option>
          <option value="A">A</option>
          <option value="F">F</option>
          <option value="G">G</option>
          <option value="K">K</option>
          <option value="M">M</option>
        </select>
      </div>
      <div className="grid-two catalog-grid">
        <div id="star-list" aria-live="polite" data-reveal data-reveal-delay="120" />
        <aside className="insight-panel catalog-insight" data-reveal data-reveal-delay="160">
          <h3 style={{ marginTop: 0 }}>Mission Insights</h3>
          <div id="catalog-3d-root" className="mini-3d compact" aria-hidden="true" />
          <p className="caption">
            Instead of only showing stars, this panel explains what the dataset is saying.
          </p>
          <ol className="insight-list" id="insight-list">
            <li>Loading insight narrative...</li>
          </ol>
          <div className="timeline-mini" data-reveal data-reveal-delay="200">
            <p className="caption"><strong>Discovery pacing:</strong> period distribution in selected dataset.</p>
            <div id="period-distribution" />
          </div>
          <div className="timeline-mini" data-reveal data-reveal-delay="260">
            <p className="caption"><strong>Top discovery picks:</strong> high-score KOIs ready to inspect.</p>
            <div id="leaderboard-list" className="leaderboard-list">
              <p className="caption">Loading picks...</p>
            </div>
          </div>
        </aside>
      </div>
      <div className="screen-actions" data-reveal data-reveal-delay="200">
        <button className="secondary" data-nav="INTRO">Back</button>
      </div>
    </section>
  );
}
