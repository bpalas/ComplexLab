import { useTheme } from './theme';
import { useHashView } from './router';
import { Dashboard } from './dashboard/Dashboard';
import { SandboxSim } from './modules/sandbox/SandboxSim';
import { NetworkSim } from './modules/network/NetworkSim';
import { AgentsSim } from './modules/agents/AgentsSim';
import { CellularSim } from './modules/cellular/CellularSim';
import { LifeSim } from './modules/life/LifeSim';
import { BoidsSim } from './modules/boids/BoidsSim';
import { SnowflakeSim } from './modules/snowflake/SnowflakeSim';
import { ChessRLSim } from './modules/chessrl/ChessRLSim';
import { ReactionSim } from './modules/reaction/ReactionSim';

export type View =
  | 'dashboard'
  | 'laboratorio'
  | 'red'
  | 'agentes'
  | 'celular'
  | 'vida'
  | 'boids'
  | 'nieve'
  | 'ajedrez'
  | 'reaccion';


export function App() {
  const [view, setView] = useHashView();
  const { theme, toggle } = useTheme();

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
        {view === 'boids' && (
          <>
            <ModuleHeader
              code="AGI·00"
              title="Boids · Bandadas Emergentes (Reynolds)"
              sub="Separación · alineación · cohesión · depredador interactivo · mundo toroidal"
            />
            <BoidsSim />
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
        {view === 'ajedrez' && (
          <>
            <ModuleHeader
              code="RL·01"
              title="La Caza del Rey · Q-learning por Ensayo y Error"
              sub="Ecuación de Bellman en vivo · error TD como pérdida · política ε-greedy"
            />
            <ChessRLSim />
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
        {view === 'vida' && (
          <>
            <ModuleHeader
              code="NET·04"
              title="El Juego de la Vida · Conway"
              sub="4 reglas (B3/S23) · gliders, osciladores y cañones · orden emergente sin diseñador"
            />
            <LifeSim />
          </>
        )}
        {view === 'nieve' && (
          <>
            <ModuleHeader
              code="PHY·01"
              title="Copos de Nieve · Cristalización Hexagonal"
              sub="Modelo de Reiter · enlaces de hidrógeno → hielo Ih · por qué ningún copo es igual"
            />
            <SnowflakeSim />
          </>
        )}
        {view === 'reaccion' && (
          <>
            <ModuleHeader
              code="PHY·02"
              title="Reacción-Difusión · Cómo se forman manchas y rayas"
              sub="Morfogénesis de Turing · Gray-Scott · elige un patrón, dale play y pinta sobre el lienzo"
            />
            <ReactionSim />
          </>
        )}
      </main>

      <footer className="footbar">
        <span className="foot-brand">Complex Labs</span>
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
