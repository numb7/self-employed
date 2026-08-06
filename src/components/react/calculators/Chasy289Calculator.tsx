import { useState, useMemo } from 'react';
import { NumberInput } from '../ui/NumberInput';
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
      <ControlGroup label="Часы">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chasy-hours" className="text-sm font-medium text-ink">
            Сколько часов отработали?
          </label>
          <NumberInput
            id="chasy-hours"
            value={hours}
            onValueChange={setHours}
            required
            integer
            suffix="ч."
            placeholder="40"
            hint="Лимит — 60 ч. в месяц по 289-ФЗ"
          />
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
              label: result.risk === 'red'
                ? 'Превышение'
                : result.risk === 'amber'
                  ? 'Близко к лимиту'
                  : 'В норме',
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
