import { useEffect, useRef, useState } from 'react';
import {
  BOARD,
  ChessRLEngine,
  DEFAULT_RL,
  KNIGHT_MOVES,
  RLParams,
  xyOf,
} from './engine';
import { StatChart } from './StatChart';
import { Slider } from '../../components/Slider';
import { useReducedMotion } from '../../useReducedMotion';

const SPEEDS = [
  { label: '1×', mps: 3 },
  { label: '12×', mps: 36 },
  { label: '120×', mps: 360 },
  { label: '1000×', mps: 3000 },
];

const SIZE = 640; // resolución interna del tablero
const MARGIN = 22;
const CELL = (SIZE - MARGIN * 2) / BOARD;

const END_LABEL = { captura: '♞ CAPTURA', comido: '♚ CABALLO COMIDO', agotado: '⏱ AGOTADO' };

export function ChessRLSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ChessRLEngine | null>(null);
  const paramsRef = useRef<RLParams>({ ...DEFAULT_RL });
  const reducedMotion = useReducedMotion();
  const playingRef = useRef(!reducedMotion);
  const speedRef = useRef(1);
  const accRef = useRef(0);
  const heatRef = useRef(true);
  const arrowRef = useRef(true);

  const [playing, setPlaying] = useState(!reducedMotion);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [heat, setHeat] = useState(true);
  const [arrow, setArrow] = useState(true);
  const [, setTick] = useState(0);

  if (!engineRef.current) engineRef.current = new ChessRLEngine();
  const engine = engineRef.current;

  // Bucle de simulación + render del tablero (independiente de React)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        accRef.current += dt * SPEEDS[speedRef.current].mps;
        let n = Math.min(800, Math.floor(accRef.current));
        accRef.current -= Math.floor(accRef.current);
        while (n-- > 0) engine.stepMove(paramsRef.current);
      }
      render(ctx, engine, heatRef.current, arrowRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresco del panel de matemáticas y gráficos a ~8 Hz
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 125);
    return () => window.clearInterval(id);
  }, []);

  const u = engine.lastUpdate;
  const p = paramsRef.current;
  const eps = engine.epsilon(p);
  const returns = engine.stats.map((s) => s.ret);
  const losses = engine.stats.map((s) => s.meanAbsDelta);
  const lastEnd = engine.stats.length ? engine.stats[engine.stats.length - 1].end : null;

  return (
    <div className="module-grid">
      {/* ───────────── Panel de control ───────────── */}
      <aside className="panel side-panel">
        <h2 className="panel-title">Hiperparámetros</h2>
        <p className="panel-sub">
          Mueve las perillas del aprendizaje en caliente: el agente sigue
          entrenando con los nuevos valores.
        </p>
        <Slider
          label="α · tasa de aprendizaje"
          min={0.01}
          max={1}
          step={0.01}
          defaultValue={DEFAULT_RL.alpha}
          onInput={(v) => (paramsRef.current.alpha = v)}
          hint="Cuánto corrige cada error: Q ← Q + α·δ. Alto = aprende rápido pero olvida e inestabiliza."
        />
        <Slider
          label="γ · descuento del futuro"
          min={0.5}
          max={0.99}
          step={0.01}
          defaultValue={DEFAULT_RL.gamma}
          onInput={(v) => (paramsRef.current.gamma = v)}
          hint="Peso de las recompensas futuras: G = Σ γᵏ·r. Bajo = miope; alto = paciente."
        />
        <Slider
          label="decaimiento de ε"
          min={0.95}
          max={0.999}
          step={0.001}
          defaultValue={DEFAULT_RL.epsilonDecay}
          format={(v) => v.toFixed(3)}
          onInput={(v) => (paramsRef.current.epsilonDecay = v)}
          hint="ε = ε₀·decᵉᵖ. Controla cuándo el agente deja de tirar el dado y empieza a fiarse de su tabla."
        />
        <Slider
          label="ε mínimo"
          min={0}
          max={0.5}
          step={0.01}
          defaultValue={DEFAULT_RL.epsilonMin}
          onInput={(v) => (paramsRef.current.epsilonMin = v)}
          hint="Exploración residual: nunca dejar de probar del todo."
        />

        <h2 className="panel-title">Control de tiempo</h2>
        <div className="btn-stack">
          <button
            className="btn"
            onClick={() => {
              playingRef.current = !playingRef.current;
              setPlaying(playingRef.current);
            }}
          >
            {playing ? '❚❚ Pausa' : '▶ Entrenar'}
          </button>
          <button
            className="btn"
            disabled={playing}
            onClick={() => {
              engine.stepMove(paramsRef.current);
              setTick((t) => t + 1);
            }}
          >
            ⇥ +1 movimiento
          </button>
          <button
            className="btn"
            disabled={playing}
            onClick={() => {
              engine.runEpisode(paramsRef.current);
              setTick((t) => t + 1);
            }}
          >
            ⇥⇥ +1 episodio
          </button>
          <button
            className="btn btn-warn"
            onClick={() => {
              engine.reset();
              setTick((t) => t + 1);
            }}
          >
            ↺ Olvidarlo todo (Q ← 0)
          </button>
        </div>
        <div className="seg chessrl-speeds">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              className={i === speedIdx ? 'on' : ''}
              onClick={() => {
                speedRef.current = i;
                setSpeedIdx(i);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <h2 className="panel-title">Visualización</h2>
        <div className="btn-stack">
          <button
            className={`btn ${heat ? 'btn-warn' : ''}`}
            onClick={() => {
              heatRef.current = !heatRef.current;
              setHeat(heatRef.current);
            }}
          >
            {heat ? '◉' : '○'} Mapa de valor V(s)
          </button>
          <button
            className={`btn ${arrow ? 'btn-warn' : ''}`}
            onClick={() => {
              arrowRef.current = !arrowRef.current;
              setArrow(arrowRef.current);
            }}
          >
            {arrow ? '◉' : '○'} Flecha de la política
          </button>
        </div>

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>Al inicio ε≈1: el caballo se mueve al azar — puro ensayo y error.</li>
            <li>Cada error TD δ corrige una celda de la tabla Q (625 estados × 8 acciones).</li>
            <li>Mira la curva |δ|: es la «pérdida» bajando mientras la recompensa sube.</li>
            <li>Pon α=1 o γ=0.5 y observa cómo se rompe o se vuelve miope el aprendizaje.</li>
            <li>Pausa y usa «+1 movimiento» para leer la actualización número a número.</li>
          </ol>
        </div>
      </aside>

      {/* ───────────── Tablero + matemáticas + curvas ───────────── */}
      <section className="chessrl-col">
        <div className="chessrl-stage">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} />
          <div className="stats-overlay">
            <div><span>EPISODIO</span><b>{engine.episode}</b></div>
            <div><span>ε ACTUAL</span><b>{eps.toFixed(3)}</b></div>
            <div><span>RETORNO ⌀100</span><b>{engine.meanReturn(100).toFixed(2)}</b></div>
            <div><span>CAPTURAS ⌀100</span><b>{(engine.captureRate(100) * 100).toFixed(0)}%</b></div>
            {lastEnd && (
              <div><span>ÚLTIMO FIN</span><b>{END_LABEL[lastEnd]}</b></div>
            )}
          </div>
          <div className="stage-hint">
            ♞ AGENTE · ♚ ENTORNO (ALEATORIO) · COLOR = V(s) DADA LA POSICIÓN DEL REY
          </div>
        </div>

        <div className="panel chessrl-math">
          <h2 className="panel-title">La matemática en vivo · última actualización</h2>
          <p className="eq eq-general">
            Q(s,a) ← Q(s,a) + α·[ r + γ·max<sub>a′</sub> Q(s′,a′) − Q(s,a) ]
          </p>
          {u ? (
            <>
              <p className="eq">
                <span className="v-q">{u.qAfter.toFixed(3)}</span> ←{' '}
                <span className="v-q">{u.qBefore.toFixed(3)}</span> +{' '}
                <span className="v-a">{p.alpha.toFixed(2)}</span>·[{' '}
                <span className="v-r">{u.reward.toFixed(1)}</span> +{' '}
                <span className="v-g">{p.gamma.toFixed(2)}</span>·
                <span className="v-q">{u.maxNext.toFixed(3)}</span> −{' '}
                <span className="v-q">{u.qBefore.toFixed(3)}</span> ]
              </p>
              <div className="eq-row">
                <p className="eq">
                  δ = <span className="v-d">{u.delta.toFixed(3)}</span>
                  <span className="eq-note"> error de diferencia temporal</span>
                </p>
                <p className="eq">
                  L = ½δ² = <span className="v-d">{(0.5 * u.delta * u.delta).toFixed(3)}</span>
                  <span className="eq-note"> función de pérdida</span>
                </p>
              </div>
              <p className="eq-meta">
                {u.explored ? '🎲 acción EXPLORADA al azar' : '📖 acción EXPLOTADA de la tabla'} (ε-greedy,
                ε = {eps.toFixed(3)}) · {u.terminal ? 's′ terminal: el objetivo es solo r' : 'objetivo = r + γ·V(s′)'} ·{' '}
                {engine.totalUpdates.toLocaleString('es')} actualizaciones
              </p>
            </>
          ) : (
            <p className="eq-meta">esperando el primer movimiento…</p>
          )}
        </div>

        <div className="chessrl-charts">
          <div className="panel">
            <h2 className="panel-title">Función de ganancia · retorno G por episodio</h2>
            <p className="panel-sub">
              G = Σ r: +10 captura, −10 caballo comido, −0.1 por movimiento. La línea
              punteada es 0.
            </p>
            <StatChart series={returns} color="rgba(86, 232, 213, 1)" label="G" min={-14} max={10} refLine={0} />
          </div>
          <div className="panel">
            <h2 className="panel-title">Función de pérdida · |δ| medio por episodio</h2>
            <p className="panel-sub">
              El error TD es el gradiente de L = ½δ²: cuando tiende a 0, la tabla Q
              ya predice bien las consecuencias.
            </p>
            <StatChart series={losses} color="rgba(255, 180, 84, 1)" label="|δ|" min={0} max={4} />
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Render del tablero
// ============================================================================

function cellRect(cell: number): [number, number] {
  const [x, y] = xyOf(cell);
  return [MARGIN + x * CELL, MARGIN + y * CELL];
}

function render(
  ctx: CanvasRenderingContext2D,
  engine: ChessRLEngine,
  heat: boolean,
  arrow: boolean,
): void {
  ctx.fillStyle = '#04070d';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Rango de V(s) para normalizar el mapa de calor (rey fijo en su casilla actual)
  let vMin = Infinity;
  let vMax = -Infinity;
  const values = new Float32Array(BOARD * BOARD);
  for (let c = 0; c < BOARD * BOARD; c++) {
    const v = c === engine.king ? 0 : engine.valueOf(c, engine.king);
    values[c] = v;
    if (c !== engine.king) {
      vMin = Math.min(vMin, v);
      vMax = Math.max(vMax, v);
    }
  }
  const span = Math.max(1e-6, vMax - vMin);

  for (let c = 0; c < BOARD * BOARD; c++) {
    const [px, py] = cellRect(c);
    const [x, y] = xyOf(c);
    ctx.fillStyle = (x + y) % 2 === 0 ? '#121b29' : '#0b1220';
    ctx.fillRect(px, py, CELL, CELL);
    if (heat && c !== engine.king) {
      const t = (values[c] - vMin) / span;
      ctx.fillStyle =
        values[c] >= 0
          ? `rgba(69, 230, 200, ${0.04 + 0.4 * t})`
          : `rgba(255, 93, 143, ${0.06 + 0.3 * (1 - t)})`;
      ctx.fillRect(px, py, CELL, CELL);
    }
  }

  // Zona de peligro: casillas a paso de rey (puede comerse al caballo ahí)
  const [kx, ky] = xyOf(engine.king);
  ctx.strokeStyle = 'rgba(255, 93, 143, 0.4)';
  ctx.lineWidth = 1;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = kx + dx;
      const ny = ky + dy;
      if (nx < 0 || nx >= BOARD || ny < 0 || ny >= BOARD || (dx === 0 && dy === 0)) continue;
      ctx.strokeRect(MARGIN + nx * CELL + 2, MARGIN + ny * CELL + 2, CELL - 4, CELL - 4);
    }
  }

  // Rastro del caballo en el episodio actual
  if (engine.trail.length > 1) {
    ctx.lineWidth = 2;
    for (let i = 1; i < engine.trail.length; i++) {
      const [ax, ay] = cellRect(engine.trail[i - 1]);
      const [bx, by] = cellRect(engine.trail[i]);
      ctx.strokeStyle = `rgba(255, 180, 84, ${(0.08 + (0.5 * i) / engine.trail.length).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(ax + CELL / 2, ay + CELL / 2);
      ctx.lineTo(bx + CELL / 2, by + CELL / 2);
      ctx.stroke();
    }
  }

  // Flecha de la política codiciosa desde la posición actual
  if (arrow) {
    const a = engine.bestAction(engine.knight, engine.king);
    const [x, y] = xyOf(engine.knight);
    const tx = x + KNIGHT_MOVES[a][0];
    const ty = y + KNIGHT_MOVES[a][1];
    const x1 = MARGIN + x * CELL + CELL / 2;
    const y1 = MARGIN + y * CELL + CELL / 2;
    const x2 = MARGIN + tx * CELL + CELL / 2;
    const y2 = MARGIN + ty * CELL + CELL / 2;
    ctx.strokeStyle = 'rgba(255, 180, 84, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = 'rgba(255, 180, 84, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 11 * Math.cos(ang - 0.45), y2 - 11 * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - 11 * Math.cos(ang + 0.45), y2 - 11 * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  // Piezas
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${CELL * 0.62}px serif`;
  const [knx, kny] = cellRect(engine.knight);
  const [kgx, kgy] = cellRect(engine.king);
  ctx.fillStyle = '#ff5d8f';
  ctx.fillText('♚', kgx + CELL / 2, kgy + CELL / 2 + 3);
  ctx.fillStyle = '#e8f6f2';
  ctx.fillText('♞', knx + CELL / 2, kny + CELL / 2 + 3);

  // Coordenadas del tablero
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(125, 150, 165, 0.55)';
  for (let i = 0; i < BOARD; i++) {
    ctx.fillText(String.fromCharCode(97 + i), MARGIN + i * CELL + CELL / 2, SIZE - MARGIN / 2);
    ctx.fillText(String(BOARD - i), MARGIN / 2, MARGIN + i * CELL + CELL / 2);
  }
}
