import 'katex/dist/katex.min.css';
import { renderTex } from './render';

/** Fórmula en bloque (centrada, tamaño display). */
export function MathBlock({ tex }: { tex: string }) {
  return (
    <div
      className="math-block"
      dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }}
    />
  );
}

/** Fórmula en línea, dentro de un párrafo de texto. */
export function MathInline({ tex }: { tex: string }) {
  return (
    <span
      className="math-inline"
      dangerouslySetInnerHTML={{ __html: renderTex(tex, false) }}
    />
  );
}
