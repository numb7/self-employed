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
}

const RISK_FACTORS: RiskFactor[] = [
  { id: 'oneClient', label: 'Один основной заказчик' },
  { id: 'office', label: 'Работа из офиса/помещения заказчика' },
  { id: 'schedule', label: 'График/расписание работы задано заказчиком' },
  { id: 'noFixedPrice', label: 'Типовой договор без фиксированной цены' },
  { id: 'equipment', label: 'Инвентарь, оборудование, ПО заказчика' },
  { id: 'longTerm', label: 'Работа с заказчиком дольше 6 месяцев' },
  { id: 'subordination', label: 'Подчинение правилам внутреннего распорядка' },
  { id: 'vacation', label: 'Оплачиваемые отпуск/больничный от заказчика' },
  { id: 'continuity', label: 'Непрерывность работы (а не разовый результат)' },
  { id: 'integration', label: 'Интеграция в штат (корпоративная почта, пропуск)' },
  { id: 'sameDuties', label: 'Те же обязанности, что и у штатных сотрудников' },
  { id: 'paymentPeriodic', label: 'Периодическая (а не сдельная) оплата' },
  { id: 'noResult', label: 'Оплата за процесс, а не за результат' },
];

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
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Признаки трудовых отношений</legend>
          {RISK_FACTORS.map((factor) => (
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
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="risk-share" className="text-sm font-medium text-ink">
            Доля от главного заказчика, %
          </label>
          <div className="flex items-center gap-3">
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
            <span className="font-mono text-sm text-ink w-12 text-right tabular-nums">
              {share ?? 0}%
            </span>
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
