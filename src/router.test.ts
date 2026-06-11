import { describe, expect, it } from 'vitest';
import { viewFromHash, hashForView } from './router';
import type { View } from './App';

const ALL_VIEWS: View[] = [
  'dashboard', 'laboratorio', 'red', 'agentes', 'celular',
  'boids', 'nieve', 'ajedrez', 'reaccion',
];

describe('viewFromHash', () => {
  it('hash vacío → dashboard', () => {
    expect(viewFromHash('')).toBe('dashboard');
  });

  it('hash "#/" → dashboard', () => {
    expect(viewFromHash('#/')).toBe('dashboard');
  });

  it('hash "#" solo → dashboard', () => {
    expect(viewFromHash('#')).toBe('dashboard');
  });

  it('slug "dashboard" explícito → dashboard', () => {
    expect(viewFromHash('#/dashboard')).toBe('dashboard');
  });

  it('slug desconocido → dashboard (fallback seguro)', () => {
    expect(viewFromHash('#/UNKNOWN')).toBe('dashboard');
    expect(viewFromHash('#/xyz-123')).toBe('dashboard');
    expect(viewFromHash('garbage')).toBe('dashboard');
  });

  it('cada vista válida se parsea correctamente desde su hash canónico', () => {
    for (const view of ALL_VIEWS) {
      expect(viewFromHash(`#/${view}`)).toBe(view);
    }
  });
});

describe('hashForView', () => {
  it('dashboard produce "#/"', () => {
    expect(hashForView('dashboard')).toBe('#/');
  });

  it('vistas no-dashboard producen "#/<slug>"', () => {
    const nonDash = ALL_VIEWS.filter((v) => v !== 'dashboard');
    for (const view of nonDash) {
      expect(hashForView(view)).toBe(`#/${view}`);
    }
  });
});

describe('roundtrip viewFromHash(hashForView(v)) === v', () => {
  it('todas las vistas sobreviven el ciclo hash → parse', () => {
    for (const view of ALL_VIEWS) {
      expect(viewFromHash(hashForView(view))).toBe(view);
    }
  });
});
