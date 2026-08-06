import { type InputHTMLAttributes, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/cn';

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Числовое значение (без форматирования) */
  value: number | null;
  /** Callback с числовым значением */
  onValueChange?: (value: number | null) => void;
  /** Показывать ли подсветку незаполненного обязательного поля */
  required?: boolean;
  /** Минимальное значение */
  min?: number;
  /** Максимальное значение */
  max?: number;
  /** Только целые числа (фильтрует точку и запятую) */
  integer?: boolean;
  /** Суффикс после числа (например « ч.», « мес.») */
  suffix?: string;
  /** Отображать ли ошибку */
  error?: string;
  /** Подсказка под полем */
  hint?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, required, min, max, integer, suffix, error, hint, className, id, placeholder, ...rest }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;
        if (integer) {
          raw = raw.replace(/\D/g, '');
        } else {
          raw = raw.replace(/[^0-9.,]/g, '');
        }

        if (raw === '') {
          onValueChange?.(null);
          return;
        }

        const num = parseFloat(raw.replace(',', '.'));
        onValueChange?.(Number.isFinite(num) ? num : null);
      },
      [integer, onValueChange],
    );

    const displayValue = value !== null ? (integer ? Math.round(value) : value) : '';
    const displaySuffix = suffix ? ` ${suffix}` : '';

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <input
          {...rest}
          id={id}
          ref={ref}
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          value={displayValue === '' ? '' : `${displayValue}${displaySuffix}`}
          onChange={handleChange}
          placeholder={placeholder ?? '0'}
          min={min}
          max={max}
          className={cn(
            'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5',
            'font-mono text-ink tabular-nums',
            'placeholder:text-faint',
            'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'outline-none',
            // Focus
            'focus:border-accent focus:ring-1 focus:ring-accent/30',
            // Error
            error && 'border-red',
            // Required & empty — soft accent border hint
            required && value === null && !error && 'border-accent/40',
            // Default
            !error && !(required && value === null) && 'border-line hover:border-line-2',
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
        />
        {error && (
          <p id={`${id}-error`} className="text-red text-xs" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${id}-hint`} className="text-muted text-xs">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

NumberInput.displayName = 'NumberInput';
export { NumberInput };
