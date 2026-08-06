import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ControlGroupProps {
  /** Заголовок группы полей */
  label?: string;
  /** Описание / подсказка */
  description?: string;
  /** Поля ввода */
  children: ReactNode;
  /** Отображать ли рамку карточки */
  bordered?: boolean;
  className?: string;
}

export function ControlGroup({
  label,
  description,
  children,
  bordered = true,
  className,
}: ControlGroupProps) {
  return (
    <div
      className={cn(
        bordered && 'rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card-rest)]',
        className,
      )}
    >
      {(label || description) && (
        <div className="mb-3">
          {label && (
            <h3 className="font-head text-sm font-medium text-ink">{label}</h3>
          )}
          {description && (
            <p className="text-xs text-muted mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}
