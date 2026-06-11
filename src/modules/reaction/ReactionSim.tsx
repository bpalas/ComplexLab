import { useEffect, useRef, useState } from 'react';
import {
  ReactionDiffusion,
  RDParams,
  RDStats,
  RDTermBreakdown,
  DEFAULT_RD,
  RD_PRESETS,
} from './engine';
import { LiveFormula } from './LiveFormula';
import { PhaseMap } from './PhaseMap';
import { Slider } from '../../components/Slider';
import { useReducedMotion } from '../../useReducedMotion';

const GRID_W = 200;
const GRID_H = 150;
/** Iteraciones de química por fotograma a velocidad 1× — el patrón tarda en cuajar. */
const ITERS_PER_FRAME = 8;
const FEED_RANGE: [number, number] = [0.01, 0.09];
const KILL_RANGE: [number, number] = [0.045, 0.07];
/** Muestras de la sonda guardadas para el mini-gráfico temporal. */
const PROBE_HISTORY = 120;

interface ProbeCell {
  x: number;
  y: number;
}

function StatsOverlay({ engineRef }: { engineRef: React.RefObject<ReactionDiffusion | null> }) {
  const [s, setS] = useState<RDStats | null>(null);
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
      <div><span>ITERACIONES</span><b>{s.step}</b></div>
      <div><span>COBERTURA V</span><b>{(s.coverage * 100).toFixed(0)}%</b></div>
    </div>
  );
}

/** Mini-gráfico temporal de U y V en las últimas muestras de la sonda. */
function Sparkline({ uHist, vHist }: { uHist: number[]; vHist: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const draw = (hist: number[], color: string) => {
      if (hist.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const x = (i / (PROBE_HISTORY - 1)) * w;
        const y = h - Math.max(0, Math.min(1, hist[i])) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw(uHist, 'rgba(120, 200, 220, 0.9)'); // U — cian apagado
    draw(vHist, 'rgba(86, 232, 213, 1)'); // V — cian vivo
  }, [uHist, vHist]);
  return <canvas ref={ref} width={220} height={56} className="rd-sparkline" />;
}

/** Una barra horizontal con el aporte (con signo) de un término. */
function TermBar({ label, value, scale }: { label: string; value: number; scale: number }) {
  const pct = Math.max(-1, Math.min(1, value / scale)) * 50;
  const pos = value >= 0;
  return (
    <div className="rd-term">
      <span className="rd-term-label">{label}</span>
      <div className="rd-term-track">
        <span
          className={`rd-term-fill ${pos ? 'pos' : 'neg'}`}
          style={{ left: pos ? '50%' : `${50 + pct}%`, width: `${Math.abs(pct)}%` }}
        />
      </div>
      <span className="rd-term-val">{value >= 0 ? '+' : ''}{value.toFixed(4)}</span>
    </div>
  );
}

/** Panel de la sonda: U, V, evolución temporal y aporte de cada término. */
function ProbePanel({
  engineRef,
  paramsRef,
  probe,
  onClear,
}: {
  engineRef: React.RefObject<ReactionDiffusion | null>;
  paramsRef: React.RefObject<RDParams>;
  probe: ProbeCell | null;
  onClear: () => void;
}) {
  const [b, setB] = useState<RDTermBreakdown | null>(null);
  const uHist = useRef<number[]>([]);
  const vHist = useRef<number[]>([]);
  const [, setTick] = useState(0);

  // Al cambiar la celda sondeada, reiniciamos el historial.
  useEffect(() => {
    uHist.current = [];
    vHist.current = [];
  }, [probe?.x, probe?.y]);

  useEffect(() => {
    if (!probe) return;
    const id = window.setInterval(() => {
      const eng = engineRef.current;
      const params = paramsRef.current;
      if (!eng || !params) return;
      const read = eng.probe(probe.x, probe.y, params);
      setB(read);
      if (read) {
        uHist.current = [...uHist.current, read.u].slice(-PROBE_HISTORY);
        vHist.current = [...vHist.current, read.v].slice(-PROBE_HISTORY);
        setTick((t) => t + 1);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [probe, engineRef, paramsRef]);

  if (!probe) {
    return (
      <div className="panel rd-probe rd-probe-empty">
        <h2 className="panel-title">La sonda</h2>
        <p className="panel-sub">
          Activa la herramienta <b>Sonda</b> y toca el patrón: leerás en ese punto
          exacto cuánto U y V hay y qué término de la ecuación está ganando. Cada
          píxel <i>es</i> ∂V/∂t evaluándose.
        </p>
      </div>
    );
  }

  const scale = b
    ? Math.max(
        1e-5,
        Math.abs(b.uDiffusion),
        Math.abs(b.uReaction),
        Math.abs(b.uFeed),
        Math.abs(b.vDiffusion),
        Math.abs(b.vReaction),
        Math.abs(b.vDecay),
      )
    : 1;

  return (
    <div className="panel rd-probe">
      <div className="rd-probe-head">
        <h2 className="panel-title">Sonda · celda ({probe.x}, {probe.y})</h2>
        <button className="btn btn-small" onClick={onClear}>✕ quitar</button>
      </div>
      {b ? (
        <>
          <div className="rd-probe-uv">
            <div><span>U</span><b className="v-u">{b.u.toFixed(3)}</b></div>
            <div><span>V</span><b className="v-v">{b.v.toFixed(3)}</b></div>
          </div>
          <Sparkline uHist={uHist.current} vHist={vHist.current} />
          <p className="rd-probe-cap">U (claro) y V (vivo) en las últimas ~24 s</p>

          <h4 className="rd-term-title">∂U/∂t — qué empuja a U ahora</h4>
          <TermBar label="difusión" value={b.uDiffusion} scale={scale} />
          <TermBar label="reacción" value={b.uReaction} scale={scale} />
          <TermBar label="alimentación" value={b.uFeed} scale={scale} />

          <h4 className="rd-term-title">∂V/∂t — qué empuja a V ahora</h4>
          <TermBar label="difusión" value={b.vDiffusion} scale={scale} />
          <TermBar label="reacción" value={b.vReaction} scale={scale} />
          <TermBar label="decaimiento" value={b.vDecay} scale={scale} />
        </>
      ) : (
        <p className="panel-sub">midiendo…</p>
      )}
    </div>
  );
}

export function ReactionSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReactionDiffusion | null>(null);
  const paramsRef = useRef<RDParams>({ ...DEFAULT_RD });
  const speedRef = useRef(1);
  const reducedMotion = useReducedMotion();
  const playingRef = useRef(!reducedMotion);
  const toolRef = useRef<'brush' | 'probe'>('brush');
  const [playing, setPlaying] = useState(!reducedMotion);
  const [tool, setTool] = useState<'brush' | 'probe'>('brush');
  const [preset, setPreset] = useState(RD_PRESETS[0].key);
  const [sliderEpoch, setSliderEpoch] = useState(0);
  const [probe, setProbe] = useState<ProbeCell | null>(null);

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

  const applyParams = (feed: number, kill: number, presetKey?: string) => {
    paramsRef.current.feed = feed;
    paramsRef.current.kill = kill;
    setPreset(presetKey ?? '');
    setSliderEpoch((e) => e + 1); // re-monta los sliders con los nuevos valores
  };

  const applyPreset = (key: string) => {
    const def = RD_PRESETS.find((q) => q.key === key)!;
    applyParams(def.feed, def.kill, key);
    engineRef.current!.reset(Math.floor(Math.random() * 1e9));
  };

  /** Traduce coordenadas de pantalla a celda de la rejilla. */
  const toCell = (e: React.PointerEvent<HTMLCanvasElement>): ProbeCell => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_W);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_H);
    return {
      x: Math.max(0, Math.min(GRID_W - 1, x)),
      y: Math.max(0, Math.min(GRID_H - 1, y)),
    };
  };

  const setBrush = (e: React.PointerEvent<HTMLCanvasElement>, active: boolean) => {
    const engine = engineRef.current!;
    const c = toCell(e);
    engine.brush.x = c.x;
    engine.brush.y = c.y;
    engine.brush.active = active && toolRef.current === 'brush';
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin puntero activo (p. ej. eventos sintéticos): seguir sin capturar.
    }
    if (toolRef.current === 'probe') {
      setProbe(toCell(e));
    } else {
      setBrush(e, true);
    }
  };

  const selectTool = (t: 'brush' | 'probe') => {
    toolRef.current = t;
    setTool(t);
    if (t === 'probe') engineRef.current!.brush.active = false;
  };

  const p = paramsRef.current;

  return (
    <>
      <div className="module-grid">
        <aside className="panel side-panel">
          <h2 className="panel-title">Dos químicos, un patrón</h2>
          <p className="panel-sub">
            Turing (1952): U se alimenta desde fuera; V se reproduce comiendo U
            (U + 2V → 3V). Como V difunde más lento que U, el patrón se
            autoorganiza. Cambia f y k y cruzas todo el zoo de Turing —de la piel
            de un leopardo a la de una cebra.
          </p>

          <div className="ca-featured">
            {RD_PRESETS.map((q) => (
              <button
                key={q.key}
                className={`btn ca-chip ${preset === q.key ? 'active' : ''}`}
                onClick={() => applyPreset(q.key)}
                title={q.bio}
              >
                {q.name} <small>{q.hint}</small>
              </button>
            ))}
          </div>

          <div className="seg rd-tool">
            <button className={tool === 'brush' ? 'on' : ''} onClick={() => selectTool('brush')}>
              ✎ Pincel
            </button>
            <button className={tool === 'probe' ? 'on' : ''} onClick={() => selectTool('probe')}>
              ⌖ Sonda
            </button>
          </div>

          <Slider
            key={`f-${sliderEpoch}`}
            label="Alimentación (f)"
            min={FEED_RANGE[0]}
            max={FEED_RANGE[1]}
            step={0.0005}
            defaultValue={p.feed}
            format={(v) => v.toFixed(4)}
            onInput={(v) => (paramsRef.current.feed = v)}
            hint="Ritmo al que se repone U. Sube f y el patrón se llena de vida."
          />
          <Slider
            key={`k-${sliderEpoch}`}
            label="Eliminación (k)"
            min={KILL_RANGE[0]}
            max={KILL_RANGE[1]}
            step={0.0005}
            defaultValue={p.kill}
            format={(v) => v.toFixed(4)}
            onInput={(v) => (paramsRef.current.kill = v)}
            hint="Ritmo al que muere V. f y k juntos eligen manchas, rayas o caos."
          />
          <Slider
            label="Difusión de U (Dᵤ)"
            min={0.08}
            max={0.26}
            step={0.005}
            defaultValue={DEFAULT_RD.du}
            onInput={(v) => (paramsRef.current.du = v)}
            hint="Qué tan rápido se esparce el reactivo. Suele ser ~2× la de V."
          />
          <Slider
            label="Difusión de V (Dᵥ)"
            min={0.02}
            max={0.16}
            step={0.005}
            defaultValue={DEFAULT_RD.dv}
            onInput={(v) => (paramsRef.current.dv = v)}
            hint="El autocatalizador difunde lento: esa lentitud esculpe el patrón."
          />
          <Slider
            label="Velocidad"
            min={0.25}
            max={6}
            step={0.25}
            defaultValue={1}
            format={(v) => `${v.toFixed(2)}×`}
            onInput={(v) => (speedRef.current = v)}
            hint="Iteraciones de química por fotograma."
          />

          <div className="btn-stack">
            <button
              className="btn"
              onClick={() => engineRef.current!.reset(Math.floor(Math.random() * 1e9))}
            >
              ↺ Reiniciar (nuevas semillas)
            </button>
            <button
              className="btn"
              onClick={() => {
                playingRef.current = !playing;
                setPlaying(!playing);
              }}
            >
              {playing ? '❚❚ Pausa' : '▶ Reproducir'}
            </button>
          </div>

          <div className="didactic-note">
            <h3>Guía didáctica</h3>
            <ol>
              <li>«Mitosis»: las manchas crecen y se parten en dos, como células dividiéndose.</li>
              <li>«Laberinto»: rayas que se conectan — la cebra o la huella dactilar.</li>
              <li>«Jirafa»: parches poligonales separados por costuras finas.</li>
              <li>Con el <b>Pincel</b>, pinta para inyectar V y sembrar patrón.</li>
              <li>Con la <b>Sonda</b>, toca un punto y mira la ecuación evaluándose ahí.</li>
            </ol>
          </div>
        </aside>

        <section className="canvas-stage">
          <div className="rd-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={GRID_W}
              height={GRID_H}
              className={`rd-canvas tool-${tool}`}
              onPointerDown={onPointerDown}
              onPointerMove={(e) => tool === 'brush' && setBrush(e, e.buttons > 0)}
              onPointerUp={(e) => setBrush(e, false)}
              onPointerLeave={(e) => setBrush(e, false)}
              onPointerCancel={(e) => setBrush(e, false)}
            />
            {probe && (
              <span
                className="rd-probe-marker"
                style={{
                  left: `${((probe.x + 0.5) / GRID_W) * 100}%`,
                  top: `${((probe.y + 0.5) / GRID_H) * 100}%`,
                }}
              />
            )}
          </div>
          <StatsOverlay engineRef={engineRef} />
          <div className="stage-hint">
            GRAY-SCOTT · {tool === 'brush' ? 'pinta para sembrar V' : 'toca para medir'} · frontera toroidal
          </div>
        </section>
      </div>

      <div className="rd-instruments">
        <PhaseMap
          paramsRef={paramsRef}
          onPick={(f, k) => applyParams(f, k)}
          feedRange={FEED_RANGE}
          killRange={KILL_RANGE}
        />
        <ProbePanel
          engineRef={engineRef}
          paramsRef={paramsRef}
          probe={probe}
          onClear={() => setProbe(null)}
        />
      </div>

      <LiveFormula paramsRef={paramsRef} />
    </>
  );
}
