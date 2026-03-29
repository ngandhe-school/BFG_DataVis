export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand-wrap">
        <h1>Stellar <span>Fingerprints</span></h1>
      </div>
      <nav className="top-nav">
        <button className="top-link" data-nav="INTRO" data-screen-link="INTRO">Mission Brief</button>
        <button className="top-link" data-nav="STAR_SELECT" data-screen-link="STAR_SELECT">Star Select</button>
        <button className="top-link" data-nav="TRANSIT_VIEW" data-screen-link="TRANSIT_VIEW">Transit View</button>
        <button className="top-link" data-nav="DATA_EXPLAIN" data-screen-link="DATA_EXPLAIN">Star Dossier</button>
        <button className="top-link" data-nav="DATASET_STORY" data-screen-link="DATASET_STORY">Dataset Story</button>
        <button className="top-link" data-nav="AI_VERDICT" data-screen-link="AI_VERDICT">Signal Story</button>
      </nav>
      <div className="header-right">
        <div className="pill" id="status-pill">ONLINE</div>
        <span className="header-icon" aria-hidden="true">◌</span>
        <span className="header-icon" aria-hidden="true">◉</span>
      </div>
    </header>
  );
}
