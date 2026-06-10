interface TimeControlsProps {
  playing: boolean;
  onPlayToggle: () => void;
  onStep: () => void;
  onReset: () => void;
  speeds: number[];
  speed: number;
  onSpeed: (s: number) => void;
  stepLabel?: string;
  resetLabel?: string;
}

export function TimeControls({
  playing,
  onPlayToggle,
  onStep,
  onReset,
  speeds,
  speed,
  onSpeed,
  stepLabel = '⇥ Paso a paso (+1 generación)',
  resetLabel = '↺ Reiniciar tapiz',
}: TimeControlsProps) {
  return (
    <>
      <div className="btn-stack">
        <button className="btn" onClick={onPlayToggle}>
          {playing ? '❚❚ Pausa' : '▶ Reproducir'}
        </button>
        <button
          className="btn"
          onClick={() => {
            if (playing) onPlayToggle();
            onStep();
          }}
        >
          {stepLabel}
        </button>
        <button className="btn" onClick={onReset}>
          {resetLabel}
        </button>
      </div>
      <div className="ca-speeds">
        {speeds.map((s) => (
          <button
            key={s}
            className={`btn ca-chip ${speed === s ? 'active' : ''}`}
            onClick={() => onSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </>
  );
}
