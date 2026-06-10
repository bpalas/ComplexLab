import { useEffect, useRef, useState } from 'react';
import { SnowflakeEngine, SnowParams, SnowStats, DEFAULT_SNOW } from './engine';
import { Slider } from '../../components/Slider';

const STEPS_PER_FRAME_BASE = 2;

/** Telemetría aislada del bucle de render. */
function StatsOverlay({ engineRef }: { engineRef: React.RefObject<SnowflakeEngine | null> }) {
  const [s, setS] = useState<SnowStats | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (engineRef.current) setS(engineRef.current.stats());
    }, 500);
    return () => window.clearInterval(id);
  }, [engineRef]);

  if (!s) return null;
  return (
    <div className="stats-overlay">
      <div><span>PASO</span><b>{s.step}</b></div>
      <div><span>CELDAS DE HIELO</span><b>{s.frozen}</b></div>
      <div><span>RADIO</span><b>{s.radius}</b></div>
      <div><span>HUMEDAD β</span><b>{s.beta.toFixed(2)}</b></div>
      <div><span>DEPOSICIÓN γ</span><b>{(s.gamma * 1000).toFixed(2)}‰</b></div>
      <div><span>ESTADO</span><b>{s.done ? 'COMPLETO' : 'CRECIENDO'}</b></div>
    </div>
  );
}

export function SnowflakeSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnowflakeEngine | null>(null);
  const paramsRef = useRef<SnowParams>({ ...DEFAULT_SNOW });
  const speedRef = useRef(1);
  const playingRef = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [journey, setJourney] = useState(true);
  const [seed, setSeed] = useState(1);

  if (!engineRef.current) engineRef.current = new SnowflakeEngine(90, 1);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = canvas.parentElement!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = stage.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const loop = () => {
      if (playingRef.current && !engine.done) {
        const n = Math.max(1, Math.round(STEPS_PER_FRAME_BASE * speedRef.current));
        for (let i = 0; i < n; i++) engine.step(paramsRef.current);
      }
      engine.render(ctx, cssW, cssH);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  /** Nueva caída: otro viaje atmosférico → otro copo, siempre hexagonal. */
  const newFall = () => {
    const s = Math.floor(Math.random() * 1e9);
    setSeed(s);
    engineRef.current!.journey = journey;
    engineRef.current!.reset(paramsRef.current, s);
  };

  const replay = () => {
    engineRef.current!.journey = journey;
    engineRef.current!.reset(paramsRef.current, seed);
  };

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Atmósfera local</h2>
        <p className="panel-sub">
          La red hexagonal viene de la química: cada H₂O forma 4 enlaces de
          hidrógeno y el hielo Ih cristaliza en hexágonos. La FORMA del copo, en
          cambio, la decide la atmósfera que atraviesa al caer.
        </p>

        <Slider
          label="Difusión del vapor (α)"
          min={0.4}
          max={2}
          step={0.02}
          defaultValue={DEFAULT_SNOW.alpha}
          onInput={(v) => (paramsRef.current.alpha = v)}
          hint="Qué tan rápido viaja el vapor de agua hacia el cristal."
        />
        <Slider
          label="Humedad de fondo (β)"
          min={0.3}
          max={0.9}
          step={0.01}
          defaultValue={DEFAULT_SNOW.beta}
          onInput={(v) => (paramsRef.current.beta = v)}
          hint="Sobresaturación del aire. Alta → dendritas ramificadas; baja → placas."
        />
        <Slider
          label="Deposición (γ)"
          min={0.0001}
          max={0.015}
          step={0.0001}
          defaultValue={DEFAULT_SNOW.gamma}
          format={(v) => `${(v * 1000).toFixed(2)}‰`}
          onInput={(v) => (paramsRef.current.gamma = v)}
          hint="Vapor que se adhiere al borde del cristal en cada paso."
        />
        <Slider
          label="Velocidad"
          min={0.5}
          max={6}
          step={0.5}
          defaultValue={1}
          format={(v) => `${v.toFixed(1)}×`}
          onInput={(v) => (speedRef.current = v)}
          hint="Pasos de simulación por fotograma."
        />

        <h2 className="panel-title">El viaje del copo</h2>
        <div className="btn-stack">
          <button
            className={`btn ${journey ? 'btn-warn' : ''}`}
            onClick={() => {
              const j = !journey;
              setJourney(j);
              engineRef.current!.journey = j;
            }}
          >
            {journey ? '❄ Viaje atmosférico: ACTIVO' : '— Viaje atmosférico: fijo'}
          </button>
          <button className="btn" onClick={newFall}>
            ❄ Nueva caída (otro copo)
          </button>
          <button className="btn" onClick={replay}>
            ↺ Repetir el mismo viaje (semilla {seed})
          </button>
          <button className="btn" onClick={() => { playingRef.current = !playing; setPlaying(!playing); }}>
            {playing ? '❚❚ Pausa' : '▶ Reproducir'}
          </button>
        </div>

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>
              <b>¿Por qué hexagonal?</b> El ángulo H–O–H (104.5°) y los 4 enlaces
              de hidrógeno por molécula empaquetan el hielo en anillos de 6
              moléculas: la simetría del cristal hereda la simetría del enlace.
            </li>
            <li>
              <b>¿Por qué ninguno es igual?</b> Activa el viaje atmosférico: β y γ
              derivan al azar (capas de aire con distinta T y humedad). Pulsa
              «Nueva caída» varias veces — mismas leyes, copos distintos.
            </li>
            <li>
              <b>¿Por qué simétrico Y único?</b> El copo mide ~1 mm: las seis
              ramas viven la MISMA historia atmosférica. El viaje cambia la forma
              global sin romper la simetría local.
            </li>
            <li>
              Con viaje fijo: β alta → dendritas; β baja → placas compactas
              (diagrama de Nakaya). «Repetir el mismo viaje» reproduce el copo
              exacto: el azar está en el camino, no en las leyes.
            </li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage">
        <canvas ref={canvasRef} />
        <StatsOverlay engineRef={engineRef} />
        <div className="stage-hint">
          MODELO DE REITER · red hexagonal del hielo Ih · cada celda es vapor (s&lt;1) o hielo (s≥1)
        </div>
      </section>
    </div>
  );
}
