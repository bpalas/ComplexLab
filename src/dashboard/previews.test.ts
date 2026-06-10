import { describe, it, expect } from 'vitest';
import { previewKindFor } from './previews';

describe('previewKindFor', () => {
  it('mapea los módulos con motor real a su painter', () => {
    expect(previewKindFor('NET·00')).toBe('synapse');
    expect(previewKindFor('NET·01')).toBe('network');
    expect(previewKindFor('NET·03')).toBe('cellular');
    expect(previewKindFor('AGI·01')).toBe('agents');
    expect(previewKindFor('RL·01')).toBe('chessrl');
  });

  it('mapea los módulos "Próximamente" a motivos generativos', () => {
    expect(previewKindFor('NET·02')).toBe('swarm');
    expect(previewKindFor('AGI·02')).toBe('cascade');
    expect(previewKindFor('AGI·03')).toBe('attention');
  });

  it('cae a un motivo neutro para códigos desconocidos', () => {
    expect(previewKindFor('XXX·99')).toBe('generic');
  });
});
