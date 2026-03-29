export default function DataExplainScreen() {
  return (
    <section id="screen-data-explain" className="screen data-explain-screen">
      <h2 data-reveal>Star Dossier</h2>
      <p className="caption" id="data-source-note" data-reveal data-reveal-delay="40">
        Data source and field explanations will appear after selecting a star.
      </p>

      <div className="grid-two">
        <div className="panel" data-reveal data-reveal-delay="100">
          <h3 id="selected-star-name" style={{ marginTop: 0 }}>No star selected</h3>
          <p className="caption" id="star-where">Where: pick a KOI in Star Select to load context.</p>
          <p className="caption" id="star-what">What: this screen explains every key measurement.</p>
          <p className="caption" id="star-why">Why: each value connects to detectability and habitability clues.</p>
          <div id="dossier-field-grid" className="meta-grid" style={{ marginTop: 10 }} />
        </div>
        <div className="panel" data-reveal data-reveal-delay="160">
          <h3 style={{ marginTop: 0 }}>Field Meaning Guide</h3>
          <ol id="data-legend-list" className="insight-list">
            <li>Load a star to view the glossary.</li>
          </ol>
        </div>
      </div>

      <div className="screen-actions" data-reveal data-reveal-delay="220">
        <button className="secondary" data-nav="TRANSIT_VIEW">Back to Transit</button>
        <button className="secondary" data-nav="DATASET_STORY">Dataset Story</button>
        <button className="secondary" data-nav="STAR_SELECT">Back to Catalog</button>
      </div>
    </section>
  );
}
