export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand-wrap">
        <h1>Stellar <span>Fingerprints</span></h1>
      </div>
      <nav className="top-nav">
        <button className="top-link" data-nav="INTRO" data-screen-link="INTRO" data-step="1">
          <span className="step-dot" />Mission Brief
        </button>
        <button className="top-link" data-nav="STAR_SELECT" data-screen-link="STAR_SELECT" data-step="2">
          <span className="step-dot" />Star Select
        </button>
        <button className="top-link" data-nav="TRANSIT_VIEW" data-screen-link="TRANSIT_VIEW" data-step="3">
          <span className="step-dot" />Transit View
        </button>
        <button className="top-link" data-nav="DATA_EXPLAIN" data-screen-link="DATA_EXPLAIN" data-step="4">
          <span className="step-dot" />Star Dossier
        </button>
        <button className="top-link" data-nav="DATASET_STORY" data-screen-link="DATASET_STORY" data-step="5">
          <span className="step-dot" />Dataset Story
        </button>
        <button className="top-link" data-nav="AI_VERDICT" data-screen-link="AI_VERDICT" data-step="6">
          <span className="step-dot" />Signal Story
        </button>
      </nav>
      <div className="header-right">
        <div className="pill" id="status-pill">ONLINE</div>
      </div>
    </header>
  );
}
