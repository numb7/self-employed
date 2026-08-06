import { cn } from '@/lib/cn';

export interface ProgressIndicatorProps {
  /** 0–100 */
  percent: number;
  /** Подпись рядом (например «68% из 2 400 000 ₽») */
  label?: string;
  /** Цвет заливки: 'accent' (default), 'green', 'amber', 'red' */
  color?: 'accent' | 'green' | 'amber' | 'red';
  className?: string;
}

const colorMap = {
  accent: 'bg-accent',
  green: 'bg-green',
  amber: 'bg-amber',
  red: 'bg-red',
} as const;

export function ProgressIndicator({
  percent,
  label,
  color = 'accent',
  className,
}: ProgressIndicatorProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="h-1.5 rounded-full bg-lavender overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]', colorMap[color])}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {label && (
        <span className="text-xs text-muted">{label}</span>
      )}
    </div>
  );
}
