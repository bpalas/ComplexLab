import { useEffect, useState } from 'react';
import type { View } from './App';

/** Vistas válidas distintas al dashboard, mapeadas 1:1 a su slug de hash. */
const VIEWS: readonly View[] = [
  'dashboard',
  'laboratorio',
  'red',
  'agentes',
  'celular',
  'boids',
  'nieve',
  'ajedrez',
];

const VIEW_SET = new Set<string>(VIEWS);

/** Convierte el hash actual (p. ej. '#/ajedrez') en una View validada. */
export function viewFromHash(hash: string): View {
  // Quita el prefijo '#/' o '#'. '' y '/' → dashboard.
  const slug = hash.replace(/^#\/?/, '');
  if (slug === '' || slug === 'dashboard') return 'dashboard';
  return VIEW_SET.has(slug) ? (slug as View) : 'dashboard';
}

/** Hash canónico para una View. */
export function hashForView(view: View): string {
  return view === 'dashboard' ? '#/' : `#/${view}`;
}

/**
 * Hook de enrutamiento por hash. La vista se deriva siempre del hash
 * (única fuente de verdad). `navigate` actualiza el hash, que a su vez
 * dispara 'hashchange' y refresca la vista.
 */
export function useHashView(): [View, (view: View) => void] {
  const [view, setViewState] = useState<View>(() =>
    viewFromHash(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setViewState(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    // Re-sincroniza por si el hash cambió entre el render inicial y el efecto.
    onHashChange();
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: View) => {
    const nextHash = hashForView(next);
    if (window.location.hash === nextHash) {
      // Mismo hash: no se dispara 'hashchange', forzamos la sincronía.
      setViewState(next);
    } else {
      window.location.hash = nextHash;
    }
  };

  return [view, navigate];
}
