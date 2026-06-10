import { useEffect, useRef } from 'react';

const WINDOW = 60;

/** Gráfico de líneas temporal: error de coordinación colectiva por ronda. */
export function ConvergenceChart({ series }: { series: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width;
    const h = 150;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padL = 30;
    const padR = 10;
    const padT = 10;
    const padB = 20;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);

    // Retícula
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(125, 150, 165, 0.55)';
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.08)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = padT + (plotH * g) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText((1 - g / 4).toFixed(1), 6, y + 3);
    }
    ctx.fillText('rondas →', w - padR - 52, h - 6);

    const data = series.slice(-WINDOW);
    if (data.length < 2) {
      ctx.fillStyle = 'rgba(125, 150, 165, 0.6)';
      ctx.fillText('esperando rondas…', padL + 8, padT + plotH / 2);
      return;
    }

    const x = (i: number) => padL + (plotW * i) / (data.length - 1);
    const y = (v: number) => padT + plotH * Math.max(0, Math.min(1, v));

    // Serie cruda
    ctx.strokeStyle = 'rgba(86, 232, 213, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    data.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.stroke();

    // Media móvil exponencial (tendencia de convergencia)
    ctx.strokeStyle = 'rgba(255, 180, 84, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let ema = data[0];
    data.forEach((v, i) => {
      ema = ema * 0.72 + v * 0.28;
      if (i === 0) ctx.moveTo(x(i), y(ema));
      else ctx.lineTo(x(i), y(ema));
    });
    ctx.stroke();

    // Punto y valor actual
    const lastV = data[data.length - 1];
    ctx.fillStyle = '#56e8d5';
    ctx.beginPath();
    ctx.arc(x(data.length - 1), y(lastV), 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 180, 84, 0.9)';
    ctx.fillText(`err ${lastV.toFixed(2)}`, padL + 4, padT + 10);
  }, [series]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} />
    </div>
  );
}
