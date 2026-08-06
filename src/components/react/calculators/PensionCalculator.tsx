import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { calculatePensionCost, calculatePensionMonths } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

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
      `Стоимость полного года: 49 500 ₽ (фиксированный взнос СФР)`,
      `1 месяц = ${formatMoney(Math.round(49_500 / 12))} ₽`,
    ];
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-pension">
      <ControlGroup
        label="Пенсионный стаж"
        description="Самозанятые могут добровольно платить фиксированные взносы в СФР за пенсионный стаж. За 1 год — 49 500 ₽ (2026)."
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Что хотите посчитать?</span>
          <SegmentedToggle
            name="pensionMode"
            value={mode}
            onChange={(v) => setMode(v as 'months' | 'amount')}
            options={[
              { value: 'months', label: 'Стоимость за N мес.' },
              { value: 'amount', label: 'Сколько месяцев за сумму' },
            ]}
          />
        </div>

        {mode === 'months' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pension-months" className="text-sm font-medium text-ink">
              Количество месяцев
            </label>
            <div className="flex flex-col gap-1.5">
              <input
                id="pension-months"
                type="text"
                inputMode="numeric"
                value={months ?? ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setMonths(v ? parseInt(v, 10) : null);
                }}
                placeholder="12"
                className="w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5 font-mono text-ink tabular-nums placeholder:text-faint transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 border-accent/40"
                aria-describedby="pension-months-hint"
              />
              <p id="pension-months-hint" className="text-muted text-xs">
                От 1 до 12 месяцев
              </p>
            </div>
          </div>
        )}

        {mode === 'amount' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pension-amount" className="text-sm font-medium text-ink">
              Сумма взносов
            </label>
            <CurrencyInput
              id="pension-amount"
              value={amount}
              onValueChange={setAmount}
              required
              placeholder="49 500"
              hint="Полный год — 49 500 ₽"
            />
          </div>
        )}
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            {mode === 'months' ? 'Введите количество месяцев' : 'Введите сумму взносов'}
          </p>
        ) : result ? (
          <ResultCard
            label={result.mode === 'costForMonths' ? 'Стоимость стажа' : 'Получите стаж'}
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
