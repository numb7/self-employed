import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { ProgressIndicator } from '../ui/ProgressIndicator';
import { calculateChasy289 } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

export function Chasy289Calculator() {
  const [hours, setHours] = useState<number | null>(null);

  // 1 обязательное поле
  const isReady = hours !== null && hours > 0;

  const result = useMemo(() => {
    if (!isReady) return null;
    return calculateChasy289(hours);
  }, [isReady, hours]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    return [
      `Часов отработано: ${result.hours}`,
      `Лимит по 289-ФЗ: ${result.limit} ч.`,
      `Использовано: ${result.percent}%`,
      `Осталось: ${result.remaining} ч.`,
    ];
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-chasy-289">
      <ControlGroup
        label="Часы у одного заказчика"
        description="По закону 289-ФЗ самозанятый не может работать на одного заказчика более 60 часов в месяц. Если превышаете — ФНС может переквалифицировать в трудовые отношения."
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chasy-hours" className="text-sm font-medium text-ink">
            Часов в этом месяце
          </label>
          <div className="flex flex-col gap-1.5">
            <input
              id="chasy-hours"
              type="text"
              inputMode="numeric"
              value={hours ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                setHours(v ? parseInt(v, 10) : null);
              }}
              placeholder="40"
              className="w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5 font-mono text-ink tabular-nums placeholder:text-faint transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 border-accent/40"
              aria-describedby="chasy-hours-hint"
            />
            <p id="chasy-hours-hint" className="text-muted text-xs">
              Например, 40
            </p>
          </div>
        </div>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">Введите количество часов, чтобы увидеть расчёт</p>
        ) : result ? (
          <ResultCard
            label={result.remaining > 0 ? 'Осталось часов' : 'Лимит исчерпан'}
            figure={result.remaining > 0 ? `${result.remaining} ч.` : '0 ч.'}
            subtitle={`Из ${result.limit} ч. использовано ${result.percent}%`}
            whyItems={whyItems}
            risk={{
              level: result.risk,
              title: result.risk === 'red'
                ? 'Превышение лимита'
                : result.risk === 'amber'
                  ? 'Близко к лимиту'
                  : 'В пределах нормы',
              description: result.risk === 'red'
                ? 'Вы превысили 60 часов. ФНС может признать вас трудоустроенным — потеряете статус самозанятого.'
                : result.risk === 'amber'
                  ? 'Осталось мало часов. Следите, чтобы не превысить лимит.'
                  : 'Часы в пределах лимита 289-ФЗ.',
            }}
            next={{ to: '/risk-trudovyh', label: 'Проверить риск переквалификации' }}
            trust={['По 289-ФЗ', 'Актуально на 2026', 'Без отправки данных']}
          >
            <ProgressIndicator
              percent={result.percent}
              label={`${result.hours} из ${result.limit} ч.`}
              color={result.risk === 'red' ? 'red' : result.risk === 'amber' ? 'amber' : 'accent'}
              className="mt-3"
            />
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
