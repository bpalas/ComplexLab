import { useEffect, useRef, useState } from 'react';
import { HebbianNetwork, NetParams, NetStats } from './engine';
import { Slider } from '../../components/Slider';
import { useReducedMotion } from '../../useReducedMotion';

const DEFAULTS: NetParams = {
  threshold: 1.0,
  learningRate: 0.3,
  decayRate: 0.06,
  brushRadius: 90,
};

/** Lectura periódica de telemetría del motor — aislada del bucle de render. */
function StatsOverlay({ engineRef }: { engineRef: React.RefObject<HebbianNetwork | null> }) {
  const [s, setS] = useState<NetStats | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (engineRef.current) setS(engineRef.current.stats());
    }, 500);
    return () => window.clearInterval(id);
  }, [engineRef]);

  if (!s) return null;
  return (
    <div className="stats-overlay">
      <div><span>FPS</span><b>{s.fps.toFixed(0)}</b></div>
      <div><span>NODOS</span><b>{s.nodes}</b></div>
      <div><span>ENLACES</span><b>{s.aliveEdges}/{s.totalEdges}</b></div>
      <div><span>PESO MEDIO</span><b>{s.meanWeight.toFixed(3)}</b></div>
      <div><span>RUTAS FUERTES</span><b>{s.strongEdges}</b></div>
      <div><span>DISPAROS/s</span><b>{s.firesPerSec}</b></div>
      <div><span>PULSOS</span><b>{s.pulses}</b></div>
    </div>
  );
}

export function NetworkSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HebbianNetwork | null>(null);
  const paramsRef = useRef<NetParams>({ ...DEFAULTS });
  const reducedMotion = useReducedMotion();
  const playingRef = useRef(!reducedMotion);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [pruneFlash, setPruneFlash] = useState<string | null>(null);

  if (!engineRef.current) engineRef.current = new HebbianNetwork();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = canvas.parentElement!;
    const ctx = canvas.getContext('2d')!;
    const engine = engineRef.current!;
    let raf = 0;
    let last = performance.now();
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

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        engine.update(dt, paramsRef.current, cssW, cssH);
      }
      engine.render(ctx, cssW, cssH, paramsRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const setBrush = (e: React.PointerEvent<HTMLCanvasElement>, active: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const engine = engineRef.current!;
    engine.brush.x = e.clientX - rect.left;
    engine.brush.y = e.clientY - rect.top;
    engine.brush.active = active;
  };

  const handlePrune = () => {
    const killed = engineRef.current!.prune(0.3);
    setPruneFlash(`−${killed} enlaces destruidos`);
    window.setTimeout(() => setPruneFlash(null), 2200);
  };

  return (
    <div className="module-grid">
      <aside className="panel side-panel">
        <h2 className="panel-title">Intervención pedagógica</h2>
        <p className="panel-sub">
          Reglas locales simples → patrones complejos de conectividad. Ajusta los
          parámetros y observa cómo la red consolida o disuelve su memoria.
        </p>

        <Slider
          label="Umbral de activación"
          min={0.3}
          max={2.2}
          step={0.01}
          defaultValue={DEFAULTS.threshold}
          onInput={(v) => (paramsRef.current.threshold = v)}
          hint="Señal acumulada necesaria para que un nodo dispare y propague."
        />
        <Slider
          label="Tasa de aprendizaje"
          min={0}
          max={0.8}
          step={0.01}
          defaultValue={DEFAULTS.learningRate}
          onInput={(v) => (paramsRef.current.learningRate = v)}
          hint="Refuerzo hebbiano: «neuronas que disparan juntas, se conectan»."
        />
        <Slider
          label="Tasa de decaimiento (olvido)"
          min={0}
          max={0.35}
          step={0.005}
          defaultValue={DEFAULTS.decayRate}
          format={(v) => v.toFixed(3)}
          onInput={(v) => (paramsRef.current.decayRate = v)}
          hint="Velocidad con la que se debilitan los enlaces que no transmiten."
        />
        <Slider
          label="Radio del pincel"
          min={30}
          max={180}
          step={1}
          defaultValue={DEFAULTS.brushRadius}
          format={(v) => `${v.toFixed(0)} px`}
          onInput={(v) => (paramsRef.current.brushRadius = v)}
          hint="Pincel de inyección: clic o arrastre sobre el lienzo para inyectar corriente."
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
          <button className="btn btn-warn" onClick={handlePrune}>
            ⚡ Regularización masiva (pruning −30%)
          </button>
          <button className="btn" onClick={() => engineRef.current!.reset()}>
            ↺ Reiniciar red
          </button>
        </div>
        {pruneFlash && <p className="prune-flash">{pruneFlash}</p>}

        <div className="didactic-note">
          <h3>Guía didáctica</h3>
          <ol>
            <li>Dibuja trayectorias repetidas con el pincel: las rutas se engrosan (potenciación).</li>
            <li>Sube el olvido y deja de inyectar: la memoria se disuelve.</li>
            <li>Ejecuta el pruning: ¿sobreviven las rutas principales? Eso es resiliencia.</li>
          </ol>
        </div>
      </aside>

      <section className="canvas-stage">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setBrush(e, true);
          }}
          onPointerMove={(e) => setBrush(e, e.buttons > 0)}
          onPointerUp={(e) => setBrush(e, false)}
          onPointerLeave={(e) => setBrush(e, false)}
          onPointerCancel={(e) => setBrush(e, false)}
        />
        <StatsOverlay engineRef={engineRef} />
        <div className="stage-hint">
          PINCEL DE INYECCIÓN · mantén pulsado y arrastra para forzar rutas preferenciales
        </div>
      </section>
    </div>
  );
}
