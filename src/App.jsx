import AppHeader from './components/layout/AppHeader.jsx';
import IntroScreen from './components/screens/IntroScreen.jsx';
import StarSelectScreen from './components/screens/StarSelectScreen.jsx';
import TransitViewScreen from './components/screens/TransitViewScreen.jsx';
import DataExplainScreen from './components/screens/DataExplainScreen.jsx';
import AIVerdictScreen from './components/screens/AIVerdictScreen.jsx';
import DatasetStoryScreen from './components/screens/DatasetStoryScreen.jsx';
import { useLegacyStellarApp } from './hooks/useLegacyStellarApp.js';

export default function App() {
  useLegacyStellarApp();

  return (
    <>
      <div id="space-bg-root" aria-hidden="true" />
      <main className="app-shell">
        <AppHeader />
        <section className="workspace-shell">
          <aside className="side-rail">
            <div className="rail-status">
              <span className="rail-dot" />
              <small>ONLINE</small>
            </div>
            <button className="rail-link" data-nav="INTRO" data-screen-link="INTRO">
              <span>▣</span>
              <small>Brief</small>
            </button>
            <button className="rail-link" data-nav="STAR_SELECT" data-screen-link="STAR_SELECT">
              <span>★</span>
              <small>Select</small>
            </button>
            <button className="rail-link" data-nav="TRANSIT_VIEW" data-screen-link="TRANSIT_VIEW">
              <span>⌁</span>
              <small>Transit</small>
            </button>
            <button className="rail-link" data-nav="DATA_EXPLAIN" data-screen-link="DATA_EXPLAIN">
              <span>◎</span>
              <small>Dossier</small>
            </button>
            <button className="rail-link" data-nav="DATASET_STORY" data-screen-link="DATASET_STORY">
              <span>◈</span>
              <small>Dataset</small>
            </button>
            <button className="rail-link" data-nav="AI_VERDICT" data-screen-link="AI_VERDICT">
              <span>◍</span>
              <small>Story</small>
            </button>
          </aside>
          <div className="screen-stack">
            <IntroScreen />
            <StarSelectScreen />
            <TransitViewScreen />
            <DataExplainScreen />
            <DatasetStoryScreen />
            <AIVerdictScreen />
          </div>
        </section>
        <footer className="app-footer">
          <span>Source: NASA Kepler Data v4.2</span>
          <span>Documentation</span>
          <span>Support</span>
          <span>Legal</span>
        </footer>
      </main>
    </>
  );
}
