import { describe, it, expect } from 'vitest';
import { renderTex } from './render';

describe('renderTex', () => {
  it('renderiza LaTeX a HTML de KaTeX', () => {
    const html = renderTex('\\alpha + \\beta');
    expect(html).toContain('katex');
    expect(html).toContain('α');
    expect(html).toContain('β');
  });

  it('modo display envuelve en katex-display', () => {
    expect(renderTex('x^2', true)).toContain('katex-display');
    expect(renderTex('x^2', false)).not.toContain('katex-display');
  });

  it('no lanza con TeX inválido', () => {
    expect(() => renderTex('\\frac{1}')).not.toThrow();
  });
});
