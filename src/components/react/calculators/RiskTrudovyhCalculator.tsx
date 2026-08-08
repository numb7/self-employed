import { useState, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { ProgressIndicator } from '../ui/ProgressIndicator';
import { calculateRiskTrudovyh } from '@/lib/calculations';
import type { RiskLevel } from '@/lib/rules-2026';

interface RiskFactor {
  id: string;
  label: string;
  group: 'work' | 'control' | 'payment';
}

const RISK_FACTORS: RiskFactor[] = [
  { id: 'oneClient', label: 'Один основной заказчик', group: 'work' },
  { id: 'longTerm', label: 'Работа с заказчиком дольше 6 месяцев', group: 'work' },
  { id: 'continuity', label: 'Непрерывная работа вместо разового результата', group: 'work' },
  { id: 'schedule', label: 'Заказчик устанавливает график', group: 'control' },
  { id: 'office', label: 'Работа из помещения заказчика', group: 'control' },
  { id: 'equipment', label: 'Оборудование или ПО предоставляет заказчик', group: 'control' },
  { id: 'subordination', label: 'Подчинение внутренним правилам заказчика', group: 'control' },
  { id: 'integration', label: 'Корпоративная почта, пропуск или другие признаки штата', group: 'control' },
  { id: 'sameDuties', label: 'Те же обязанности, что у штатных сотрудников', group: 'control' },
  { id: 'noFixedPrice', label: 'В договоре нет фиксированной цены за результат', group: 'payment' },
  { id: 'vacation', label: 'Заказчик оплачивает отпуск или больничный', group: 'payment' },
  { id: 'paymentPeriodic', label: 'Регулярная оплата вместо оплаты за результат', group: 'payment' },
  { id: 'noResult', label: 'Оплата за процесс, а не за результат', group: 'payment' },
];

const RISK_GROUPS = [
  { id: 'work', label: 'Характер работы' },
  { id: 'control', label: 'Контроль заказчика' },
  { id: 'payment', label: 'Договор и оплата' },
] as const;

export function RiskTrudovyhCalculator() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [share, setShare] = useState<number | null>(null);

  const count = checked.size;

  // Ready when at least 1 checkbox or share is filled
  const isReady = count > 0 || (share !== null && share > 0);

  const result = useMemo(() => {
    if (!isReady) return null;
    return calculateRiskTrudovyh(count, share ?? 0);
  }, [isReady, count, share]);

  const toggleFactor = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const riskColor = (level: RiskLevel) => {
    if (level === 'red') return 'red';
    if (level === 'amber') return 'amber';
    return 'green';
  };

  return (
    <div className="flex flex-col gap-6" id="calculator-risk-trudovyh">
      <ControlGroup label="Признаки трудовых отношений">
        <fieldset className="flex flex-col gap-5">
          <legend className="sr-only">Отметьте признаки, которые есть в вашей работе</legend>
          {RISK_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
              {RISK_FACTORS.filter((factor) => factor.group === group.id).map((factor) => (
            <label
              key={factor.id}
              className={cn(
                'flex items-center gap-2.5 cursor-pointer rounded-[var(--radius-control)] px-3 py-2',
                'text-sm transition-colors duration-[var(--duration-fast)]',
                checked.has(factor.id) ? 'bg-accent-soft text-ink' : 'bg-lavender/50 text-muted hover:text-ink',
              )}
            >
              <input
                type="checkbox"
                checked={checked.has(factor.id)}
                onChange={() => toggleFactor(factor.id)}
                className="accent-accent w-4 h-4 rounded"
              />
              {factor.label}
            </label>
              ))}
            </div>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="risk-share" className="text-sm font-medium text-ink">
            Доля от главного заказчика, %
          </label>
          <div className="grid grid-cols-[1fr_5.5rem] items-center gap-3">
            <input
              id="risk-share"
              type="range"
              min={0}
              max={100}
              step={5}
              value={share ?? 0}
              onChange={(e) => setShare(parseInt(e.target.value, 10))}
              className="flex-1 accent-accent"
            />
            <label className="sr-only" htmlFor="risk-share-number">Доля точным числом</label>
            <div className="relative">
              <input
                id="risk-share-number"
                type="number"
                min={0}
                max={100}
                value={share ?? 0}
                onChange={(e) => setShare(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 pr-7 font-mono text-sm text-ink"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
            </div>
          </div>
          {share !== null && share > 80 && (
            <p className="text-red text-xs">Больше 80% дохода от одного заказчика — признак, который требует внимания</p>
          )}
        </div>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {isReady && result ? (
          <ResultCard
            label="Предварительная оценка"
            figure={
              result.risk === 'red'
                ? 'Много признаков'
                : result.risk === 'amber'
                  ? 'Есть признаки'
                  : 'Мало признаков'
            }
            subtitle={
              count > 0
                ? `${count} из 13 признаков отмечено`
                : undefined
            }
            detail={
              share !== null && share > 0
                ? `Доля дохода от главного заказчика: ${share}%`
                : undefined
            }
            whyItems={[
              'При переквалификации заказчику доначисляют:',
              'НДФЛ 13% + страховые взносы 30% + пени и штрафы',
              count >= 3 ? 'Отмечено 3 или больше признаков — ситуацию лучше проверить подробнее' : null,
              share !== null && share > 80 ? 'Больше 80% дохода приходится на одного заказчика' : null,
            ].filter(Boolean) as string[]}
            risk={{
              level: result.risk,
              label: result.risk === 'red'
                ? 'Требует внимания'
                : result.risk === 'amber'
                  ? 'Есть признаки'
                  : 'Мало признаков',
            }}
            next={{ to: '/dogovor-akt', label: 'Создать договор и акт' }}
            trust={['ФНС · ст. 15 ТК РФ', '13 признаков', 'Без отправки данных']}
          >
            <div className="mt-3 flex flex-col gap-2">
              <ProgressIndicator
                percent={count > 0 ? Math.round((count / 13) * 100) : 0}
                label={`${count} из 13 признаков`}
                color={riskColor(result.risk)}
              />
              {share !== null && share > 0 && (
                <ProgressIndicator
                  percent={share}
                  label={`Доля дохода: ${share}%`}
                  color={share > 80 ? 'red' : share >= 50 ? 'amber' : 'green'}
                />
              )}
            </div>
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
