import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PARAMS,
  PULSE_GAIN,
  SandboxEngine,
  SandboxParams,
  SandboxReadout,
} from './engine';
import { Slider } from '../../components/Slider';

const NODE_COLOR = ['#45e6c8', '#ffb454']; // A = cian, B = ámbar
const STEP_DT = 0.04; // s por clic en "paso"
const SPEEDS = [
  { label: '0.25×', mult: 0.25 },
  { label: '1×', mult: 1 },
  { label: '2×', mult: 2 },
];

/** Punto sobre el arco curvo de una sinapsis dirigida. */
function arcPoint(
  ax: number, ay: number, bx: number, by: number, bow: number, p: number,
) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  const q = 1 - p;
  return {
    x: q * q * ax + 2 * q * p * cx + p * p * bx,
    y: q * q * ay + 2 * q * p * cy + p * p * by,
  };
}

export function SandboxSim() {
  const engineRef = useRef<SandboxEngine | null>(null);
  if (!engineRef.current) engineRef.current = new SandboxEngine();
  const engine = engineRef.current;

  const paramsRef = useRef<SandboxParams>({ ...DEFAULT_PARAMS });
  const playingRef = useRef(false);
  const speedRef = useRef(1);

  const stageRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const weightRef = useRef<HTMLCanvasElement>(null);
  const rasterRef = useRef<HTMLCanvasElement>(null);

  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [demo, setDemo] = useState(false);
  const [r, setR] = useState<SandboxReadout>(engine.readout(DEFAULT_PARAMS));

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = SPEEDS[speedIdx].mult;
  }, [speedIdx]);

  // --- Bucle único de render + simulación ---
  useEffect(() => {
    const main = mainRef.current!;
    const weight = weightRef.current!;
    const raster = rasterRef.current!;
    const mctx = main.getContext('2d')!;
    const wctx = weight.getContext('2d')!;
    const rctx = raster.getContext('2d')!;
    const dims = { mw: 0, mh: 0, ww: 0, wh: 0, rw: 0, rh: 0 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const fit = (cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      const rect = cv.getBoundingClientRect();
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: rect.width, h: rect.height };
    };
    const resize = () => {
      const m = fit(main, mctx);
      dims.mw = m.w;
      dims.mh = m.h;
      const w = fit(weight, wctx);
      dims.ww = w.w;
      dims.wh = w.h;
      const r2 = fit(raster, rctx);
      dims.rw = r2.w;
      dims.rh = r2.h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stageRef.current!);
    ro.observe(weight.parentElement!);
    ro.observe(raster.parentElement!);

    let raf = 0;
    let last = performance.now();
    let frame = 0;

    const loop = (now: number) => {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        engine.update(real * speedRef.current, paramsRef.current);
      }
      drawMain(mctx, dims.mw, dims.mh, engine, paramsRef.current);
      drawWeight(wctx, dims.ww, dims.wh, engine, paramsRef.current);
      drawRaster(rctx, dims.rw, dims.rh, engine, paramsRef.current);

      if (frame++ % 6 === 0) {
        setR(engine.readout(paramsRef.current));
        setDemo(engine.demoActive);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [engine]);

  const fireA = () => engine.fire(0, paramsRef.current.threshold);
  const fireB = () => engine.fire(1, paramsRef.current.threshold);
  const fireBoth = () => {
    engine.fire(0, paramsRef.current.threshold);
    engine.fire(1, paramsRef.current.threshold);
  };
  const stepOnce = () => engine.update(STEP_DT, paramsRef.current);

  const runDemo = (kind: 'coactivacion' | 'desfasado' | 'probar') => {
    engine.startDemo(kind, paramsRef.current.threshold);
    setPlaying(true);
  };

  // Narración dinámica del estado de aprendizaje
  const narrative = r.canTrigger
    ? { cls: 'ok', text: '¡A aprendió a disparar a B! La sinapsis A→B superó el umbral: ahora una señal de A basta para activar B sola.' }
    : r.wAB > DEFAULT_PARAMS.threshold / PULSE_GAIN * 0.6
      ? { cls: 'mid', text: 'La sinapsis A→B se está fortaleciendo. Sigue co-activándolas: cuando la curva cruce la línea punteada, A podrá disparar a B sin ayuda.' }
      : { cls: '', text: 'Disparar A todavía no basta para activar B. Co-actívalas (A e inmediatamente B) para que la conexión aprenda por coincidencia temporal.' };

  return (
    <div className="sandbox-layout">
      <aside className="panel side-panel">
        <h2 className="panel-title">Experimento controlado</h2>
        <p className="panel-sub">
          Dos neuronas, una sinapsis. Dispáralas a mano y observa la regla de Hebb
          en su forma más pura: lo que dispara junto, se conecta.
        </p>

        <div className="fire-pad">
          <button className="fire-btn a" onClick={fireA}>
            <span>DISPARAR</span><b>A</b>
          </button>
          <button className="fire-btn b" onClick={fireB}>
            <span>DISPARAR</span><b>B</b>
          </button>
        </div>
        <button className="btn fire-both" onClick={fireBoth}>
          ⚡ Co-activar A + B (juntas)
        </button>

        <div className="demo-block">
          <h3>Demostraciones guiadas</h3>
          <button className="btn" onClick={() => runDemo('coactivacion')}>
            ▶ Coactivación repetida → aprende
          </button>
          <button className="btn" onClick={() => runDemo('desfasado')}>
            ▶ Disparo desfasado → no aprende
          </button>
          <button className="btn" onClick={() => runDemo('probar')}>
            ▶ Probar: ¿A dispara a B sola?
          </button>
          {demo && (
            <button className="btn btn-warn" onClick={() => engine.cancelDemo()}>
              ❚❚ Detener demostración
            </button>
          )}
        </div>

        <Slider
          label="Umbral de disparo"
          min={0.5} max={1.8} step={0.01}
          defaultValue={DEFAULT_PARAMS.threshold}
          onInput={(v) => (paramsRef.current.threshold = v)}
          hint="Carga necesaria para que una neurona dispare."
        />
        <Slider
          label="Tasa de aprendizaje"
          min={0.02} max={0.5} step={0.01}
          defaultValue={DEFAULT_PARAMS.learningRate}
          onInput={(v) => (paramsRef.current.learningRate = v)}
          hint="Cuánto se fortalece la sinapsis en cada coincidencia (LTP)."
        />
        <Slider
          label="Ventana de correlación"
          min={0.05} max={0.6} step={0.01}
          defaultValue={DEFAULT_PARAMS.window}
          format={(v) => `${(v * 1000).toFixed(0)} ms`}
          onInput={(v) => (paramsRef.current.window = v)}
          hint="El «juntas» de Hebb: margen temporal que cuenta como coincidencia."
        />
        <Slider
          label="Tasa de olvido"
          min={0} max={0.25} step={0.005}
          defaultValue={DEFAULT_PARAMS.decayRate}
          format={(v) => v.toFixed(3)}
          onInput={(v) => (paramsRef.current.decayRate = v)}
          hint="Velocidad con la que la sinapsis se debilita sin uso."
        />

        <button className="btn btn-warn reset-btn" onClick={() => engine.reset()}>
          ↺ Reiniciar experimento
        </button>
      </aside>

      <section className="sandbox-main">
        <div className={`narrative ${narrative.cls}`}>{narrative.text}</div>

        <div ref={stageRef} className="sandbox-stage">
          <canvas ref={mainRef} />
          <div className="time-controls">
            <button className="tctl" onClick={() => setPlaying((p) => !p)}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button className="tctl" onClick={stepOnce} disabled={playing} title="Avanzar un paso">
              ▸▏
            </button>
            <div className="seg small">
              {SPEEDS.map((s, i) => (
                <button key={s.label} className={i === speedIdx ? 'on' : ''} onClick={() => setSpeedIdx(i)}>
                  {s.label}
                </button>
              ))}
            </div>
            <span className="clock">t = {r.time.toFixed(2)}s</span>
            <span className={`trigger-light ${r.canTrigger ? 'on' : ''}`}>
              {r.canTrigger ? '● A→B APRENDIDA' : '○ A→B DÉBIL'}
            </span>
          </div>
        </div>

        <div className="sandbox-charts">
          <div className="chart-card">
            <h3>Fuerza de la sinapsis en el tiempo</h3>
            <div className="chart-box"><canvas ref={weightRef} /></div>
            <p className="chart-legend">
              <i className="dot a" /> A→B &nbsp; <i className="dot b" /> B→A &nbsp;
              <i className="dash" /> umbral para que A dispare a B sola
            </p>
          </div>
          <div className="chart-card">
            <h3>Cronología de disparos (raster)</h3>
            <div className="chart-box"><canvas ref={rasterRef} /></div>
            <p className="chart-legend">
              La banda sombreada tras cada disparo de A es la ventana de correlación:
              un disparo de B dentro de ella refuerza A→B.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Renderizadores de canvas (fuera del camino de React)
// ============================================================================

function drawMain(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  eng: SandboxEngine, params: SandboxParams,
) {
  ctx.clearRect(0, 0, w, h);
  const ax = w * 0.28;
  const bx = w * 0.72;
  const cy = h * 0.5;
  const R = Math.max(34, Math.min(58, Math.min(w, h) * 0.16));
  const pos = [
    { x: ax, y: cy },
    { x: bx, y: cy },
  ];

  // --- Sinapsis (dos arcos curvos opuestos) ---
  const drawSynapse = (from: number, to: number, bow: number, color: string) => {
    const e = eng.edge(from, to);
    const a = pos[from];
    const b = pos[to];
    const mid = arcPoint(a.x, a.y, b.x, b.y, bow, 0.5);
    const start = arcPoint(a.x, a.y, b.x, b.y, bow, 0.16);
    const end = arcPoint(a.x, a.y, b.x, b.y, bow, 0.84);

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25 + e.w * 0.6;
    ctx.lineWidth = 1.5 + e.w * 11;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(
      mid.x + (mid.x - (start.x + end.x) / 2),
      mid.y + (mid.y - (start.y + end.y) / 2),
      end.x, end.y,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Punta de flecha
    const tip = arcPoint(a.x, a.y, b.x, b.y, bow, 0.86);
    const pre = arcPoint(a.x, a.y, b.x, b.y, bow, 0.8);
    const ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 11 * Math.cos(ang - 0.4), tip.y - 11 * Math.sin(ang - 0.4));
    ctx.lineTo(tip.x - 11 * Math.cos(ang + 0.4), tip.y - 11 * Math.sin(ang + 0.4));
    ctx.fill();

    // Etiqueta de peso
    ctx.fillStyle = color;
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${from === 0 ? 'A' : 'B'}→${to === 0 ? 'A' : 'B'}  w=${e.w.toFixed(2)}`,
      mid.x, mid.y + (bow > 0 ? -10 : 18),
    );
  };
  drawSynapse(0, 1, -R - 26, NODE_COLOR[0]);
  drawSynapse(1, 0, R + 26, NODE_COLOR[1]);

  // --- Pulsos viajando ---
  for (const pl of eng.pulses) {
    const bow = pl.from === 0 ? -R - 26 : R + 26;
    const a = pos[pl.from];
    const b = pos[pl.to];
    const pt = arcPoint(a.x, a.y, b.x, b.y, bow, 0.16 + pl.p * 0.68);
    ctx.fillStyle = 'rgba(255,248,230,0.25)';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Neuronas como "vasos" que se llenan de carga ---
  for (let i = 0; i < 2; i++) {
    const n = eng.nodes[i];
    const p = pos[i];
    const color = NODE_COLOR[i];
    const frac = Math.max(0, Math.min(1, n.a / params.threshold));

    if (n.flash > 0.02) {
      ctx.fillStyle = color;
      ctx.globalAlpha = n.flash * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + 6 + n.flash * 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Relleno de carga (recortado al círculo)
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.clip();
    const fillTop = p.y + R - 2 * R * frac;
    const grad = ctx.createLinearGradient(0, p.y + R, 0, p.y - R);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,255,255,0.85)');
    ctx.globalAlpha = 0.32 + frac * 0.5;
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - R, fillTop, R * 2, p.y + R - fillTop);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Aro del nodo
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.stroke();

    // Marca de umbral (borde superior del vaso)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - R, p.y - R + 3);
    ctx.lineTo(p.x + R, p.y - R + 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Etiqueta
    ctx.fillStyle = color;
    ctx.font = '700 26px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i === 0 ? 'A' : 'B', p.x, p.y - R - 14);
    ctx.fillStyle = 'rgba(125,150,165,0.8)';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(i === 0 ? 'estímulo' : 'respuesta', p.x, p.y + R + 20);
  }
  ctx.textAlign = 'left';
}

function drawWeight(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  eng: SandboxEngine, params: SandboxParams,
) {
  ctx.clearRect(0, 0, w, h);
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 16;
  const pw = w - padL - padR;
  const ph = h - padT - padB;
  const yOf = (v: number) => padT + ph * (1 - v);

  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.strokeStyle = 'rgba(86,232,213,0.08)';
  ctx.fillStyle = 'rgba(125,150,165,0.55)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (ph * g) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    ctx.fillText((1 - g / 4).toFixed(2), 2, y + 3);
  }

  // Línea de umbral de disparo (w al que A activa a B sola)
  const trig = params.threshold / 1.7;
  ctx.strokeStyle = 'rgba(255,93,143,0.7)';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padL, yOf(trig));
  ctx.lineTo(w - padR, yOf(trig));
  ctx.stroke();
  ctx.setLineDash([]);

  const n = eng.histT.length;
  if (n < 2) {
    ctx.fillStyle = 'rgba(125,150,165,0.6)';
    ctx.fillText('dispara las neuronas para registrar…', padL + 6, padT + ph / 2);
    return;
  }
  const xOf = (i: number) => padL + (pw * i) / (n - 1);
  const line = (arr: number[], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    arr.forEach((v, i) => (i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v))));
    ctx.stroke();
  };
  line(eng.histBA, 'rgba(255,180,84,0.55)', 1.4);
  line(eng.histAB, '#45e6c8', 2.2);

  // Punto final A→B
  const lastV = eng.histAB[n - 1];
  ctx.fillStyle = lastV >= trig ? '#56e8d5' : '#ffb454';
  ctx.beginPath();
  ctx.arc(xOf(n - 1), yOf(lastV), 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawRaster(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  eng: SandboxEngine, params: SandboxParams,
) {
  ctx.clearRect(0, 0, w, h);
  const padL = 26;
  const span = 6; // s visibles
  const t1 = eng.time;
  const t0 = t1 - span;
  const xOf = (t: number) => padL + ((t - t0) / span) * (w - padL - 8);
  const rowY = [h * 0.34, h * 0.72];

  // Etiquetas de fila
  ctx.font = '700 12px "Chakra Petch", sans-serif';
  ctx.fillStyle = NODE_COLOR[0];
  ctx.fillText('A', 8, rowY[0] + 4);
  ctx.fillStyle = NODE_COLOR[1];
  ctx.fillText('B', 8, rowY[1] + 4);
  ctx.strokeStyle = 'rgba(86,232,213,0.08)';
  ctx.beginPath();
  rowY.forEach((y) => {
    ctx.moveTo(padL, y);
    ctx.lineTo(w - 8, y);
  });
  ctx.stroke();

  // Ventana de correlación tras cada disparo de A
  for (const s of eng.spikes) {
    if (s.node !== 0 || s.t < t0) continue;
    const x0 = xOf(s.t);
    const x1 = xOf(Math.min(t1, s.t + params.window));
    ctx.fillStyle = 'rgba(69,230,200,0.1)';
    ctx.fillRect(x0, rowY[0] - 14, x1 - x0, rowY[1] - rowY[0] + 28);
  }

  // Marcas de disparo
  for (const s of eng.spikes) {
    if (s.t < t0) continue;
    const x = xOf(s.t);
    const y = rowY[s.node];
    ctx.strokeStyle = s.evoked ? '#fff8e6' : NODE_COLOR[s.node];
    ctx.lineWidth = s.evoked ? 2.4 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x, y + 11);
    ctx.stroke();
  }

  // Marca de "ahora"
  ctx.strokeStyle = 'rgba(125,150,165,0.4)';
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(xOf(t1), 4);
  ctx.lineTo(xOf(t1), h - 4);
  ctx.stroke();
  ctx.setLineDash([]);
}
