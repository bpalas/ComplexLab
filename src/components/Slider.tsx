import { useState } from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (v: number) => string;
  hint?: string;
  /**
   * Muta directamente los parámetros del motor de simulación.
   * El re-render queda confinado a este componente: el bucle de Canvas
   * nunca se ve afectado por el estado de React.
   */
  onInput: (v: number) => void;
}

export function Slider({ label, min, max, step, defaultValue, format, hint, onInput }: SliderProps) {
  const [value, setValue] = useState(defaultValue);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="ctl">
      <div className="ctl-head">
        <span className="ctl-label">{label}</span>
        <span className="ctl-val">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${pct}%` } as React.CSSProperties}
        onInput={(e) => {
          const v = parseFloat(e.currentTarget.value);
          setValue(v);
          onInput(v);
        }}
      />
      {hint && <p className="ctl-hint">{hint}</p>}
    </div>
  );
}
