import { describe, expect, it } from 'vitest';
import { ElementaryCA } from './engine';

/** Renderiza el array de células como string '·#' para asserts legibles. */
function row(ca: ElementaryCA): string {
  return Array.from(ca.cells, (c) => (c ? '#' : '·')).join('');
}

describe('ElementaryCA', () => {
  it('regla 90 desde célula única genera el triángulo de Sierpiński', () => {
    const ca = new ElementaryCA(11, 90);
    ca.setSeed('single');
    expect(row(ca)).toBe('·····#·····');
    ca.step();
    expect(row(ca)).toBe('····#·#····');
    ca.step();
    expect(row(ca)).toBe('···#···#···');
    ca.step();
    expect(row(ca)).toBe('··#·#·#·#··');
    ca.step();
    expect(row(ca)).toBe('·#·······#·');
    expect(ca.generation).toBe(4);
  });

  it('regla 0 mata todo en un paso', () => {
    const ca = new ElementaryCA(16, 0);
    ca.setSeed('random', 0.5, () => 0.3); // rng constante < densidad ⇒ todo vivo
    ca.step();
    expect(Array.from(ca.cells).every((c) => c === 0)).toBe(true);
  });

  it('regla 255 enciende todo en un paso desde cualquier estado', () => {
    const ca = new ElementaryCA(16, 255);
    ca.setSeed('single');
    ca.step();
    expect(Array.from(ca.cells).every((c) => c === 1)).toBe(true);
  });

  it('la frontera es toroidal (la señal cruza el borde)', () => {
    // Regla 2 (00000010): solo '001' produce 1 ⇒ la célula viva "viaja" a la izquierda.
    const ca = new ElementaryCA(5, 2);
    ca.setSeed('single'); // ··#··
    ca.step(); // ·#···
    ca.step(); // #····
    ca.step(); // debe envolver: ····#
    expect(row(ca)).toBe('····#');
  });

  it('toggleRuleBit es involutivo y consistente con setRule', () => {
    const ca = new ElementaryCA(8, 110);
    ca.toggleRuleBit(7);
    expect(ca.rule).toBe(110 ^ 128);
    ca.toggleRuleBit(7);
    expect(ca.rule).toBe(110);
    ca.setRule(300); // se trunca a 8 bits
    expect(ca.rule).toBe(300 & 255);
  });

  it('setSeed single resetea la generación y centra la célula', () => {
    const ca = new ElementaryCA(9, 30);
    ca.step();
    ca.step();
    ca.setSeed('single');
    expect(ca.generation).toBe(0);
    expect(row(ca)).toBe('····#····');
  });

  it('setSeed random respeta la densidad con rng inyectado', () => {
    const ca = new ElementaryCA(4, 30);
    const seq = [0.1, 0.9, 0.2, 0.8];
    let k = 0;
    ca.setSeed('random', 0.5, () => seq[k++]);
    expect(row(ca)).toBe('#·#·');
  });
});
