import { cn } from '@/lib/cn';

export interface RiskBadgeProps {
  level: 'green' | 'amber' | 'red';
  label?: string;
  className?: string;
}

const levelConfig = {
  green: { bg: 'bg-green/10', text: 'text-green', border: 'border-green/20', dot: 'bg-green' },
  amber: { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20', dot: 'bg-amber' },
  red: { bg: 'bg-red/10', text: 'text-red', border: 'border-red/20', dot: 'bg-red' },
} as const;

const defaultLabels = {
  green: 'Низкий риск',
  amber: 'Средний риск',
  red: 'Высокий риск',
} as const;

export function RiskBadge({ level, label, className }: RiskBadgeProps) {
  const cfg = levelConfig[level];
  const displayLabel = label ?? defaultLabels[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] border px-2 py-0.5',
        'text-xs font-medium',
        cfg.bg, cfg.text, cfg.border,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {displayLabel}
    </span>
  );
}
