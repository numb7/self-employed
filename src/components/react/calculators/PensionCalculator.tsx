import { useState, useMemo } from 'react';
import { NumberInput } from '../ui/NumberInput';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { calculatePensionCost, calculatePensionMonths } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { RULES_2026 } from '@/lib/rules-2026';

export function PensionCalculator() {
  const [mode, setMode] = useState<'months' | 'amount'>('months');
  const [months, setMonths] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  // Один из двух: либо месяцы, либо сумма
  const isReady = mode === 'months'
    ? months !== null && months > 0
    : amount !== null && amount > 0;

  const result = useMemo(() => {
    if (!isReady) return null;
    if (mode === 'months' && months) return calculatePensionCost(months);
    if (mode === 'amount' && amount) return calculatePensionMonths(amount);
    return null;
  }, [isReady, mode, months, amount]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    if (result.mode === 'costForMonths') {
      return [
        `Стоимость полного года: ${formatMoney(Math.round(result.cost / result.months * 12))} ₽`,
        `Стоимость 1 месяца: ${formatMoney(Math.round(result.cost / result.months))} ₽`,
        `Доля года: ${result.pctOfFullYear}%`,
      ];
    }
    return [
      `Стоимость полного года: ${formatMoney(Math.round(RULES_2026.pension.fullYearCost))} ₽ (фиксированный взнос СФР)`,
      `1 месяц = ${formatMoney(Math.round(RULES_2026.pension.fullYearCost / 12))} ₽`,
    ];
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-pension">
      <ControlGroup label="Пенсионный стаж">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Какой расчёт нужен?</span>
          <SegmentedToggle
            name="pensionMode"
            value={mode}
            onChange={(v) => setMode(v as 'months' | 'amount')}
            options={[
              { value: 'months', label: 'Стоимость за период' },
              { value: 'amount', label: 'Стаж по сумме взноса' },
            ]}
          />
        </div>

        {mode === 'months' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pension-months" className="text-sm font-medium text-ink">
              Период стажа
            </label>
            <NumberInput
              id="pension-months"
              value={months}
              onValueChange={setMonths}
              required
              integer
              suffix="мес."
              placeholder="12"
              hint="От 1 до 12 месяцев"
            />
          </div>
        )}

        {mode === 'amount' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pension-amount" className="text-sm font-medium text-ink">
              Сумма взноса
            </label>
            <CurrencyInput
              id="pension-amount"
              value={amount}
              onValueChange={setAmount}
              required
              placeholder="71 525"
              hint={`Полный год — ${formatMoney(Math.round(RULES_2026.pension.fullYearCost))} ₽`}
            />
          </div>
        )}
      </ControlGroup>

      <div aria-live="polite" role="status">
        {isReady && result ? (
          <ResultCard
            label={result.mode === 'costForMonths' ? 'Стоимость стажа' : 'Стаж по указанной сумме'}
            figure={
              result.mode === 'costForMonths'
                ? `${formatMoney(result.cost)} ₽`
                : `${result.months} мес.`
            }
            subtitle={
              result.mode === 'costForMonths'
                ? `За ${result.months} мес. (${result.pctOfFullYear}% года)`
                : `За ${formatMoney(result.amount)} ₽`
            }
            whyItems={whyItems}
            next={{ to: '/bolnichny', label: 'Взносы на больничный' }}
            trust={['СФР 2026', 'Фиксированный взнос', 'Без отправки данных']}
          />
        ) : null}
      </div>
    </div>
  );
}
