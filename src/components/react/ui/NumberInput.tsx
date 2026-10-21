import { type InputHTMLAttributes, forwardRef, useState, useId } from 'react';
import { cn } from '@/lib/cn';
import { parseNumberDraft } from '@/lib/number-input';

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Числовое значение (без форматирования) */
  value: number | null;
  /** Callback с числовым значением */
  onValueChange?: (value: number | null) => void;
  onValidityChange?: (valid: boolean) => void;
  /** Показывать ли подсветку незаполненного обязательного поля */
  required?: boolean;
  /** Минимальное значение */
  min?: number;
  /** Максимальное значение */
  max?: number;
  /** Только целые числа; неверный черновик сохраняется */
  integer?: boolean;
  /** Суффикс после числа (например « ч.», « мес.») */
  suffix?: string;
  /** Отображать ли ошибку */
  error?: string;
  /** Подсказка под полем */
  hint?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, onValidityChange, required, min = 0, max = Number.MAX_SAFE_INTEGER, integer, suffix, error, hint, className, id, placeholder, ...rest }, ref) => {
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const [draft, setDraft] = useState<string | null>(null);
    const parsed = parseNumberDraft(draft ?? String(value ?? ''), integer, min, max);
    const inputError = error || (parsed.kind === 'invalid'
      ? `Укажите ${integer ? 'целое неотрицательное число' : 'неотрицательное число'}${min > 0 ? ` от ${min}` : ''}${max < Number.MAX_SAFE_INTEGER ? ` до ${max}` : ''}.`
      : required && draft !== null && parsed.kind === 'empty' ? 'Укажите число.' : undefined);
    const displayValue = draft ?? (value === null ? '' : String(value));

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <input
          {...rest}
          id={inputId}
          ref={ref}
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          value={displayValue}
          onChange={e => {
            const raw = e.target.value;
            setDraft(raw);
            const next = parseNumberDraft(raw, integer, min, max);
            onValueChange?.(next.value);
            onValidityChange?.(next.kind !== 'invalid' && (!required || next.kind !== 'empty'));
          }}
          onBlur={e => { if (parsed.kind !== 'invalid') setDraft(null); rest.onBlur?.(e); }}
          placeholder={placeholder ?? '0'}
          min={min}
          max={max}
          className={cn(
            'min-h-11 w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5',
            'font-mono text-ink tabular-nums',
            'placeholder:text-faint',
            'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'outline-none',
            // Focus
            'focus:border-accent focus:ring-1 focus:ring-accent/30',
            // Error
            inputError && 'border-red',
            // Required & empty — soft accent border hint
            required && value === null && !inputError && 'border-accent/40',
            // Default
            !inputError && !(required && value === null) && 'border-line hover:border-line-2',
          )}
          aria-invalid={inputError ? 'true' : undefined}
          aria-describedby={
            inputError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
        />
        {suffix && <span className="text-xs text-muted" aria-hidden="true">{suffix}</span>}
        {inputError && (
          <p id={`${inputId}-error`} className="text-red text-xs" role="alert">
            {inputError}
          </p>
        )}
        {hint && !inputError && (
          <p id={`${inputId}-hint`} className="text-muted text-xs">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

NumberInput.displayName = 'NumberInput';
export { NumberInput };
