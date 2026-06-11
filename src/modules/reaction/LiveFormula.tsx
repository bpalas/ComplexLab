import { useEffect, useState } from 'react';
import { MathBlock } from '../../components/math/Math';
import { RDParams } from './engine';

/**
 * Las dos EDPs de Gray-Scott renderizadas con KaTeX. Dos modos conmutables:
 *  - «Símbolos»: la forma general con Dᵤ, Dᵥ, f, k.
 *  - «Con números»: los símbolos sustituidos por los valores actuales de los
 *    sliders, que se actualizan en vivo (~5 Hz) sin tocar el bucle de render.
 *
 * Cierra el lazo ecuación ↔ fenómeno: lo que ves en el lienzo es exactamente
 * esto evaluándose en cada celda.
 */
export function LiveFormula({ paramsRef }: { paramsRef: React.RefObject<RDParams> }) {
  const [numeric, setNumeric] = useState(true);
  const [, setTick] = useState(0);

  // Solo necesitamos repintar en vivo cuando mostramos números.
  useEffect(() => {
    if (!numeric) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 200);
    return () => window.clearInterval(id);
  }, [numeric]);

  const p = paramsRef.current ?? { feed: 0, kill: 0, du: 0, dv: 0 };
  const du = p.du.toFixed(3);
  const dv = p.dv.toFixed(3);
  const f = p.feed.toFixed(4);
  const kf = (p.kill + p.feed).toFixed(4);

  const uTex = numeric
    ? `\\frac{\\partial U}{\\partial t} = ${du}\\,\\nabla^2 U \\;-\\; UV^2 \\;+\\; ${f}\\,(1-U)`
    : `\\frac{\\partial U}{\\partial t} = D_u\\,\\nabla^2 U \\;-\\; UV^2 \\;+\\; f\\,(1-U)`;
  const vTex = numeric
    ? `\\frac{\\partial V}{\\partial t} = ${dv}\\,\\nabla^2 V \\;+\\; UV^2 \\;-\\; ${kf}\\,V`
    : `\\frac{\\partial V}{\\partial t} = D_v\\,\\nabla^2 V \\;+\\; UV^2 \\;-\\; (k+f)\\,V`;

  return (
    <section className="panel formula-panel rd-live">
      <div className="rd-live-head">
        <h2 className="panel-title">La ecuación, en vivo</h2>
        <div className="seg rd-live-toggle">
          <button className={numeric ? '' : 'on'} onClick={() => setNumeric(false)}>
            Símbolos
          </button>
          <button className={numeric ? 'on' : ''} onClick={() => setNumeric(true)}>
            Con números
          </button>
        </div>
      </div>
      <p className="panel-sub">
        Cada celda guarda dos números, U y V. En cada instante ambos cambian según
        estas dos ecuaciones acopladas. {numeric
          ? 'Mueve un slider y verás cómo cambian los coeficientes aquí mismo.'
          : 'Activa «Con números» y los símbolos se vuelven los valores de los sliders.'}
      </p>

      <div className="rd-eq">
        <MathBlock tex={uTex} />
        <p className="rd-eq-gloss">
          <b>U</b>, el reactivo: <span className="t-diff">difunde</span> (compárate con
          tus vecinos), se <span className="t-react">consume</span> en la reacción
          y se <span className="t-feed">repone</span> desde fuera hacia 1.
        </p>
      </div>

      <div className="rd-eq">
        <MathBlock tex={vTex} />
        <p className="rd-eq-gloss">
          <b>V</b>, el autocatalizador: <span className="t-diff">difunde lento</span> (Dᵥ &lt; Dᵤ),
          se <span className="t-react">copia a sí mismo</span> comiendo U (+UV²) y
          se <span className="t-feed">elimina</span> a tasa (k+f).
        </p>
      </div>

      <p className="formula-foot">
        Solo cambiando f y k este mismo sistema reproduce las manchas del leopardo,
        las rayas de la cebra y los parches de la jirafa. No hay un plano: el patrón
        es lo que queda cuando reacción y difusión llegan al equilibrio.
      </p>
    </section>
  );
}
