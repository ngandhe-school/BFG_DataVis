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
          <span>Data: NASA Exoplanet Archive — Kepler Cumulative Table</span>
          <span>Stellar Fingerprints · BFG Hackathon 2026</span>
        </footer>
      </main>
    </>
  );
}
