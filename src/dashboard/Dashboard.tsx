import { View } from '../App';
import { CardPreview } from './CardPreview';

interface ModuleDef {
  code: string;
  title: string;
  desc: string;
  view?: View;
}

interface CategoryDef {
  index: string;
  name: string;
  blurb: string;
  modules: ModuleDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    index: '01',
    name: 'Fundamentos de Aprendizaje en Redes',
    blurb:
      'Cómo reglas locales simples de transferencia de información generan patrones complejos de conectividad: memoria, plasticidad y resiliencia estructural.',
    modules: [
      {
        code: 'NET·00',
        title: 'Aprendizaje en una Sinapsis (Laboratorio de 2 nodos)',
        desc: 'El punto de partida: dispara dos neuronas a mano, con control de tiempo, y observa cómo A «aprende» a disparar a B por coincidencia temporal.',
        view: 'laboratorio',
      },
      {
        code: 'NET·01',
        title: 'Propagación de Señales y Ajuste de Pesos',
        desc: 'Red hebbiana de 420 nodos con pulsos de luz, pincel de inyección de señal y poda sináptica masiva.',
        view: 'red',
      },
      {
        code: 'NET·02',
        title: 'Optimización por Enjambre (PSO)',
        desc: 'Partículas que negocian colectivamente el mínimo de un paisaje de coste.',
      },
      {
        code: 'NET·03',
        title: 'Autómatas Celulares',
        desc: 'Construye una regla local de 8 bits y observa las cuatro clases de Wolfram: orden, fractales, caos y computación al borde del caos.',
        view: 'celular',
      },
    ],
  },
  {
    index: '02',
    name: 'Agentes de IA y Sistemas Tecnosociales',
    blurb:
      'Coordinación sin comunicación directa, descomposición de información (sinergia vs redundancia) y dinámicas colectivas en ecosistemas de agentes.',
    modules: [
      {
        code: 'AGI·01',
        title: 'Coordinación Emergente y Sinergia Informacional',
        desc: 'Cuatro agentes autónomos convergen a un objetivo común usando solo el histórico del grupo. Tres paradigmas: homogéneo, especialización e inferencia (ToM).',
        view: 'agentes',
      },
      {
        code: 'AGI·02',
        title: 'Cascadas de Conformismo Colectivo',
        desc: 'Umbrales sociales y avalanchas de adopción en redes de influencia.',
      },
      {
        code: 'AGI·03',
        title: 'Dinámicas de Atención (Moltbook)',
        desc: 'Economía de la atención en plataformas pobladas por agentes.',
      },
    ],
  },
];

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
              const active = Boolean(m.view);
              return (
                <button
                  key={m.code}
                  className={`card ${active ? 'live' : 'soon'}`}
                  disabled={!active}
                  onClick={() => m.view && onOpen(m.view)}
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
