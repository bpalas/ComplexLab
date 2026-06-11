import { useEffect, useRef, useState } from 'react';
import { ReactionDiffusion, RDParams, DEFAULT_RD, RD_PRESETS } from './engine';
import { useReducedMotion } from '../../useReducedMotion';

const GRID_W = 200;
const GRID_H = 150;
/** Iteraciones de química por fotograma a velocidad 1× — el patrón tarda en cuajar. */
const ITERS_PER_FRAME = 8;

const SPEEDS = [0.5, 1, 2, 4];

export function ReactionSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReactionDiffusion | null>(null);
  const paramsRef = useRef<RDParams>({ ...DEFAULT_RD });
  const speedRef = useRef(1);
  const reducedMotion = useReducedMotion();
  const playingRef = useRef(!reducedMotion);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [speed, setSpeed] = useState(1);
  const [preset, setPreset] = useState(RD_PRESETS[0].key);

  if (!engineRef.current) engineRef.current = new ReactionDiffusion(GRID_W, GRID_H, 1);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    const img = ctx.createImageData(GRID_W, GRID_H);
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        const iters = Math.max(1, Math.round(ITERS_PER_FRAME * speedRef.current));
        engine.update(dt, paramsRef.current, iters);
      }
      engine.render(ctx, img);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const applyPreset = (key: string) => {
    const def = RD_PRESETS.find((q) => q.key === key)!;
    paramsRef.current.feed = def.feed;
    paramsRef.current.kill = def.kill;
    setPreset(key);
    engineRef.current!.reset(Math.floor(Math.random() * 1e9));
  };

  const setBrush = (e: React.PointerEvent<HTMLCanvasElement>, active: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const engine = engineRef.current!;
    engine.brush.x = Math.max(
      0,
      Math.min(GRID_W - 1, Math.floor(((e.clientX - rect.left) / rect.width) * GRID_W)),
    );
    engine.brush.y = Math.max(
      0,
      Math.min(GRID_H - 1, Math.floor(((e.clientY - rect.top) / rect.height) * GRID_H)),
    );
    engine.brush.active = active;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin puntero activo (p. ej. eventos sintéticos): seguir sin capturar.
    }
    setBrush(e, true);
  };

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Dos químicos, un patrón</h2>
        <p className="panel-sub">
          Turing (1952): dos sustancias que solo difunden y reaccionan bastan
          para dibujar la piel de un animal — sin ningún plano previo. Elige un
          patrón y mira cómo se organiza solo.
        </p>

        <h2 className="panel-title">Elige un patrón</h2>
        <div className="btn-stack">
          {RD_PRESETS.map((q) => (
            <button
              key={q.key}
              className={`btn ${preset === q.key ? 'btn-warn' : ''}`}
              onClick={() => applyPreset(q.key)}
              title={q.bio}
            >
              {q.name} <small>· {q.hint}</small>
            </button>
          ))}
        </div>

        <h2 className="panel-title">Control de tiempo</h2>
        <div className="btn-stack">
          <button
            className="btn"
            onClick={() => {
              playingRef.current = !playing;
              setPlaying(!playing);
            }}
          >
            {playing ? '❚❚ Pausa' : '▶ Reproducir'}
          </button>
          <button
            className="btn"
            onClick={() => engineRef.current!.reset(Math.floor(Math.random() * 1e9))}
          >
            ↺ Reiniciar (nuevas semillas)
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
            <li>«Mitosis»: las manchas crecen y se parten en dos, como células dividiéndose.</li>
            <li>«Laberinto»: rayas que se conectan — la cebra o la huella dactilar.</li>
            <li>«Lunares»: las manchas del leopardo, separadas y estables.</li>
            <li>Pinta sobre el lienzo para sembrar químico nuevo y perturbar el patrón.</li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage">
        <div className="rd-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={GRID_W}
            height={GRID_H}
            className="rd-canvas tool-brush"
            onPointerDown={onPointerDown}
            onPointerMove={(e) => setBrush(e, e.buttons > 0)}
            onPointerUp={(e) => setBrush(e, false)}
            onPointerLeave={(e) => setBrush(e, false)}
            onPointerCancel={(e) => setBrush(e, false)}
          />
        </div>
        <div className="stage-hint">GRAY-SCOTT · pinta sobre el lienzo para sembrar patrón</div>
      </section>
    </div>
  );
}
