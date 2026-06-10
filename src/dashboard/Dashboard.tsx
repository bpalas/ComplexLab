import { View } from '../App';
import { CardPreview } from './CardPreview';
import { CATEGORIES } from '../modules/registry';

export function Dashboard({ onOpen }: { onOpen: (v: View) => void }) {
  return (
    <div className="dashboard">
      <header className="hero">
        <p className="hero-kicker">Experimentos interactivos</p>
        <h1>Experimentos de sistemas complejos</h1>
        <p className="hero-sub">
          Ajusta parámetros y perturba modelos de redes, autómatas y agentes
          directamente en el navegador. Cada experimento corre en vivo.
        </p>
      </header>

      {CATEGORIES.map((cat) => (
        <section key={cat.index} className="category">
          <div className="category-head">
            <span className="category-index">{cat.index}</span>
            <div>
              <h2>{cat.name}</h2>
              <p>{cat.blurb}</p>
            </div>
          </div>
          <div className="card-grid">
            {cat.modules.map((m) => {
              const active = Boolean(m.component);
              return (
                <button
                  key={m.code}
                  className={`card ${active ? 'live' : 'soon'}`}
                  disabled={!active}
                  onClick={() => active && onOpen(m.id)}
                >
                  <CardPreview code={m.code} />
                  <div className="card-top">
                    <span className="card-badge">Experimento</span>
                    <span className={`card-tag ${active ? 'on' : ''}`}>
                      {active ? 'En vivo' : 'Próximamente'}
                    </span>
                  </div>
                  <span className="card-code">{m.code}</span>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                  {active && <span className="card-cta">Probar →</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
