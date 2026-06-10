import { useState } from 'react';
import { useTheme } from './theme';
import { Dashboard } from './dashboard/Dashboard';
import { LIVE_MODULES } from './modules/registry';

export type View = 'dashboard' | string;

function ModuleHeader({ code, title, sub }: { code: string; title: string; sub: string }) {
  return (
    <div className="module-header">
      <span className="module-code">{code}</span>
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const { theme, toggle } = useTheme();

  const activeModule = LIVE_MODULES.find((m) => m.id === view) ?? null;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('dashboard')}>
          <span className="brand-name">
            Complex <b>Labs</b>
          </span>
          <span className="brand-sub">Sistemas complejos</span>
        </button>
        <nav>
          <button
            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            PANEL
          </button>
          {LIVE_MODULES.map((m) => (
            <button
              key={m.id}
              className={`nav-btn ${view === m.id ? 'active' : ''}`}
              onClick={() => setView(m.id)}
            >
              {m.navLabel}
            </button>
          ))}
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
      </header>

      <main className="main">
        {view === 'dashboard' && <Dashboard onOpen={setView} />}
        {activeModule && activeModule.component && (() => {
          const Comp = activeModule.component!;
          return (
            <>
              <ModuleHeader
                code={activeModule.code}
                title={activeModule.title}
                sub={activeModule.sub}
              />
              <Comp />
            </>
          );
        })()}
      </main>

      <footer className="footbar">
        <span className="foot-brand">Complex Labs</span>
        <span>Simulaciones interactivas de sistemas complejos · render en HTML5 Canvas</span>
      </footer>
    </div>
  );
}
