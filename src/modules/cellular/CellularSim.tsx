import { useEffect, useRef, useState } from 'react';
import { ElementaryCA, SeedMode } from './engine';
import { Slider } from '../../components/Slider';

const CELLS = 360; // células por fila
const SCALE = 3; // px internos por célula
const ROWS = 240; // filas visibles del tapiz
const BASE_GPS = 24; // generaciones por segundo a velocidad 1×

const FEATURED: { rule: number; name: string; klass: string }[] = [
  { rule: 250, name: '250', klass: 'Clase I · orden' },
  { rule: 90, name: '90', klass: 'Clase II · fractal' },
  { rule: 30, name: '30', klass: 'Clase III · caos' },
  { rule: 110, name: '110', klass: 'Clase IV · borde del caos' },
  { rule: 184, name: '184', klass: 'tráfico' },
];

const SPEEDS = [0.25, 1, 2, 8];

/** Las 8 transiciones, de 111 (bit 7) a 000 (bit 0). */
const TRANSITIONS = [7, 6, 5, 4, 3, 2, 1, 0];

export function CellularSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ElementaryCA | null>(null);
  const yRef = useRef(0); // fila de pintado actual
  const accRef = useRef(0); // acumulador de generaciones fraccionarias
  const speedRef = useRef(1);
  const densityRef = useRef(0.5);
  const seedModeRef = useRef<SeedMode>('single');
  const playingRef = useRef(true);
  const stepOnceRef = useRef(false);

  const [rule, setRuleUI] = useState(110);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [seedMode, setSeedMode] = useState<SeedMode>('single');

  if (!engineRef.current) engineRef.current = new ElementaryCA(CELLS, 110);

  /** Pinta una fila nueva al fondo del tapiz; hace scroll si está lleno. */
  const paintRow = (ctx: CanvasRenderingContext2D, cells: Uint8Array) => {
    const canvas = ctx.canvas;
    if (yRef.current >= ROWS) {
      ctx.drawImage(canvas, 0, -SCALE);
      yRef.current = ROWS - 1;
    }
    const y = yRef.current * SCALE;
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, y, canvas.width, SCALE);
    ctx.fillStyle = '#56e8d5';
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) ctx.fillRect(i * SCALE, y, SCALE, SCALE);
    }
    yRef.current++;
  };

  const clearTapestry = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    yRef.current = 0;
    accRef.current = 0;
    // Pinta la semilla actual como fila 0
    paintRow(ctx, engineRef.current!.cells);
  };

  const reseed = () => {
    engineRef.current!.setSeed(seedModeRef.current, densityRef.current);
    clearTapestry();
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let last = performance.now();

    clearTapestry();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        accRef.current += dt * BASE_GPS * speedRef.current;
        // Tope de generaciones por frame para no congelar la UI a 8×
        let n = Math.min(64, Math.floor(accRef.current));
        accRef.current -= Math.floor(accRef.current);
        while (n-- > 0) paintRow(ctx, engine.step());
      } else if (stepOnceRef.current) {
        stepOnceRef.current = false;
        paintRow(ctx, engine.step());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRule = (n: number) => {
    engineRef.current!.setRule(n);
    setRuleUI(engineRef.current!.rule);
  };

  const toggleBit = (i: number) => {
    engineRef.current!.toggleRuleBit(i);
    setRuleUI(engineRef.current!.rule);
  };

  const setPlay = (p: boolean) => {
    playingRef.current = p;
    setPlaying(p);
  };

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Constructor de reglas</h2>
        <p className="panel-sub">
          8 transiciones locales definen todo el universo. Toca la celda de
          salida de cada transición para construir tu propia regla.
        </p>

        <div className="ca-rule-editor">
          {TRANSITIONS.map((i) => (
            <button key={i} className="ca-transition" onClick={() => toggleBit(i)}>
              <span className="ca-neigh">
                <i className={i & 4 ? 'on' : ''} />
                <i className={i & 2 ? 'on' : ''} />
                <i className={i & 1 ? 'on' : ''} />
              </span>
              <span className={`ca-out ${engineRef.current!.ruleBit(i) ? 'on' : ''}`} />
            </button>
          ))}
        </div>
        <p className="ca-rule-readout">
          REGLA <b>{rule}</b> · {rule.toString(2).padStart(8, '0')}
        </p>

        <div className="ca-featured">
          {FEATURED.map((f) => (
            <button
              key={f.rule}
              className={`btn ca-chip ${rule === f.rule ? 'active' : ''}`}
              onClick={() => applyRule(f.rule)}
              title={f.klass}
            >
              R{f.name} <small>{f.klass}</small>
            </button>
          ))}
        </div>

        <h2 className="panel-title">Condición inicial</h2>
        <div className="btn-stack">
          <button
            className={`btn ${seedMode === 'single' ? 'btn-warn' : ''}`}
            onClick={() => {
              seedModeRef.current = 'single';
              setSeedMode('single');
              reseed();
            }}
          >
            · Célula única central
          </button>
          <button
            className={`btn ${seedMode === 'random' ? 'btn-warn' : ''}`}
            onClick={() => {
              seedModeRef.current = 'random';
              setSeedMode('random');
              reseed();
            }}
          >
            ⁂ Siembra aleatoria
          </button>
        </div>
        <Slider
          label="Densidad de siembra"
          min={0.02}
          max={0.98}
          step={0.01}
          defaultValue={0.5}
          format={(v) => `${(v * 100).toFixed(0)} %`}
          onInput={(v) => (densityRef.current = v)}
          hint="Fracción de células vivas al sembrar aleatoriamente."
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
          <button className="btn" onClick={reseed}>
            ↺ Reiniciar tapiz
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

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>R250: todo converge — orden homogéneo (Clase I).</li>
            <li>R90 con célula única: el triángulo de Sierpiński (Clase II).</li>
            <li>R30: caos determinista — ¿puedes predecir la columna central? (Clase III).</li>
            <li>R110: estructuras que viajan e interactúan — el borde del caos es computación (Clase IV).</li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage ca-stage">
        <canvas ref={canvasRef} width={CELLS * SCALE} height={ROWS * SCALE} className="ca-canvas" />
        <div className="stage-hint">
          TAPIZ DE EVOLUCIÓN · cada fila es una generación · frontera toroidal
        </div>
      </section>
    </div>
  );
}
