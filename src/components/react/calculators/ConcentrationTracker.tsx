import { useState, useMemo, useCallback } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { cn } from '@/lib/cn';
import { calculateConcentration } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

interface SourceRow {
  id: string;
  name: string;
  monthlyIncome: number | null;
  monthsWorking: number | null;
}

let nextId = 1;
function createRow(name = '', income: number | null = null, months: number | null = null): SourceRow {
  return { id: `src-${nextId++}`, name, monthlyIncome: income, monthsWorking: months };
}

export function ConcentrationTracker() {
  const [sources, setSources] = useState<SourceRow[]>([createRow('Заказчик 1'), createRow('Заказчик 2')]);

  const updateSource = useCallback((id: string, field: keyof SourceRow, value: string | number | null) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addSource = useCallback(() => {
    setSources((prev) => [...prev, createRow(`Заказчик ${prev.length + 1}`)]);
  }, []);

  const isReady = sources.some((s) => s.monthlyIncome !== null && s.monthlyIncome > 0);

  const result = useMemo(() => {
    if (!isReady) return null;
    const input = sources
      .filter((s) => s.monthlyIncome !== null && s.monthlyIncome > 0)
      .map((s) => ({
        name: s.name,
        monthlyIncome: s.monthlyIncome!,
        monthsWorking: s.monthsWorking ?? 1,
      }));
    if (input.length === 0) return null;
    return calculateConcentration(input);
  }, [isReady, sources]);

  return (
    <div className="flex flex-col gap-6" id="calculator-concentration">
      <ControlGroup label="Заказчики">
        {/* Mobile cards keep every field readable instead of squeezing a table. */}
        <div className="flex flex-col gap-3 sm:hidden">
          {sources.map((source, index) => (
            <div key={source.id} className="rounded-[var(--radius-control)] border border-line bg-paper p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">Клиент {index + 1}</p>
                {sources.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSource(source.id)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] text-xl text-muted hover:bg-lavender hover:text-red"
                    aria-label={`Удалить ${source.name || 'клиента'}`}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${source.id}-name-mobile`} className="text-xs font-medium text-muted">Название клиента</label>
                  <input
                    id={`${source.id}-name-mobile`}
                    type="text"
                    value={source.name}
                    onChange={(e) => updateSource(source.id, 'name', e.target.value)}
                    placeholder="Название клиента"
                    className="min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor={`${source.id}-income-mobile`} className="text-xs font-medium text-muted">Доход в месяц</label>
                    <CurrencyInput id={`${source.id}-income-mobile`} value={source.monthlyIncome} onValueChange={(v) => updateSource(source.id, 'monthlyIncome', v)} placeholder="0" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor={`${source.id}-months-mobile`} className="text-xs font-medium text-muted">Срок работы, мес.</label>
                    <NumberInput id={`${source.id}-months-mobile`} value={source.monthsWorking} onValueChange={(v) => updateSource(source.id, 'monthsWorking', v)} integer suffix="мес." placeholder="1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table is more compact on wider screens. */}
        <div className="hidden overflow-x-auto -mx-1 sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 font-medium text-ink pr-2">Клиент</th>
                <th className="pb-2 font-medium text-ink px-2">Доход в мес., ₽</th>
                <th className="pb-2 font-medium text-ink px-2">Срок работы, мес.</th>
                <th className="pb-2 font-medium text-ink px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-b border-line-2 last:border-b-0">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={source.name}
                      onChange={(e) => updateSource(source.id, 'name', e.target.value)}
                      placeholder="Название"
                      className="min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <CurrencyInput
                      value={source.monthlyIncome}
                      onValueChange={(v) => updateSource(source.id, 'monthlyIncome', v)}
                      required={false}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <NumberInput
                      value={source.monthsWorking}
                      onValueChange={(v) => updateSource(source.id, 'monthsWorking', v)}
                      integer
                      suffix="мес."
                      placeholder="1"
                    />
                  </td>
                  <td className="py-2 px-2">
                    {sources.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSource(source.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] text-xl leading-none text-faint hover:bg-lavender hover:text-red transition-colors duration-[var(--duration-fast)]"
                        aria-label={`Удалить ${source.name || 'клиента'}`}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addSource}
          className="min-h-11 rounded-[var(--radius-card)] border border-dashed border-line bg-lavender/30 px-3 py-2 text-sm font-medium text-muted hover:text-ink hover:border-accent transition-colors duration-[var(--duration-fast)]"
        >
          Добавить клиента
        </button>

        <p className="text-xs text-faint">
          Это предварительная оценка по доле дохода и сроку работы, а не юридическое заключение.
        </p>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {isReady && result ? (
          <ResultCard
            label={
              result.level === 'red'
                ? 'Высокая концентрация'
                : result.level === 'amber'
                  ? 'Средняя концентрация'
                  : 'Доход распределён между клиентами'
            }
            figure={`${result.maxShare}%`}
            subtitle={
              result.maxShare >= 70
                ? 'Большая доля дохода приходится на одного заказчика'
                : result.maxShare >= 50
                  ? 'Заметная доля от одного заказчика'
                  : 'Доход распределён между несколькими источниками'
            }
            detail={`Общий месячный доход: ${formatMoney(result.total)} ₽`}
            whyItems={
              result.sources.map((s) =>
                s.risky
                  ? `${s.name}: ${s.share}% (${s.monthsWorking} мес.) — требует внимания`
                  : `${s.name}: ${s.share}% (${s.monthsWorking} мес.)`
              )
            }
            risk={{
              level: result.level,
              label: result.level === 'red'
                ? 'Требует внимания'
                : result.level === 'amber'
                  ? 'Заметная зависимость'
                  : 'Доход распределён',
            }}
            next={{ to: '/risk-trudovyh', label: 'Оценить риск переквалификации' }}
            trust={['По признакам ФНС', 'Учитывает срок работы', 'Без отправки данных']}
          />
        ) : null}
      </div>
    </div>
  );
}
