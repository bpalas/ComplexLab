import { describe, it, expect } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  it('usa el valor guardado cuando es "light"', () => {
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('usa el valor guardado cuando es "dark"', () => {
    expect(resolveInitialTheme('dark', true)).toBe('dark');
  });

  it('ignora valores guardados no válidos y cae al sistema', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark');
    expect(resolveInitialTheme('banana', false)).toBe('light');
  });

  it('sin valor guardado, sigue prefers-color-scheme', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });
});
