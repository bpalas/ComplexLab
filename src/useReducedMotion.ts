import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `true` si el sistema del usuario pide movimiento reducido
 * (`prefers-reduced-motion: reduce`). Los módulos animados lo usan para
 * arrancar en pausa en lugar de lanzar animación constante sin consentimiento:
 * accesibilidad básica para evitar mareos. El usuario siempre puede pulsar
 * «reproducir». Reacciona en vivo a cambios de la preferencia del sistema.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
