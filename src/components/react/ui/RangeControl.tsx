import { useId, useState, type CSSProperties } from 'react';

type Props = { label: string; value: number; onChange: (v: number) => void; min?: number; max: number; step?: number; suffix?: string; limit?: number };

/** One editable number, with an optional slider for quick adjustment. */
export function RangeControl({ label, value, onChange, min = 0, max, step = 1000, suffix = ' ₽', limit = 100000000 }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const digits = suffix.includes('ч') ? 1 : 0;
  const format = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: digits });
  const raw = draft ?? String(value);
  const parsed = Number(raw.replace(/\s/g, '').replace(',', '.'));
  const valid = raw.trim() !== '' && /^\d+(?:[.,]\d+)?$/.test(raw.replace(/\s/g, '')) && Number.isFinite(parsed) && parsed >= min && parsed <= limit && (digits ? Math.abs(parsed * 10 - Math.round(parsed * 10)) < 0.000001 : Number.isInteger(parsed));
  function update(text: string) {
    setDraft(text);
    const n = Number(text.replace(/\s/g, '').replace(',', '.'));
    const clean = text.replace(/\s/g, '');
    if (/^\d+(?:[.,]\d+)?$/.test(clean) && Number.isFinite(n) && n >= min && n <= limit && (digits ? Math.abs(n * 10 - Math.round(n * 10)) < 0.000001 : Number.isInteger(n))) onChange(n);
  }
  return <div className="range-control clear-range">
    <label className="clear-range-label" htmlFor={`${id}-number`}>{label}</label>
    <div className="clear-range-value"><input id={`${id}-number`} name={`${id}-value`} autoComplete="off" type="text" inputMode={digits ? 'decimal' : 'numeric'} value={draft ?? format(value)} onChange={e => update(e.target.value)} onBlur={() => { if (valid) setDraft(null); }} aria-invalid={draft !== null && !valid} aria-describedby={draft !== null && !valid ? `${id}-error` : undefined} /><span>{suffix}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/></svg></div>
    {draft !== null && !valid && <p className="clear-range-error" id={`${id}-error`} role="alert">Укажите {digits ? 'число с точностью до десятых' : 'целое число'} от {format(min)} до {format(limit)}. Расчёт пока для {format(value)}{suffix}{suffix.trim().endsWith('.') ? '' : '.'}</p>}
    {value <= max && <input className="payment-range" type="range" min={min} max={max} step={step} value={value} onChange={e => { setDraft(null); onChange(Number(e.target.value)); }} aria-label={`Изменить: ${label}`} aria-valuetext={`${format(value)}${suffix}`} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as CSSProperties} />}
  </div>;
}
