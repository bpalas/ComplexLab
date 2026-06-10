import { useEffect, useRef } from 'react';

interface StatChartProps {
  series: number[];
  color: string;
  /** Etiqueta corta del valor actual (p. ej. "G" o "|δ|"). */
  label: string;
  min: number;
  max: number;
  /** Línea de referencia horizontal opcional (en unidades de la serie). */
  refLine?: number;
  window?: number;
}

/** Gráfico de líneas con serie cruda + media móvil exponencial. */
export function StatChart({ series, color, label, min, max, refLine, window: win = 240 }: StatChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width;
    const h = 130;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padL = 34;
    const padR = 8;
    const padT = 8;
    const padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);

    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(125, 150, 165, 0.55)';
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.08)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const yy = padT + (plotH * g) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(w - padR, yy);
      ctx.stroke();
      ctx.fillText((max - ((max - min) * g) / 4).toFixed(1), 4, yy + 3);
    }
    ctx.fillText('episodios →', w - padR - 60, h - 5);

    const data = series.slice(-win);
    if (data.length < 2) {
      ctx.fillStyle = 'rgba(125, 150, 165, 0.6)';
      ctx.fillText('esperando episodios…', padL + 8, padT + plotH / 2);
      return;
    }

    const x = (i: number) => padL + (plotW * i) / (data.length - 1);
    const y = (v: number) => padT + plotH * (1 - Math.max(0, Math.min(1, (v - min) / (max - min))));

    if (refLine !== undefined) {
      ctx.strokeStyle = 'rgba(255, 93, 143, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y(refLine));
      ctx.lineTo(w - padR, y(refLine));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Serie cruda
    ctx.strokeStyle = color.replace('1)', '0.3)');
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    data.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Media móvil exponencial: la tendencia de aprendizaje
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let ema = data[0];
    data.forEach((v, i) => {
      ema = ema * 0.92 + v * 0.08;
      if (i === 0) ctx.moveTo(x(i), y(ema));
      else ctx.lineTo(x(i), y(ema));
    });
    ctx.stroke();

    const lastV = data[data.length - 1];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x(data.length - 1), y(ema), 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`${label} ${lastV.toFixed(2)}`, padL + 4, padT + 10);
  }, [series, color, label, min, max, refLine, win]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} />
    </div>
  );
}
