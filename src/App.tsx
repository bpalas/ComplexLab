import { useState } from 'react';
import { useTheme } from './theme';
import { Dashboard } from './dashboard/Dashboard';
import { SandboxSim } from './modules/sandbox/SandboxSim';
import { NetworkSim } from './modules/network/NetworkSim';
import { AgentsSim } from './modules/agents/AgentsSim';
import { CellularSim } from './modules/cellular/CellularSim';

export type View = 'dashboard' | 'laboratorio' | 'red' | 'agentes' | 'celular';

const NAV: { view: View; label: string }[] = [
  { view: 'dashboard', label: 'PANEL' },
  { view: 'laboratorio', label: 'MÓDULO · 2 NODOS' },
  { view: 'red', label: 'MÓDULO · RED HEBBIANA' },
  { view: 'agentes', label: 'MÓDULO · COORDINACIÓN' },
  { view: 'celular', label: 'MÓDULO · AUTÓMATAS' },
];

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const { theme, toggle } = useTheme();

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('dashboard')}>
          <span className="brand-name">
            Complexity <b>Labs</b>
          </span>
          <span className="brand-sub">Sistemas complejos</span>
        </button>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.view}
              className={`nav-btn ${view === n.view ? 'active' : ''}`}
              onClick={() => setView(n.view)}
            >
              {n.label}
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
        {view === 'laboratorio' && (
          <>
            <ModuleHeader
              code="NET·00"
              title="Aprendizaje en una sinapsis · Laboratorio de 2 nodos"
              sub="Regla de Hebb / STDP · coincidencia temporal · control de tiempo"
            />
            <SandboxSim />
          </>
        )}
        {view === 'red' && (
          <>
            <ModuleHeader
              code="NET·01"
              title="Propagación de Señales y Ajuste de Pesos"
              sub="Aprendizaje asociativo hebbiano · pulsos · plasticidad · poda"
            />
            <NetworkSim />
          </>
        )}
        {view === 'agentes' && (
          <>
            <ModuleHeader
              code="AGI·01"
              title="Coordinación Emergente y Sinergia Informacional"
              sub="4 agentes autónomos · sin comunicación directa · descomposición PID"
            />
            <AgentsSim />
          </>
        )}
        {view === 'celular' && (
          <>
            <ModuleHeader
              code="NET·03"
              title="Autómatas Celulares Elementales"
              sub="256 reglas de Wolfram · 4 clases de complejidad · frontera toroidal"
            />
            <CellularSim />
          </>
        )}
      </main>

      <footer className="footbar">
        <span className="foot-brand">Complexity Labs</span>
        <span>Simulaciones interactivas de sistemas complejos · render en HTML5 Canvas</span>
      </footer>
    </div>
  );
}

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
