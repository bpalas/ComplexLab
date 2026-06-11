import { useEffect, useRef, useState } from 'react';
import { RDParams, RD_REGIONS, classifyRegion } from './engine';

interface PhaseMapProps {
  paramsRef: React.RefObject<RDParams>;
  /** Salta a estos (f,k) al hacer clic en el mapa o en una región. */
  onPick: (feed: number, kill: number) => void;
  feedRange: [number, number];
  killRange: [number, number];
}

const W = 300;
const H = 220;
const PAD = { l: 34, r: 12, t: 12, b: 28 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

/**
 * El mapa f–k del «zoo de Turing». Eje X = f (alimentación), eje Y = k
 * (eliminación). Cada región está etiquetada con su lectura biológica; un punto
 * marca el (f,k) actual y se mueve al ajustar sliders o elegir preset. Clic en
 * el mapa salta a ese régimen. Las fronteras son ilustrativas, no rigurosas.
 */
export function PhaseMap({ paramsRef, onPick, feedRange, killRange }: PhaseMapProps) {
  const [, setTick] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 200);
    return () => window.clearInterval(id);
  }, []);

  const [fMin, fMax] = feedRange;
  const [kMin, kMax] = killRange;
  const fx = (f: number) => PAD.l + ((f - fMin) / (fMax - fMin)) * PLOT_W;
  const ky = (k: number) => PAD.t + (1 - (k - kMin) / (kMax - kMin)) * PLOT_H;

  const p = paramsRef.current ?? { feed: fMin, kill: kMin, du: 0, dv: 0 };
  const cf = Math.max(fMin, Math.min(fMax, p.feed));
  const ck = Math.max(kMin, Math.min(kMax, p.kill));
  const here = classifyRegion(p.feed, p.kill);

  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const f = fMin + ((px - PAD.l) / PLOT_W) * (fMax - fMin);
    const k = kMin + (1 - (py - PAD.t) / PLOT_H) * (kMax - kMin);
    onPick(
      Math.max(fMin, Math.min(fMax, f)),
      Math.max(kMin, Math.min(kMax, k)),
    );
  };

  return (
    <div className="panel rd-phasemap">
      <h2 className="panel-title">Mapa f–k · el zoo de Turing</h2>
      <p className="panel-sub">
        Dos números deciden el patrón. Aquí está parado tu sistema:{' '}
        <b>{here.name}</b> — {here.bio}. Toca el mapa para saltar entre regímenes
        (cebra ↔ leopardo ↔ jirafa…).
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="rd-phasemap-svg"
        onClick={pick}
        role="img"
        aria-label="Mapa del plano f–k con las regiones del zoo de Turing"
      >
        {/* marco y rejilla */}
        <rect x={PAD.l} y={PAD.t} width={PLOT_W} height={PLOT_H} className="pm-frame" />
        {[0.25, 0.5, 0.75].map((t) => (
          <g key={t}>
            <line x1={PAD.l + t * PLOT_W} y1={PAD.t} x2={PAD.l + t * PLOT_W} y2={PAD.t + PLOT_H} className="pm-grid" />
            <line x1={PAD.l} y1={PAD.t + t * PLOT_H} x2={PAD.l + PLOT_W} y2={PAD.t + t * PLOT_H} className="pm-grid" />
          </g>
        ))}

        {/* regiones (centros etiquetados) */}
        {RD_REGIONS.map((r) => {
          const active = r.key === here.key;
          return (
            <g
              key={r.key}
              className={`pm-region ${active ? 'on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onPick(r.feed, r.kill);
              }}
            >
              <circle cx={fx(r.feed)} cy={ky(r.kill)} r={active ? 6 : 4} className="pm-dot" />
              <text x={fx(r.feed)} y={ky(r.kill) - 8} className="pm-label" textAnchor="middle">
                {r.name}
              </text>
            </g>
          );
        })}

        {/* punto actual (cruz) */}
        <g className="pm-here" pointerEvents="none">
          <line x1={fx(cf) - 7} y1={ky(ck)} x2={fx(cf) + 7} y2={ky(ck)} />
          <line x1={fx(cf)} y1={ky(ck) - 7} x2={fx(cf)} y2={ky(ck) + 7} />
          <circle cx={fx(cf)} cy={ky(ck)} r={3.2} />
        </g>

        {/* ejes */}
        <text x={PAD.l + PLOT_W / 2} y={H - 6} className="pm-axis" textAnchor="middle">
          f · alimentación →
        </text>
        <text x={10} y={PAD.t + PLOT_H / 2} className="pm-axis" textAnchor="middle" transform={`rotate(-90 10 ${PAD.t + PLOT_H / 2})`}>
          k · eliminación →
        </text>
      </svg>
      <p className="rd-phasemap-foot">
        f = {p.feed.toFixed(4)} · k = {p.kill.toFixed(4)}. Fronteras ilustrativas
        (mapa didáctico, no clasificación rigurosa).
      </p>
    </div>
  );
}
