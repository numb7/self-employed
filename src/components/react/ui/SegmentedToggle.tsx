import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption {
  value: string;
  label: ReactNode;
}

export interface SegmentedToggleProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
  /** Стиль варианта: 'default' — filled thumb, 'ghost' — outline only */
  variant?: 'default' | 'ghost';
}

export function SegmentedToggle({
  options,
  value,
  onChange,
  name,
  className,
  variant = 'default',
}: SegmentedToggleProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'relative inline-flex rounded-[var(--radius-card)] p-0.5',
        variant === 'default' && 'bg-lavender',
        variant === 'ghost' && 'border border-line',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            name={name}
            value={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 rounded-[calc(var(--radius-card)-2px)] px-3.5 py-1.5',
              'text-sm font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              // Inactive
              !isActive && 'text-muted hover:text-ink',
              // Active
              isActive && variant === 'default' && 'bg-surface text-ink shadow-[var(--shadow-card-rest)]',
              isActive && variant === 'ghost' && 'bg-accent text-white',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
