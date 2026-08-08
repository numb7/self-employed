import { useState, useMemo } from 'react';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { calculateContribution } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

const PRESETS = [
  { value: '35000', label: '35 000 ₽' },
  { value: '50000', label: '50 000 ₽' },
];

export function ContributionCalculator() {
  const [preset, setPreset] = useState('35000');
  const insuranceAmount = parseInt(preset, 10);

  const isReady = insuranceAmount !== null && insuranceAmount > 0;

  const result = useMemo(() => {
    if (!isReady || !insuranceAmount) return null;
    return calculateContribution(insuranceAmount);
  }, [isReady, insuranceAmount]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    return result.whyItems;
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-contribution">
      <ControlGroup label="Добровольное страхование">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Страховая сумма</span>
          <SegmentedToggle
            name="insurancePreset"
            value={preset}
            onChange={setPreset}
            options={PRESETS}
          />
        </div>

        <p className="text-xs text-muted">Это два варианта страховой суммы, предусмотренные экспериментом СФР.</p>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {isReady && result ? (
          <ResultCard
            label="Ежемесячный взнос"
            figure={`${formatMoney(result.monthlyContribution)} ₽`}
            subtitle={`Тариф 3,84% от ${formatMoney(result.insuranceAmount)} ₽`}
            detail={`Расчётная база пособия: ${formatMoney(result.payoutAfter6)} ₽ после 6 мес., ${formatMoney(result.payoutAfter12)} ₽ после 12 мес.`}
            whyItems={whyItems}
            risk={{
              level: 'green',
              label: 'Вариант СФР',
            }}
            next={{ to: '/pensiya', label: 'Пенсионный стаж' }}
            trust={['По 456-ФЗ', 'СФР 2026', 'Без отправки данных']}
          >
            <div className="mt-3 rounded-[var(--radius-card)] bg-lavender p-3">
              <p className="text-sm font-medium text-ink">Взносы за год</p>
              <p className="font-mono text-lg text-ink mt-0.5">{formatMoney(result.yearCost)} ₽</p>
              <p className="text-xs text-muted mt-1">Без будущих скидок за непрерывную уплату</p>
              <p className="mt-2 text-xs text-muted">Фактическая выплата зависит от страхового стажа и количества дней больничного.</p>
            </div>
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
