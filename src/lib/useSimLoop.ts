import { MutableRefObject, useEffect, useRef, useState } from 'react';

export interface SimLoopControls {
  playing: boolean;
  setPlaying(p: boolean): void;
  stepOnce(): void;
  speedRef: MutableRefObject<number>;
}

export function useSimLoop(
  onFrame: (dt: number) => void,
  onStep?: (dt: number) => void,
  opts?: { initialPlaying?: boolean },
): SimLoopControls {
  const initialPlaying = opts?.initialPlaying ?? false;
  const [playing, setPlayingState] = useState(initialPlaying);

  const playingRef = useRef(initialPlaying);
  const stepOnceRef = useRef(false);
  const speedRef = useRef(1);

  // Keep a ref to the latest callbacks so the RAF loop doesn't need to remount
  const onFrameRef = useRef(onFrame);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onFrameRef.current = onFrame;
  });
  useEffect(() => {
    onStepRef.current = onStep;
  });

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        onFrameRef.current(dt);
      } else if (stepOnceRef.current) {
        stepOnceRef.current = false;
        const stepFn = onStepRef.current ?? onFrameRef.current;
        stepFn(dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // mount once only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPlaying = (p: boolean) => {
    playingRef.current = p;
    setPlayingState(p);
  };

  const stepOnce = () => {
    stepOnceRef.current = true;
  };

  return { playing, setPlaying, stepOnce, speedRef };
}
