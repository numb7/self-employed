import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { cn } from '@/lib/cn';
import { compareIpVsNpd } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import type { ClientType } from '@/lib/rules-2026';

export function IpVsSamozanyatyCalculator() {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [clientType, setClientType] = useState<ClientType>('individual');

  const isReady = revenue !== null && revenue > 0;

  const result = useMemo(() => {
    if (!isReady) return null;
    return compareIpVsNpd(revenue!, clientType);
  }, [isReady, revenue, clientType]);

  const npdRate = clientType === 'business' ? 6 : 4;
  const npdNet = result ? revenue! - result.npd : 0;
  const ipNet = result ? revenue! - result.ip : 0;
  const winner = result ? (result.npd <= result.ip ? 'npd' : 'ip') : null;

  return (
    <div className="flex flex-col gap-6" id="calculator-ip-vs-npd">
      <ControlGroup
        label="Годовой доход"
        description="Сравните налоговую нагрузку самозанятого (НПД) и ИП на УСН 6% без работников."
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ip-revenue" className="text-sm font-medium text-ink">
            Годовой доход
          </label>
          <CurrencyInput
            id="ip-revenue"
            value={revenue}
            onValueChange={setRevenue}
            required
            placeholder="1 200 000"
            hint="Ожидаемый доход за год"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">От кого приходят деньги</span>
          <SegmentedToggle
            name="ipClientType"
            value={clientType}
            onChange={(v) => setClientType(v as ClientType)}
            options={[
              { value: 'individual', label: 'Физлица (4% НПД)' },
              { value: 'business', label: 'Юрлица / ИП (6% НПД)' },
            ]}
          />
        </div>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            Введите годовой доход, чтобы увидеть сравнение
          </p>
        ) : result ? (
          <div className="animate-[resultAppear_300ms_ease-out_both]">
            {/* Comparison table */}
            <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card-rest)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-lavender/50">
                    <th className="px-4 py-3 text-left font-medium text-muted">Параметр</th>
                    <th className={cn(
                      'px-4 py-3 text-right font-medium',
                      winner === 'npd' ? 'text-green' : 'text-ink',
                    )}>
                      Самозанятый
                    </th>
                    <th className={cn(
                      'px-4 py-3 text-right font-medium',
                      winner === 'ip' ? 'text-green' : 'text-ink',
                    )}>
                      ИП УСН 6%
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line-2">
                    <td className="px-4 py-2.5 text-muted">Годовой доход</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink">{formatMoney(revenue!)} ₽</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink">{formatMoney(revenue!)} ₽</td>
                  </tr>
                  <tr className="border-b border-line-2">
                    <td className="px-4 py-2.5 text-muted">Налог</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink">{formatMoney(result.npd)} ₽</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink">{formatMoney(result.ip)} ₽</td>
                  </tr>
                  <tr className="border-b border-line-2">
                    <td className="px-4 py-2.5 text-muted">Взносы</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted">нет</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink">{formatMoney(result.ipContributions)} ₽</td>
                  </tr>
                  <tr className={cn(
                    'font-medium',
                    winner === 'npd' ? 'bg-green/5' : winner === 'ip' ? 'bg-amber/5' : '',
                  )}>
                    <td className="px-4 py-3 text-ink">Итого нагрузка</td>
                    <td className={cn(
                      'px-4 py-3 text-right font-mono text-lg',
                      winner === 'npd' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(result.npd)} ₽
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right font-mono text-lg',
                      winner === 'ip' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(result.ip)} ₽
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-muted">Останется на руки</td>
                    <td className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium',
                      winner === 'npd' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(npdNet)} ₽
                    </td>
                    <td className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium',
                      winner === 'ip' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(ipNet)} ₽
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary card */}
            <div className={cn(
              'mt-4 rounded-[var(--radius-card)] border p-4',
              winner === 'npd'
                ? 'border-green/30 bg-green/5'
                : 'border-amber/30 bg-amber/5',
            )}>
              <p className="text-sm font-medium text-ink">
                {winner === 'npd'
                  ? `Самозанятость выгоднее на ${formatMoney(result.ip - result.npd)} ₽/год`
                  : result.ip < result.npd
                    ? `ИП на УСН выгоднее на ${formatMoney(result.npd - result.ip)} ₽/год`
                    : 'Нагрузка примерно одинаковая'}
              </p>
              {result.overLimit && (
                <p className="text-xs text-red mt-1">
                  ⚠️ При доходе {formatMoney(revenue!)} ₽ превышен лимит 2,4 млн ₽. Самозанятый не сможет работать на таком уровне.
                </p>
              )}
            </div>

            {/* Why section */}
            <details className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink select-none">
                Почему такие цифры?
              </summary>
              <div className="px-4 pb-4 text-sm text-muted leading-relaxed space-y-1">
                <p>• НПД: {npdRate}% от {formatMoney(revenue!)} ₽ = {formatMoney(result.npd)} ₽</p>
                <p>• ИП УСН 6%: 6% от {formatMoney(revenue!)} ₽ = {formatMoney(result.ip - result.ipContributions)} ₽ налог</p>
                <p>• ИП фиксированные взносы: {formatMoney(result.ipContributions)} ₽</p>
                <p>• При ИП взносы уменьшают налог до нуля, но не ниже фиксированной суммы</p>
              </div>
            </details>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-faint">
              <span className="flex items-center gap-1">✓ ФНС 2026</span>
              <span className="flex items-center gap-1">✓ УСН 6%</span>
              <span className="flex items-center gap-1">✓ Без отправки данных</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
