import { ReactNode } from 'react';
import { MathBlock } from './Math';

interface FormulaPanelProps {
  title: string;
  /** Texto introductorio: qué describe el modelo, en lenguaje llano. */
  intro?: ReactNode;
  /** Ecuación maestra del modelo (LaTeX): TODO el modelo en una línea. */
  master?: string;
  /** Pie opcional bajo la ecuación maestra (qué significa cada término). */
  masterCaption?: ReactNode;
  children?: ReactNode;
  foot?: ReactNode;
}

/**
 * Panel didáctico de matemáticas, común a todos los módulos: introducción,
 * ecuación maestra destacada y una grilla de FormulaCard que la desglosan.
 */
export function FormulaPanel({ title, intro, master, masterCaption, children, foot }: FormulaPanelProps) {
  return (
    <section className="panel formula-panel">
      <h2 className="panel-title">{title}</h2>
      {intro && <p className="panel-sub">{intro}</p>}
      {master && (
        <div className="formula-master">
          <MathBlock tex={master} />
          {masterCaption && <p className="formula-master-caption">{masterCaption}</p>}
        </div>
      )}
      {children && <div className="formula-grid">{children}</div>}
      {foot && <div className="formula-foot">{foot}</div>}
    </section>
  );
}

interface FormulaCardProps {
  /** Expresión LaTeX de la regla. */
  tex: string;
  title: string;
  children: ReactNode;
}

/** Una regla del modelo: su fórmula y su explicación en fácil. */
export function FormulaCard({ tex, title, children }: FormulaCardProps) {
  return (
    <div className="formula">
      <MathBlock tex={tex} />
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}
