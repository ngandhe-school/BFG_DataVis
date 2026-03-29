export default function AIVerdictScreen() {
  return (
    <section id="screen-ai-verdict" className="screen verdict-screen">
      <h2 data-reveal>Signal Story</h2>
      <p className="caption" data-reveal data-reveal-delay="40">Plain-language interpretation of transit evidence from the selected KOI.</p>
      <div className="verdict-grid">
        <div className="verdict narrative-panel" data-reveal data-reveal-delay="100">
          <div>
            <strong id="verdict-label" className="verdict-headline">No story yet</strong>
            <p className="caption" id="verdict-detail">Select a KOI and run analysis to generate a signal story.</p>
          </div>
          <div id="confidence-meter" className="confidence-meter" />
          <p className="caption" id="verdict-summary">What this means will appear here after analysis.</p>
          <div id="verdict-counterfactual" className="counterfactual-block" />
        </div>
        <div className="narrative-panel" data-reveal data-reveal-delay="160">
          <div id="verdict-3d-root" className="mini-3d compact" aria-hidden="true" />
          <p className="caption" id="verdict-warning" style={{ marginTop: 10 }}>
            No uncertainty warning yet.
          </p>
          <h4 className="reason-heading">Why this verdict</h4>
          <ol className="reason-list" id="reason-list">
            <li>Run analysis to view feature-level reasoning.</li>
          </ol>
        </div>
      </div>
      <div className="screen-actions" data-reveal data-reveal-delay="220">
        <button className="secondary" data-nav="TRANSIT_VIEW">Back to Transit</button>
        <button className="secondary" data-nav="DATA_EXPLAIN">Open Star Dossier</button>
      </div>
    </section>
  );
}
