import { useEffect, useRef } from 'react';
import { paintPreview } from './previews';

const W = 360;
const H = 150;

/** Lienzo estático con el render representativo de un experimento.
 *  Pinta una sola vez al montar; sin requestAnimationFrame. */
export function CardPreview({ code }: { code: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    paintPreview(code, ctx, W, H);
  }, [code]);

  return (
    <div className="card-preview" aria-hidden="true">
      <canvas ref={ref} style={{ width: '100%', height: `${H}px` }} />
    </div>
  );
}
