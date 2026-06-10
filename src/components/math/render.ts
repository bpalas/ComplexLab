import katex from 'katex';

/**
 * Convierte una expresión LaTeX a HTML con KaTeX.
 * Nunca lanza: ante TeX inválido devuelve el error renderizado en línea,
 * para que un typo en una fórmula no tumbe el módulo completo.
 */
export function renderTex(tex: string, displayMode = false): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: false,
    output: 'html',
  });
}
