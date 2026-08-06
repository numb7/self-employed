import { useState, useMemo, useCallback } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
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
      <ControlGroup
        label="Источники дохода"
        description="Если один заказчик приносит 70% и более дохода на протяжении 6+ месяцев — это признак риска переквалификации."
      >
        {/* Desktop table */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 font-medium text-ink pr-2">Клиент</th>
                <th className="pb-2 font-medium text-ink px-2">Доход в мес., ₽</th>
                <th className="pb-2 font-medium text-ink px-2">Месяцев</th>
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
                      className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
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
                    <input
                      type="text"
                      inputMode="numeric"
                      value={source.monthsWorking ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '');
                        updateSource(source.id, 'monthsWorking', v ? parseInt(v, 10) : null);
                      }}
                      placeholder="1"
                      className="w-16 rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5 font-mono text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    {sources.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSource(source.id)}
                        className="text-faint hover:text-red transition-colors duration-[var(--duration-fast)] text-lg leading-none"
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
          className="rounded-[var(--radius-card)] border border-dashed border-line bg-lavender/30 px-3 py-2 text-sm font-medium text-muted hover:text-ink hover:border-accent transition-colors duration-[var(--duration-fast)]"
        >
          + Добавить клиента
        </button>

        <p className="text-xs text-faint">
          Оценка информационная, не юридическое заключение. Учитывает долю дохода и длительность отношений.
        </p>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            Добавьте клиентов и укажите доход, чтобы увидеть расчёт
          </p>
        ) : result ? (
          <ResultCard
            label={
              result.level === 'red'
                ? 'Высокая концентрация'
                : result.level === 'amber'
                  ? 'Средняя концентрация'
                  : 'Доход diversифицирован'
            }
            figure={`${result.maxShare}%`}
            subtitle={
              result.maxShare >= 70
                ? 'Критическая зависимость от одного источника'
                : result.maxShare >= 50
                  ? 'Заметная доля от одного заказчика'
                  : 'Доход распределён между несколькими источниками'
            }
            detail={`Общий месячный доход: ${formatMoney(result.total)} ₽`}
            whyItems={
              result.sources.map((s) =>
                s.risky
                  ? `⚠️ ${s.name}: ${s.share}% (${s.monthsWorking} мес.) — риск`
                  : `${s.name}: ${s.share}% (${s.monthsWorking} мес.)`
              )
            }
            risk={{
              level: result.level,
              title: result.level === 'red'
                ? 'Высокий риск'
                : result.level === 'amber'
                  ? 'Средний риск'
                  : 'Низкий риск',
              description: result.level === 'red'
                ? `Один источник приносит ${result.maxShare}% дохода 6+ месяцев. Это признак, на который обращает внимание ФНС при переквалификации.`
                : result.level === 'amber'
                  ? 'Доля одного заказчика 50%+. Рекомендуется diversифицировать источники дохода.'
                  : 'Доход хорошо diversифицирован. Риск переквалификации по этому критерию низкий.',
            }}
            next={{ to: '/risk-trudovyh', label: 'Оценить риск переквалификации' }}
            trust={['ФНС · письма', 'Письма ФНС', 'Без отправки данных']}
          />
        ) : null}
      </div>
    </div>
  );
}
