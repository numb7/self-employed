import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { calculateContribution } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

const PRESETS = [
  { value: '10000', label: '10 000 ₽' },
  { value: '20000', label: '20 000 ₽' },
  { value: '30000', label: '30 000 ₽' },
  { value: 'custom', label: 'Своё' },
];

export function ContributionCalculator() {
  const [preset, setPreset] = useState('20000');
  const [customAmount, setCustomAmount] = useState<number | null>(null);

  const insuranceAmount = preset === 'custom'
    ? (customAmount && customAmount > 0 ? customAmount : null)
    : parseInt(preset, 10);

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
      <ControlGroup
        label="Параметры страховки"
        description="Самозанятые могут добровольно платить взносы на больничный. Страховая сумма — на ваш выбор, тариф — 2,9% (№ 456-ФЗ, ст. 5)."
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Страховая сумма</span>
          <SegmentedToggle
            name="insurancePreset"
            value={preset}
            onChange={setPreset}
            options={PRESETS}
          />
        </div>

        {preset === 'custom' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contribution-amount" className="text-sm font-medium text-ink">
              Введите сумму
            </label>
            <CurrencyInput
              id="contribution-amount"
              value={customAmount}
              onValueChange={setCustomAmount}
              required
              placeholder="15 000"
              hint="Минимум 12 792 ₽ (МРОТ)"
            />
          </div>
        )}
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            {preset === 'custom' ? 'Введите страховую сумму' : 'Выберите или введите страховую сумму'}
          </p>
        ) : result ? (
          <ResultCard
            label="Взнос в месяц"
            figure={`${formatMoney(result.monthlyContribution)} ₽`}
            subtitle={`Тариф 2,9% от ${formatMoney(result.insuranceAmount)} ₽`}
            detail={`Выплата при больничном: до ${formatMoney(result.payoutAfter6)} ₽ (6 мес.), до ${formatMoney(result.payoutAfter12)} ₽ (12 мес.)`}
            whyItems={whyItems}
            risk={{
              level: result.insuranceAmount < 12992 ? 'amber' : 'green',
              title: result.insuranceAmount < 12992
                ? 'Ниже МРОТ'
                : 'Страховая сумма в норме',
              description: result.insuranceAmount < 12992
                ? 'Сумма ниже МРОТ — пособие может быть ограничено.'
                : 'Страховая сумма не ниже МРОТ, пособие рассчитается от полной суммы.',
            }}
            next={{ to: '/pensiya', label: 'Пенсионный стаж' }}
            trust={['По 456-ФЗ', 'Актуально на 2026', 'Без отправки данных']}
          >
            <div className="mt-3 rounded-[var(--radius-card)] bg-lavender p-3">
              <p className="text-sm font-medium text-ink">Взносы за год</p>
              <p className="font-mono text-lg text-ink mt-0.5">{formatMoney(result.yearCost)} ₽</p>
              <p className="text-xs text-muted mt-1">С учётом скидки с 19-го месяца (10%) и с 25-го (30%)</p>
            </div>
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
