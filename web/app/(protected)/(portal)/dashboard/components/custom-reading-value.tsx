import { useLayoutEffect, useRef } from 'react';

import { formatReading } from '../lib/sensor-meta';

type CustomReadingValueProps = {
  value: number | null;
  decimals: number;
};

const TWEEN_MS = 240;

const CustomReadingValue = ({ value, decimals }: CustomReadingValueProps) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const shownValueRef = useRef(value);

  // Writes to the DOM directly so a tween doesn't re-render the tile on every frame
  useLayoutEffect(() => {
    const element = elementRef.current;
    const from = shownValueRef.current;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    shownValueRef.current = value;

    if (!element || value === null || from === null || from === value || isReducedMotion) return undefined;

    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / TWEEN_MS, 1);
      const current = from + (value - from) * (1 - (1 - progress) ** 3);
      shownValueRef.current = current;
      element.textContent = formatReading(current, decimals);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    element.textContent = formatReading(from, decimals);
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, decimals]);

  return (
    <span ref={elementRef} className="text-4xl font-semibold tracking-tight tabular-nums">
      {value === null ? '—' : formatReading(value, decimals)}
    </span>
  );
};

export default CustomReadingValue;
