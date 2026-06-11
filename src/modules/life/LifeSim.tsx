import { useEffect, useRef, useState } from 'react';
import { GameOfLife, PATTERNS } from './engine';
import { Slider } from '../../components/Slider';
import { useReducedMotion } from '../../useReducedMotion';

const COLS = 180; // células por fila
const ROWS = 120; // filas del universo
const SCALE = 4; // px internos por célula
const BASE_GPS = 12; // generaciones por segundo a velocidad 1×

const SPEEDS = [0.25, 1, 2, 8];

export function LifeSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameOfLife | null>(null);
  const accRef = useRef(0); // acumulador de generaciones fraccionarias
  const speedRef = useRef(1);
  const densityRef = useRef(0.3);
  const drawingRef = useRef<0 | 1 | null>(null); // valor que pinta el arrastre
  const reducedMotion = useReducedMotion();
  const playingRef = useRef(!reducedMotion);
  const stepOnceRef = useRef(false);

  const [playing, setPlaying] = useState(!reducedMotion);
  const [speed, setSpeed] = useState(1);
  if (!engineRef.current) {
    const g = new GameOfLife(COLS, ROWS);
    g.randomize(0.3);
    engineRef.current = g;
  }

  const [stats, setStats] = useState({
    generation: engineRef.current.generation,
    population: engineRef.current.population,
  });

  const paint = (ctx: CanvasRenderingContext2D) => {
    const g = engineRef.current!;
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#56e8d5';
    const cells = g.cells;
    for (let y = 0; y < ROWS; y++) {
      const off = y * COLS;
      for (let x = 0; x < COLS; x++) {
        if (cells[off + x]) ctx.fillRect(x * SCALE, y * SCALE, SCALE - 1, SCALE - 1);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let last = performance.now();

    paint(ctx);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let dirty = drawingRef.current !== null;
      if (playingRef.current) {
        accRef.current += dt * BASE_GPS * speedRef.current;
        // Tope de generaciones por frame para no congelar la UI a 8×
        let n = Math.min(24, Math.floor(accRef.current));
        accRef.current -= Math.floor(accRef.current);
        if (n > 0) dirty = true;
        while (n-- > 0) engine.step();
      } else if (stepOnceRef.current) {
        stepOnceRef.current = false;
        engine.step();
        dirty = true;
      }
      if (dirty) {
        paint(ctx);
        setStats({ generation: engine.generation, population: engine.population });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paint(ctx);
    const g = engineRef.current!;
    setStats({ generation: g.generation, population: g.population });
  };

  const setPlay = (p: boolean) => {
    playingRef.current = p;
    setPlaying(p);
  };

  const reseed = () => {
    engineRef.current!.randomize(densityRef.current);
    refresh();
  };

  const clearAll = () => {
    engineRef.current!.clear();
    refresh();
  };

  const stampPattern = (i: number) => {
    const g = engineRef.current!;
    g.clear();
    const p = PATTERNS[i];
    // Centra el patrón en el universo
    const pw = Math.max(...p.cells.map(([x]) => x)) + 1;
    const ph = Math.max(...p.cells.map(([, y]) => y)) + 1;
    g.stamp(p, (COLS - pw) >> 1, (ROWS - ph) >> 1);
    refresh();
  };

  /** Convierte coordenadas del puntero a célula de la rejilla. */
  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    return {
      x: Math.min(COLS - 1, Math.max(0, x)),
      y: Math.min(ROWS - 1, Math.max(0, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = cellAt(e);
    const g = engineRef.current!;
    // El primer toque decide si el arrastre dibuja o borra
    drawingRef.current = g.get(x, y) ? 0 : 1;
    g.set(x, y, drawingRef.current);
    refresh();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current === null) return;
    const { x, y } = cellAt(e);
    engineRef.current!.set(x, y, drawingRef.current);
  };

  const onPointerUp = () => {
    drawingRef.current = null;
    refresh();
  };

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Las 4 reglas (B3/S23)</h2>
        <p className="panel-sub">
          Cada célula mira a sus 8 vecinas: muere de soledad (&lt;2), muere por
          superpoblación (&gt;3), sobrevive con 2–3 y nace con exactamente 3.
          De ahí emerge todo lo demás.
        </p>

        <h2 className="panel-title">Bestiario</h2>
        <div className="btn-stack">
          {PATTERNS.map((p, i) => (
            <button key={p.name} className="btn" onClick={() => stampPattern(i)} title={p.hint}>
              {p.name} <small>· {p.hint}</small>
            </button>
          ))}
        </div>

        <h2 className="panel-title">Condición inicial</h2>
        <div className="btn-stack">
          <button className="btn" onClick={reseed}>
            ⁂ Sopa primordial aleatoria
          </button>
          <button className="btn" onClick={clearAll}>
            ∅ Vaciar universo
          </button>
        </div>
        <Slider
          label="Densidad de siembra"
          min={0.02}
          max={0.98}
          step={0.01}
          defaultValue={0.3}
          format={(v) => `${(v * 100).toFixed(0)} %`}
          onInput={(v) => (densityRef.current = v)}
          hint="Fracción de células vivas al sembrar la sopa aleatoria."
        />

        <h2 className="panel-title">Control de tiempo</h2>
        <div className="btn-stack">
          <button className="btn" onClick={() => setPlay(!playing)}>
            {playing ? '❚❚ Pausa' : '▶ Reproducir'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setPlay(false);
              stepOnceRef.current = true;
            }}
          >
            ⇥ Paso a paso (+1 generación)
          </button>
        </div>
        <div className="ca-speeds">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`btn ca-chip ${speed === s ? 'active' : ''}`}
              onClick={() => {
                speedRef.current = s;
                setSpeed(s);
              }}
            >
              {s}×
            </button>
          ))}
        </div>

        <p className="ca-rule-readout">
          GEN <b>{stats.generation}</b> · POBLACIÓN <b>{stats.population}</b>
        </p>

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>Sopa aleatoria: el caos decanta en bloques, blinkers y gliders.</li>
            <li>Glider: 5 células que «caminan» en diagonal — el monstruo mínimo.</li>
            <li>R-pentominó: 5 células que tardan 1103 generaciones en estabilizarse.</li>
            <li>Cañón de Gosper: una fábrica que emite gliders para siempre — crecimiento infinito sin diseñador.</li>
            <li>Dibuja con el puntero (en pausa) y crea tu propia criatura.</li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage ca-stage">
        <canvas
          ref={canvasRef}
          width={COLS * SCALE}
          height={ROWS * SCALE}
          className="ca-canvas"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className="stage-hint">
          UNIVERSO {COLS}×{ROWS} · frontera toroidal · dibuja o borra células con el puntero
        </div>
      </section>
    </div>
  );
}
