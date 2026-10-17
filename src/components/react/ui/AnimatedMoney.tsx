import { useEffect, useRef, useState } from 'react';

/** Visual interpolation only; assistive technology receives the exact final value. */
export function AnimatedMoney({ value, suffix = ' ₽', digits = 0 }: { value:number; suffix?:string; digits?:number }) {
  const format=(v:number)=>v.toLocaleString('ru-RU',{maximumFractionDigits:digits});
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value); previous.current = value; return;
    }
    const startValue = previous.current;
    let frame = 0;
    const start = performance.now();
    const tick = (now:number) => {
      const progress = Math.min(1, (now - start) / 180);
      const next = startValue + (value - startValue) * (1 - Math.pow(1 - progress, 3));
      previous.current = next; setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span aria-label={`${format(value)}${suffix}`}><span aria-hidden="true">{format(display)}{suffix}</span></span>;
}
