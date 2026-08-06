import { cn } from '@/lib/cn';

export interface TrustStripProps {
  items: string[];
  className?: string;
}

export function TrustStrip({ items, className }: TrustStripProps) {
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1', className)}>
      {items.map((text, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs text-faint">
          <svg className="w-3 h-3 text-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {text}
        </span>
      ))}
    </div>
  );
}
