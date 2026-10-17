import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RiskBadge } from './RiskBadge';
import { DetailsAccordion } from './DetailsAccordion';

export interface ResultCardProps {
  /** Заголовок результата (например «Взнос в месяц») */
  label: string;
  /** Большое число (например «1 200 ₽») */
  figure: string;
  /** Подпись под числом (например «4% от 30 000 ₽») */
  subtitle?: string;
  /** Дополнительная информация: «можно тратить X ₽» */
  detail?: string;
  /** Как рассчитали — раскрывающийся блок */
  whyItems?: string[];
  /** Индикатор риска — показывается в шапке рядом с label */
  risk?: { level: 'green' | 'amber' | 'red'; label?: string };
  /** Trust strip тексты */
  trust?: string[];
  /** Дополнительный контент в нижней части */
  children?: ReactNode;
  /** CSS-класс */
  className?: string;
}

export function ResultCard({
  label,
  figure,
  subtitle,
  detail,
  whyItems,
  risk,
  children,
  className,
}: ResultCardProps) {
  return (
    <div
      className={cn(
        'result-card rounded-[var(--radius-card)] bg-accent-soft border border-accent/15 p-5',
        'shadow-[var(--shadow-card-rest)]',
        'animate-[resultAppear_300ms_var(--ease-out)]',
        className,
      )}
    >
      {/* Label + RiskBadge */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="min-w-0 text-muted text-sm">{label}</h2>
        {risk && (
          <RiskBadge level={risk.level} label={risk.label} />
        )}
      </div>

      {/* Big number */}
      <p className="mt-1 break-words font-head font-semibold text-3xl sm:text-4xl leading-tight tabular-nums text-ink">{figure}</p>

      {subtitle && (
        <p className="text-muted text-sm mt-1">{subtitle}</p>
      )}

      {detail && (
        <p className="text-ink-2 text-sm font-medium mt-2">{detail}</p>
      )}

      {/* Divider */}
      {(whyItems || children) && (
        <div className="border-t border-line my-4" />
      )}

      {/* Why accordion (closed by default) */}
      {whyItems && whyItems.length > 0 && (
        <DetailsAccordion title="Как рассчитали" icon="info">
          <ul className="mt-2 space-y-1 pl-6 text-sm text-muted">
            {whyItems.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-faint select-none">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </DetailsAccordion>
      )}

      {/* Extra content */}
      {children}


    </div>
  );
}
