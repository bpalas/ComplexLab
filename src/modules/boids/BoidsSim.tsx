import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../useReducedMotion';
import { BoidsEngine, BoidsParams, BoidsStats, DEFAULT_BOIDS } from './engine';
import { Slider } from '../../components/Slider';

/** Regímenes prediseñados: el mismo sistema, tres fases distintas. */
const PRESETS: { key: string; name: string; hint: string; p: Partial<BoidsParams> }[] = [
  {
    key: 'gas',
    name: 'Gas',
    hint: 'sin alineación ni cohesión',
    p: { separation: 1.8, alignment: 0, cohesion: 0, perception: 60 },
  },
  {
    key: 'bandada',
    name: 'Bandada',
    hint: 'las tres reglas en equilibrio',
    p: { separation: 1.4, alignment: 1.0, cohesion: 0.9, perception: 70 },
  },
  {
    key: 'vortice',
    name: 'Vórtice',
    hint: 'cohesión alta, alineación baja',
    p: { separation: 1.1, alignment: 0.12, cohesion: 2.6, perception: 110 },
  },
];

/** Telemetría aislada del bucle de render, igual que en NET·01. */
function StatsOverlay({
  engineRef,
  sizeRef,
}: {
  engineRef: React.RefObject<BoidsEngine | null>;
  sizeRef: React.MutableRefObject<{ w: number; h: number }>;
}) {
  const [s, setS] = useState<BoidsStats | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (engineRef.current && sizeRef.current.w > 0) {
        setS(engineRef.current.stats(sizeRef.current.w, sizeRef.current.h));
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [engineRef, sizeRef]);

  if (!s) return null;
  return (
    <div className="stats-overlay">
      <div><span>FPS</span><b>{s.fps.toFixed(0)}</b></div>
      <div><span>BOIDS</span><b>{s.count}</b></div>
      <div><span>POLARIZACIÓN Φ</span><b>{s.polarization.toFixed(2)}</b></div>
      <div><span>ROTACIÓN (VÓRTICE)</span><b>{s.milling.toFixed(2)}</b></div>
      <div><span>VECINOS MEDIOS</span><b>{s.meanNeighbors.toFixed(1)}</b></div>
    </div>
  );
}

export function BoidsSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BoidsEngine | null>(null);
  const paramsRef = useRef<BoidsParams>({ ...DEFAULT_BOIDS });
  const sizeRef = useRef({ w: 0, h: 0 });
  const reducedMotion = useReducedMotion();
  const playingRef = useRef(!reducedMotion);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [preset, setPreset] = useState('bandada');
  const [sliderEpoch, setSliderEpoch] = useState(0); // fuerza remount de sliders al aplicar preset

  if (!engineRef.current) engineRef.current = new BoidsEngine(180);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = canvas.parentElement!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = stage.getBoundingClientRect();
      sizeRef.current.w = rect.width;
      sizeRef.current.h = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        engine.update(dt, paramsRef.current, sizeRef.current.w, sizeRef.current.h);
      }
      engine.render(ctx, sizeRef.current.w, sizeRef.current.h);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const setPredator = (e: React.PointerEvent<HTMLCanvasElement>, active: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const engine = engineRef.current!;
    engine.predator.x = e.clientX - rect.left;
    engine.predator.y = e.clientY - rect.top;
    engine.predator.active = active;
  };

  const applyPreset = (key: string) => {
    const def = PRESETS.find((q) => q.key === key)!;
    Object.assign(paramsRef.current, def.p);
    setPreset(key);
    setSliderEpoch((e) => e + 1);
  };

  const p = paramsRef.current;

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Las tres reglas de Reynolds</h2>
        <p className="panel-sub">
          Cada boid solo ve a sus vecinos cercanos. No hay líder ni plan: la
          bandada emerge del balance entre tres fuerzas locales.
        </p>

        <div className="ca-featured">
          {PRESETS.map((q) => (
            <button
              key={q.key}
              className={`btn ca-chip ${preset === q.key ? 'active' : ''}`}
              onClick={() => applyPreset(q.key)}
              title={q.hint}
            >
              {q.name} <small>{q.hint}</small>
            </button>
          ))}
        </div>

        <Slider
          key={`sep-${sliderEpoch}`}
          label="Separación"
          min={0}
          max={3}
          step={0.05}
          defaultValue={p.separation}
          onInput={(v) => (paramsRef.current.separation = v)}
          hint="Repulsión de corto alcance: evita colisiones y amontonamiento."
        />
        <Slider
          key={`ali-${sliderEpoch}`}
          label="Alineación"
          min={0}
          max={3}
          step={0.05}
          defaultValue={p.alignment}
          onInput={(v) => (paramsRef.current.alignment = v)}
          hint="Imitar la dirección media de los vecinos. Sube Φ hacia 1."
        />
        <Slider
          key={`coh-${sliderEpoch}`}
          label="Cohesión"
          min={0}
          max={3}
          step={0.05}
          defaultValue={p.cohesion}
          onInput={(v) => (paramsRef.current.cohesion = v)}
          hint="Atracción hacia el centroide local: mantiene unido al grupo."
        />
        <Slider
          key={`per-${sliderEpoch}`}
          label="Radio de percepción"
          min={20}
          max={160}
          step={1}
          defaultValue={p.perception}
          format={(v) => `${v.toFixed(0)} px`}
          onInput={(v) => (paramsRef.current.perception = v)}
          hint="Hasta dónde «ve» cada boid. Más radio = orden más global."
        />
        <Slider
          label="Rapidez máxima"
          min={60}
          max={320}
          step={5}
          defaultValue={DEFAULT_BOIDS.maxSpeed}
          format={(v) => `${v.toFixed(0)} px/s`}
          onInput={(v) => (paramsRef.current.maxSpeed = v)}
          hint="Tope de velocidad individual."
        />
        <Slider
          label="Miedo al depredador"
          min={0}
          max={6}
          step={0.1}
          defaultValue={DEFAULT_BOIDS.fear}
          onInput={(v) => (paramsRef.current.fear = v)}
          hint="Intensidad de la huida cuando el depredador está cerca."
        />
        <Slider
          label="Población"
          min={20}
          max={500}
          step={10}
          defaultValue={180}
          format={(v) => v.toFixed(0)}
          onInput={(v) =>
            engineRef.current!.setCount(v, sizeRef.current.w || 900, sizeRef.current.h || 600)
          }
          hint="Número de boids vivos en el mundo toroidal."
        />

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
            onClick={() => engineRef.current!.reset(sizeRef.current.w || 900, sizeRef.current.h || 600)}
          >
            ↺ Redispersar bandada
          </button>
        </div>

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>Preset «Gas»: sin alineación ni cohesión, Φ ≈ 0 — desorden tipo gas.</li>
            <li>Sube la alineación poco a poco: transición de fase hacia Φ → 1 (bandada).</li>
            <li>Preset «Vórtice»: cohesión alta + alineación baja → molino giratorio (mira la métrica de rotación).</li>
            <li>Mantén pulsado sobre el lienzo: el depredador parte el grupo… que se reforma solo al soltar.</li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setPredator(e, true);
          }}
          onPointerMove={(e) => setPredator(e, e.buttons > 0)}
          onPointerUp={(e) => setPredator(e, false)}
          onPointerLeave={(e) => setPredator(e, false)}
          onPointerCancel={(e) => setPredator(e, false)}
        />
        <StatsOverlay engineRef={engineRef} sizeRef={sizeRef} />
        <div className="stage-hint">
          DEPREDADOR · mantén pulsado y arrastra sobre el lienzo para dispersar la bandada
        </div>
      </section>
    </div>
  );
}
