import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ResultCardProps {
  /** Заголовок результата (например «Взнос в месяц») */
  label: string;
  /** Большое число (например «1 200 ₽») */
  figure: string;
  /** Подпись под числом (например «4% от 30 000 ₽») */
  subtitle?: string;
  /** Дополнительная информация: «можно тратить X ₽» */
  detail?: string;
  /** Почему столько — раскрывающийся блок */
  whyItems?: string[];
  /** Индикатор риска */
  risk?: { level: 'green' | 'amber' | 'red'; title: string; description?: string };
  /** Ссылка на связанный инструмент */
  next?: { to: string; label: string };
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
  next,
  trust,
  children,
  className,
}: ResultCardProps) {
  return (
    <div
      className={cn(
        'result-card rounded-[var(--radius-card)] bg-surface border border-line p-5',
        'shadow-[var(--shadow-card-rest)]',
        'animate-[resultAppear_300ms_var(--ease-out)]',
        className,
      )}
    >
      {/* Label + Big number */}
      <p className="text-muted text-sm">{label}</p>
      <p className="font-mono text-3xl tabular-nums text-ink mt-0.5">{figure}</p>

      {subtitle && (
        <p className="text-muted text-sm mt-1">{subtitle}</p>
      )}

      {detail && (
        <p className="text-ink-2 text-sm font-medium mt-2">{detail}</p>
      )}

      {/* Divider */}
      {(whyItems || risk || children) && (
        <div className="border-t border-line my-4" />
      )}

      {/* Why list */}
      {whyItems && whyItems.length > 0 && (
        <WhySection items={whyItems} />
      )}

      {/* Risk badge */}
      {risk && (
        <RiskSection level={risk.level} title={risk.title} description={risk.description} />
      )}

      {/* Extra content */}
      {children}

      {/* Next action */}
      {next && (
        <a
          href={next.to}
          className="result-card__next inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-accent hover:text-accent-2 transition-colors"
        >
          <span>{next.label}</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      )}

      {/* Trust strip */}
      {trust && trust.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 pt-3 border-t border-line">
          {trust.map((text, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs text-faint">
              <svg className="w-3 h-3 text-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Internal sub-components ---- */

function WhySection({ items }: { items: string[] }) {
  return (
    <details className="group mt-2">
      <summary className="inline-flex items-center gap-1.5 text-sm font-medium text-muted cursor-pointer hover:text-ink transition-colors select-none">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>Почему столько</span>
      </summary>
      <ul className="mt-2 space-y-1 pl-6 text-sm text-muted">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-faint select-none">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function RiskSection({
  level,
  title,
  description,
}: {
  level: 'green' | 'amber' | 'red';
  title: string;
  description?: string;
}) {
  const colorMap = {
    green: 'bg-green/10 text-green border-green/20',
    amber: 'bg-amber/10 text-amber border-amber/20',
    red: 'bg-red/10 text-red border-red/20',
  };

  return (
    <div className={cn('mt-2 rounded-[var(--radius-card)] border p-3', colorMap[level])}>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>{title}</span>
      </div>
      {description && (
        <p className="text-sm mt-1 opacity-80">{description}</p>
      )}
    </div>
  );
}
