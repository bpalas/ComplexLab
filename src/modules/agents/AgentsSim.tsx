import { useEffect, useRef, useState } from 'react';
import {
  AGENTS,
  AgentMode,
  CoordinationEngine,
  N_OPTIONS,
  RoundRecord,
} from './engine';
import { ConvergenceChart } from './ConvergenceChart';

const MODE_INFO: Record<AgentMode, { title: string; tag: string; desc: string }> = {
  homogeneo: {
    title: 'Homogéneo',
    tag: 'SIN ESTRUCTURA',
    desc: 'Parámetros planos e idénticos para los cuatro agentes. Sin diferenciación interna, los vectores de decisión tienden a ser altamente redundantes o caóticos: el grupo se persigue a sí mismo.',
  },
  especializacion: {
    title: 'Especialización',
    tag: 'DIFERENCIACIÓN DE IDENTIDAD',
    desc: 'Cada agente recibe un sesgo analítico único y estable (Analítico, Explorador, Conservador, Sintetizador). La diferenciación sistémica crea rutas complementarias hacia el consenso.',
  },
  inferencia: {
    title: 'Inferencia',
    tag: 'TEORÍA DE LA MENTE',
    desc: 'Anticipación cruzada: cada agente modela probabilísticamente las decisiones de sus pares y elige el consenso esperado. Las líneas indican la confianza de cada inferencia.',
  },
};

const SPEEDS = [
  { label: '1×', ms: 1100 },
  { label: '2×', ms: 550 },
  { label: '4×', ms: 260 },
];

/** Posiciones (en %) de los 4 avatares dentro de la cuadrícula 2×2. */
const CENTERS = [
  { x: 25, y: 25 },
  { x: 75, y: 25 },
  { x: 25, y: 75 },
  { x: 75, y: 75 },
];

function AgentGlyph({ glyph, color }: { glyph: string; color: string }) {
  const c = color;
  return (
    <svg viewBox="0 0 36 36" className="agent-glyph" aria-hidden>
      <circle cx="18" cy="18" r="16.5" fill="none" stroke={c} strokeWidth="1" opacity="0.45" />
      {glyph === 'circle' && <circle cx="18" cy="18" r="7" fill={c} opacity="0.9" />}
      {glyph === 'triangle' && <path d="M18 10 L26 25 L10 25 Z" fill={c} opacity="0.9" />}
      {glyph === 'square' && <rect x="11" y="11" width="14" height="14" fill={c} opacity="0.9" />}
      {glyph === 'diamond' && <path d="M18 9 L27 18 L18 27 L9 18 Z" fill={c} opacity="0.9" />}
    </svg>
  );
}

export function AgentsSim() {
  const engineRef = useRef<CoordinationEngine | null>(null);
  if (!engineRef.current) engineRef.current = new CoordinationEngine();
  const engine = engineRef.current;

  const [mode, setMode] = useState<AgentMode>('homogeneo');
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [, setTick] = useState(0);

  const step = () => {
    engineRef.current!.playRound();
    setTick((t) => t + 1);
  };

  useEffect(() => {
    engine.mode = mode;
  }, [mode, engine]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(step, SPEEDS[speedIdx].ms);
    return () => window.clearInterval(id);
  }, [playing, speedIdx]);

  const last: RoundRecord | null = engine.history.length
    ? engine.history[engine.history.length - 1]
    : null;
  const metrics = engine.metrics();
  const series = engine.errorSeries();

  const outcome = !last
    ? { text: 'INICIANDO PROTOCOLO…', cls: '' }
    : last.perfect
      ? { text: '◉ CONSENSO TOTAL', cls: 'ok' }
      : last.score >= 0.5
        ? { text: `◐ COORDINACIÓN PARCIAL ${(last.score * 100).toFixed(0)}%`, cls: 'mid' }
        : { text: '○ FALLO DE COORDINACIÓN', cls: 'bad' };

  return (
    <div className="agents-layout">
      {/* ───────────── Columna 1: ecosistema de agentes ───────────── */}
      <section className="panel agents-panel">
        <h2 className="panel-title">Ecosistema de agentes</h2>
        <p className="panel-sub">
          Cuatro agentes autónomos deciden en paralelo, sin comunicación directa:
          solo observan el histórico público del grupo.
        </p>
        <div className="agents-grid-wrap">
          {mode === 'inferencia' && (
            <svg
              className="inference-lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {CENTERS.flatMap((a, i) =>
                CENTERS.slice(i + 1).map((b, k) => {
                  const j = i + 1 + k;
                  const conf = (engine.inference[i][j] + engine.inference[j][i]) / 2;
                  return (
                    <line
                      key={`${i}-${j}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className="inference-line"
                      style={{ opacity: 0.15 + conf * 0.85 }}
                    />
                  );
                }),
              )}
            </svg>
          )}
          <div className="agents-grid">
            {AGENTS.map((a, i) => {
              const choice = last ? last.choices[i] : null;
              const aligned = last && last.majority >= 0 && choice === last.majority;
              return (
                <article
                  key={a.name}
                  className={`agent-card ${aligned ? 'aligned' : ''}`}
                  style={{ '--agent': a.color } as React.CSSProperties}
                >
                  <header>
                    <AgentGlyph glyph={a.glyph} color={a.color} />
                    <div>
                      <h3>{a.name}</h3>
                      <span className="agent-role">
                        {mode === 'homogeneo' ? 'Estándar' : a.role}
                      </span>
                    </div>
                  </header>
                  <div className="agent-choice">
                    {choice === null ? '—' : choice}
                  </div>
                  <div className="agent-history">
                    {engine.history.slice(-12).map((r) => (
                      <span
                        key={r.index}
                        className={
                          r.majority >= 0 && r.choices[i] === r.majority ? 'hit' : 'miss'
                        }
                        title={`ronda ${r.index}: eligió ${r.choices[i]}`}
                      />
                    ))}
                  </div>
                  {mode === 'especializacion' && <p className="agent-desc">{a.desc}</p>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── Columna 2: tablero central ───────────── */}
      <section className="panel board-panel">
        <header className="board-header">
          <div><span>RONDA</span><b>{engine.round}</b></div>
          <div><span>CONSENSO</span><b>{last ? `${(last.score * 100).toFixed(0)}%` : '—'}</b></div>
          <div>
            <span>OBJETIVO</span>
            <b>convergencia numérica idéntica</b>
          </div>
        </header>

        <div className={`outcome-banner ${outcome.cls}`}>{outcome.text}</div>
        {last && last.lockout >= 0 && (
          <div className="lockout-banner">
            ⚠ PERTURBACIÓN DE CONTEXTO — la opción {last.lockout} quedó agotada:
            el colectivo debe re-coordinarse.
          </div>
        )}

        <div className="board-grid">
          {Array.from({ length: N_OPTIONS }, (_, opt) => {
            const lockedFor = engine.lockRemaining(opt);
            const isMajority = last !== null && last.majority === opt;
            const pickers = last
              ? AGENTS.map((a, i) => ({ a, i })).filter(({ i }) => last.choices[i] === opt)
              : [];
            return (
              <div
                key={opt}
                className={`board-cell ${lockedFor > 0 ? 'locked' : ''} ${isMajority ? 'majority' : ''}`}
              >
                <span className="cell-digit">{opt}</span>
                <div className="cell-dots">
                  {pickers.map(({ a }) => (
                    <i key={a.name} style={{ background: a.color }} title={a.name} />
                  ))}
                </div>
                {lockedFor > 0 && <span className="cell-lock">BLOQ ·{lockedFor}</span>}
              </div>
            );
          })}
        </div>

        <div className="transport">
          <button className="btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❚❚ Pausa' : '▶ Reanudar'}
          </button>
          <button className="btn" onClick={step} disabled={playing}>
            +1 Ronda
          </button>
          <div className="seg">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                className={i === speedIdx ? 'on' : ''}
                onClick={() => setSpeedIdx(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-warn"
            onClick={() => {
              engine.reset();
              setTick((t) => t + 1);
            }}
          >
            ↺ Reiniciar
          </button>
        </div>

        <p className="board-note">
          Regla del entorno: tres consensos perfectos consecutivos agotan la opción
          elegida (queda bloqueada), forzando ciclos de re-coordinación. Así se
          revela qué arquitectura re-converge más rápido.
        </p>
      </section>

      {/* ───────────── Columna 3: arquitectura + métricas ───────────── */}
      <section className="metrics-col">
        <div className="panel">
          <h2 className="panel-title">Arquitectura de IA</h2>
          <p className="panel-sub">Cambia las reglas del motor para la siguiente ronda.</p>
          <div className="mode-selector">
            {(Object.keys(MODE_INFO) as AgentMode[]).map((m) => (
              <button
                key={m}
                className={`mode-btn ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                <b>{MODE_INFO[m].title}</b>
                <span>{MODE_INFO[m].tag}</span>
              </button>
            ))}
          </div>
          <p className="mode-desc">{MODE_INFO[mode].desc}</p>
        </div>

        <div className="panel">
          <h2 className="panel-title">Descomposición informacional</h2>
          <div className="bar-row">
            <div className="bar-head">
              <span>SINERGIA DINÁMICA</span>
              <b className="amber">{(metrics.synergy * 100).toFixed(0)}%</b>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill amber"
                style={{ width: `${Math.min(100, metrics.synergy * 100)}%` }}
              />
            </div>
            <p className="bar-hint">
              Coordinación lograda por encima de la línea base independiente:
              estructura que ningún agente explica por sí solo.
            </p>
          </div>
          <div className="bar-row">
            <div className="bar-head">
              <span>REDUNDANCIA</span>
              <b className="blue">{(metrics.redundancy * 100).toFixed(0)}%</b>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill blue"
                style={{ width: `${Math.min(100, metrics.redundancy * 100)}%` }}
              />
            </div>
            <p className="bar-hint">
              Coordinación explicable porque los agentes se comportan como copias
              (marginales casi idénticos). Estimación Monte Carlo, ventana móvil.
            </p>
          </div>
          <div className="bar-row">
            <div className="bar-head">
              <span>DESEMPEÑO COLECTIVO</span>
              <b>{(metrics.actual * 100).toFixed(0)}%</b>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${Math.min(100, metrics.actual * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Convergencia colectiva</h2>
          <p className="panel-sub">Error de coordinación (1 − consenso) por ronda.</p>
          <ConvergenceChart series={series} />
        </div>
      </section>
    </div>
  );
}
