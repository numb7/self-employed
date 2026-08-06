import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DetailsAccordionProps {
  /** Заголовок аккордеона */
  title: string;
  /** Иконка перед заголовком */
  icon?: 'info' | 'warning' | 'shield';
  /** Открыт по умолчанию */
  defaultOpen?: boolean;
  /** Содержимое */
  children?: ReactNode;
  className?: string;
}

const iconPaths: Record<string, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  warning: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

export function DetailsAccordion({
  title,
  icon,
  defaultOpen = false,
  children,
  className,
}: DetailsAccordionProps) {
  return (
    <details
      className={cn('group mt-2', className)}
      open={defaultOpen}
    >
      <summary className="inline-flex items-center gap-1.5 text-sm font-medium text-muted cursor-pointer hover:text-ink transition-colors select-none list-none">
        <svg
          className="w-4 h-4 shrink-0 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] group-open:rotate-0 -rotate-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {icon && (
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {iconPaths[icon]}
          </svg>
        )}
        <span>{title}</span>
      </summary>
      <div className="accordion-content overflow-hidden">
        {children}
      </div>
    </details>
  );
}
