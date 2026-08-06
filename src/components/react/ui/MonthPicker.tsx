import { cn } from '@/lib/cn';
import { MONTHS } from '@/lib/format';

export interface MonthPickerProps {
  /** Текущий выбранный месяц (1-12) */
  value: number;
  onChange: (month: number) => void;
  /** Месяцы, которые можно выбрать (1-12), по умолчанию все */
  availableMonths?: number[];
  className?: string;
}

export function MonthPicker({
  value,
  onChange,
  availableMonths,
  className,
}: MonthPickerProps) {
  const available = availableMonths ?? Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} role="listbox" aria-label="Выберите месяц">
      {MONTHS.map((name, idx) => {
        const month = idx + 1;
        const isActive = month === value;
        const isDisabled = !available.includes(month);

        return (
          <button
            key={month}
            type="button"
            role="option"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => onChange(month)}
            className={cn(
              'rounded-[var(--radius-badge)] px-2.5 py-1',
              'text-xs font-medium transition-colors duration-[var(--duration-fast)]',
              'outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              // Disabled
              isDisabled && 'cursor-not-allowed text-faint/50',
              // Inactive
              !isActive && !isDisabled && 'bg-lavender text-muted hover:bg-lavender-2 hover:text-ink',
              // Active
              isActive && 'bg-accent text-white',
            )}
          >
            {name.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}
