import { type InputHTMLAttributes, forwardRef } from 'react';
import { NumericFormat } from 'react-number-format';
import { cn } from '@/lib/cn';

export interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'defaultValue'> {
  /** Числовое значение (без форматирования) */
  value: number | null;
  /** Callback с числовым значением */
  onValueChange?: (value: number | null) => void;
  /** Показывать ли подсветку незаполненного обязательного поля */
  required?: boolean;
  /** Отображать ли ошибку */
  error?: string;
  /** Подсказка под полем */
  hint?: string;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, required, error, hint, className, id, placeholder, ...rest }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <NumericFormat
          {...rest}
          id={id}
          getInputRef={ref}
          type="text"
          inputMode="numeric"
          placeholder={placeholder ?? '0'}
          value={value ?? null}
          onValueChange={({ value: v }) => {
            const num = v === '' ? null : parseFloat(v);
            onValueChange?.(Number.isFinite(num) ? num : null);
          }}
          thousandSeparator=" "
          decimalSeparator=","
          decimalScale={0}
          allowNegative={false}
          suffix=" ₽"
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
            required && (value === null || value === 0) && !error
              && 'border-accent/40',
            // Default
            !error && !(required && (value === null || value === 0))
              && 'border-line hover:border-line-2',
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

CurrencyInput.displayName = 'CurrencyInput';
export { CurrencyInput };
