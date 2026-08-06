import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { MonthPicker } from '../ui/MonthPicker';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { ProgressIndicator } from '../ui/ProgressIndicator';
import { calculateIncomeRemaining, calculateIncomeWhenLimit } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

export function IncomeLimitCalculator() {
  const [mode, setMode] = useState<'remaining' | 'forecast'>('remaining');
  const [earned, setEarned] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [avgMonthly, setAvgMonthly] = useState<number | null>(null);

  // remaining mode: earned + month
  const isReadyRemaining = earned !== null && earned > 0;
  // forecast mode: earned + month + avg monthly
  const isReadyForecast = earned !== null && earned > 0 && avgMonthly !== null && avgMonthly > 0;
  const isReady = mode === 'remaining' ? isReadyRemaining : isReadyForecast;

  const remainingResult = useMemo(() => {
    if (mode !== 'remaining' || !isReadyRemaining) return null;
    return calculateIncomeRemaining(earned!, currentMonth);
  }, [mode, isReadyRemaining, earned, currentMonth]);

  const forecastResult = useMemo(() => {
    if (mode !== 'forecast' || !isReadyForecast) return null;
    return calculateIncomeWhenLimit(earned!, currentMonth, avgMonthly!);
  }, [mode, isReadyForecast, earned, currentMonth, avgMonthly]);

  const result = remainingResult ?? forecastResult;

  const whyItems = useMemo(() => {
    if (!result) return [];
    if (result.mode === 'remaining') {
      return [
        `Лимит дохода: 2 400 000 ₽`,
        `Заработано: ${formatMoney(result.earned)} ₽ (${result.earnedPercent}%)`,
        `Месяцев осталось: ${result.monthsLeft}`,
        `Безопасный темп: ${formatMoney(result.safePace)} ₽/мес.`,
      ];
    }
    return [
      `Лимит дохода: 2 400 000 ₽`,
      `Заработано: ${formatMoney(result.earned)} ₽`,
      `Осталось: ${formatMoney(result.remaining)} ₽`,
      result.willReach
        ? `Лимит достигнут в: ${result.limitMonthName ?? '—'} (мес. ${result.limitMonth})`
        : 'Лимит не будет достигнут в этом году',
    ];
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-income-limit">
      <ControlGroup
        label="Доход в этом году"
        description="Лимит дохода для самозанятых — 2 400 000 ₽ в год. При превышении — потеря статуса и переход на НДФЛ 13%."
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Режим расчёта</span>
          <SegmentedToggle
            name="limitMode"
            value={mode}
            onChange={(v) => setMode(v as 'remaining' | 'forecast')}
            options={[
              { value: 'remaining', label: 'Сколько осталось' },
              { value: 'forecast', label: 'Когда достигну лимит' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="limit-earned" className="text-sm font-medium text-ink">
            Заработано за год
          </label>
          <CurrencyInput
            id="limit-earned"
            value={earned}
            onValueChange={setEarned}
            required
            placeholder="1 200 000"
            hint="Весь доход с 1 января"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Текущий месяц</span>
          <MonthPicker
            value={currentMonth}
            onChange={setCurrentMonth}
          />
        </div>

        {mode === 'forecast' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="limit-avg" className="text-sm font-medium text-ink">
              Средний доход в месяц
            </label>
            <CurrencyInput
              id="limit-avg"
              value={avgMonthly}
              onValueChange={setAvgMonthly}
              required={mode === 'forecast'}
              placeholder="200 000"
              hint="Средняя сумма дохода за месяц"
            />
          </div>
        )}
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            {mode === 'remaining'
              ? 'Введите заработанный доход, чтобы увидеть остаток'
              : 'Заполните все поля, чтобы увидеть прогноз'}
          </p>
        ) : result ? (
          <ResultCard
            label={
              result.mode === 'remaining'
                ? (result.remaining > 0 ? 'Осталось до лимита' : 'Лимит превышен')
                : (forecastResult?.willReach ? 'Лимит будет достигнут' : 'Лимит не будет достигнут')
            }
            figure={
              result.mode === 'remaining'
                ? `${formatMoney(result.remaining)} ₽`
                : (forecastResult?.limitMonthName
                    ? `${forecastResult.limitMonthName} (мес. ${forecastResult.limitMonth})`
                    : 'Не достигнет')
            }
            subtitle={
              result.mode === 'remaining'
                ? `Из 2 400 000 ₽ использовано ${result.earnedPercent}%`
                : undefined
            }
            detail={
              result.mode === 'remaining'
                ? `Безопасный темп: ${formatMoney(result.safePace)} ₽/мес. (осталось ${result.monthsLeft} мес.)`
                : forecastResult
                  ? forecastResult.willReach
                    ? `Прогноз дохода: ${formatMoney(forecastResult.projectedIncome)} ₽`
                    : `Запас: ${formatMoney(forecastResult.safetyMargin)} ₽`
                  : undefined
            }
            whyItems={whyItems}
            risk={{
              level: result.risk,
              title: result.risk === 'red'
                ? 'Опасная зона'
                : result.risk === 'amber'
                  ? 'Близко к лимиту'
                  : 'Безопасная зона',
              description: result.risk === 'red'
                ? 'Вы превысили или приблизились к лимиту 2,4 млн ₽. При превышении — потеря статуса самозанятого.'
                : result.risk === 'amber'
                  ? 'Использовано 80%+ лимита. Следите за доходами.'
                  : 'Доход в пределах безопасного диапазона.',
            }}
            next={{ to: '/otlozhit-na-nalog', label: 'Сколько отложить на налог' }}
            trust={['ФНС 2026', 'Лимит 2,4 млн ₽', 'Без отправки данных']}
          >
            {result.mode === 'remaining' && (
              <ProgressIndicator
                percent={result.earnedPercent}
                label={`${formatMoney(result.earned)} ₽ из 2 400 000 ₽`}
                color={result.risk === 'red' ? 'red' : result.risk === 'amber' ? 'amber' : 'accent'}
                className="mt-3"
              />
            )}
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
