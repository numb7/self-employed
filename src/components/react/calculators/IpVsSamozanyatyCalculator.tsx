import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
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
  const ipTaxAfterContributions = result
    ? Math.max(0, result.ip - result.ipContributions)
    : 0;
  const winner = result ? (result.npd <= result.ip ? 'npd' : 'ip') : null;

  return (
    <div className="flex flex-col gap-6" id="calculator-ip-vs-npd">
      <ControlGroup label="ИП или самозанятый">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Кто ваш клиент?</span>
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ip-revenue" className="text-sm font-medium text-ink">
            Доход за год
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
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            Укажите годовой доход — сравним предварительную нагрузку по двум режимам
          </p>
        ) : result ? (
          <ResultCard
            label={winner === 'npd' ? 'Предварительно меньше нагрузка на НПД' : winner === 'ip' ? 'Предварительно меньше нагрузка у ИП' : 'Нагрузка примерно одинаковая'}
            figure={winner === 'npd'
              ? `+${formatMoney(result.ip - result.npd)} ₽/год`
              : winner === 'ip'
                ? `+${formatMoney(result.npd - result.ip)} ₽/год`
                : `${formatMoney(result.npd)} ₽/год`}
            subtitle={`Останется на руки: ${formatMoney(npdNet)} ₽ (самозанятый) vs ${formatMoney(ipNet)} ₽ (ИП)`}
            detail={result.overLimit ? `⚠️ При доходе ${formatMoney(revenue!)} ₽ превышен лимит 2,4 млн ₽` : undefined}
            whyItems={[
              `НПД: ${npdRate}% от ${formatMoney(revenue!)} ₽ = ${formatMoney(result.npd)} ₽`,
              `ИП УСН 6%: налог после уменьшения на взносы = ${formatMoney(ipTaxAfterContributions)} ₽`,
              `ИП фиксированные взносы: ${formatMoney(result.ipContributions)} ₽`,
            ]}
            trust={['ФНС 2026', 'УСН 6%', 'Без отправки данных']}
          >
            <div className="mt-3 overflow-x-auto rounded-[var(--radius-control)] border border-line" tabIndex={0} aria-label="Сравнение налоговой нагрузки">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-line bg-lavender/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted">Параметр</th>
                    <th className={cn(
                      'px-3 py-2.5 text-right font-medium',
                      winner === 'npd' ? 'text-green' : 'text-ink',
                    )}>
                      Самозанятый
                    </th>
                    <th className={cn(
                      'px-3 py-2.5 text-right font-medium',
                      winner === 'ip' ? 'text-green' : 'text-ink',
                    )}>
                      ИП УСН 6%
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line-2">
                    <td className="px-3 py-2 text-muted">Налог</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">{formatMoney(result.npd)} ₽</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">{formatMoney(ipTaxAfterContributions)} ₽</td>
                  </tr>
                  <tr className="border-b border-line-2">
                    <td className="px-3 py-2 text-muted">Взносы</td>
                    <td className="px-3 py-2 text-right font-mono text-muted">нет</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">{formatMoney(result.ipContributions)} ₽</td>
                  </tr>
                  <tr className={cn(
                    'font-medium',
                    winner === 'npd' ? 'bg-green/5' : winner === 'ip' ? 'bg-amber/5' : '',
                  )}>
                    <td className="px-3 py-2.5 text-ink">Итого нагрузка</td>
                    <td className={cn(
                      'px-3 py-2.5 text-right font-mono',
                      winner === 'npd' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(result.npd)} ₽
                    </td>
                    <td className={cn(
                      'px-3 py-2.5 text-right font-mono',
                      winner === 'ip' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(result.ip)} ₽
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted">На руки</td>
                    <td className={cn(
                      'px-3 py-2 text-right font-mono font-medium',
                      winner === 'npd' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(npdNet)} ₽
                    </td>
                    <td className={cn(
                      'px-3 py-2 text-right font-mono font-medium',
                      winner === 'ip' ? 'text-green' : 'text-ink',
                    )}>
                      {formatMoney(ipNet)} ₽
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
