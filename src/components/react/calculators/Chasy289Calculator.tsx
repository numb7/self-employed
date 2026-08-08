import { useState, useMemo } from 'react';
import { NumberInput } from '../ui/NumberInput';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { ProgressIndicator } from '../ui/ProgressIndicator';
import { calculateChasy289 } from '@/lib/calculations';

export function Chasy289Calculator() {
  const [hours, setHours] = useState<number | null>(null);
  const [consecutiveMonths, setConsecutiveMonths] = useState<number | null>(null);

  // 1 обязательное поле
  const isReady = hours !== null && hours >= 0 && consecutiveMonths !== null && consecutiveMonths > 0;

  const result = useMemo(() => {
    if (!isReady) return null;
    return calculateChasy289(hours, consecutiveMonths);
  }, [isReady, hours, consecutiveMonths]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    return [
      `Часов отработано: ${result.hours}`,
      `Часов в месяц у одного заказчика через платформу: ${result.hours}`,
      `Такой объём сохраняется: ${result.consecutiveMonths} мес. подряд`,
      'Критерий: больше 60 часов в месяц в течение 6 месяцев подряд',
    ];
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-chasy-289">
      <ControlGroup label="Работа через цифровую платформу" description="Критерий применяется к исполнителям, которые получают заказы через посредническую цифровую платформу.">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chasy-hours" className="text-sm font-medium text-ink">
            Часов в месяц у одного заказчика
          </label>
          <NumberInput
            id="chasy-hours"
            value={hours}
            onValueChange={setHours}
            required
            integer
            suffix="ч."
            placeholder="40"
            hint="Укажите обычный объём работы за один месяц"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chasy-months" className="text-sm font-medium text-ink">
            Сколько месяцев подряд
          </label>
          <NumberInput
            id="chasy-months"
            value={consecutiveMonths}
            onValueChange={setConsecutiveMonths}
            required
            integer
            suffix="мес."
            placeholder="6"
            hint="Критерий учитывает период от 6 месяцев подряд"
          />
        </div>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {isReady && result ? (
          <ResultCard
            label="Предварительная проверка критерия"
            figure={result.criterionMet ? 'Критерий выполнен' : 'Критерий не выполнен'}
            subtitle={result.criterionMet
              ? `Больше 60 часов сохраняется ${result.consecutiveMonths} мес. подряд`
              : result.hours > result.limit
                ? `Часы превышены, но период пока меньше 6 месяцев`
                : `Не больше 60 часов в месяц`
            }
            whyItems={whyItems}
            risk={{
              level: result.risk,
              label: result.risk === 'red'
                ? 'Требует проверки'
                : result.risk === 'amber'
                  ? 'Обратите внимание'
                  : 'Критерий не выполнен',
            }}
            next={{ to: '/risk-trudovyh', label: 'Проверить риск переквалификации' }}
            trust={['По 289-ФЗ', 'С 01.10.2026', 'Без отправки данных']}
          >
            <ProgressIndicator
              percent={result.percent}
              label={`${result.hours} ч. в месяц · ${result.consecutiveMonths} мес. подряд`}
              color={result.risk === 'red' ? 'red' : result.risk === 'amber' ? 'amber' : 'accent'}
              className="mt-3"
            />
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
