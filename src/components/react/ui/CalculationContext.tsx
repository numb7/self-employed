import { useState, type ReactNode } from 'react';

export function useCalculationExample() {
  const [example, setExample] = useState(true);
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => { setExample(false); setter(value); };
  }
  return { example, edit };
}

/** Plain context, not a badge or a claim that the user's facts were verified. */
export function CalculationContext({ example, children }: { example: boolean; children?: ReactNode }) {
  return <p className="calculation-context">{example ? 'Пример расчёта' : 'По указанным данным'}{children && <> · {children}</>}</p>;
}
