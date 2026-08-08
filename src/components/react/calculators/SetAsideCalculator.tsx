import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { calculateSetAside } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import type { ClientType } from '@/lib/rules-2026';

export function SetAsideCalculator() {
  const [payment, setPayment] = useState<number | null>(null);
  const [clientType, setClientType] = useState<ClientType>('individual');
  const [deductionRemaining, setDeductionRemaining] = useState<number | null>(null);

  // Обязательное поле: только payment
  const isReady = payment !== null && payment > 0;

  const result = useMemo(() => {
    if (!isReady) return null;
    return calculateSetAside(
      payment,
      clientType,
      deductionRemaining && deductionRemaining > 0 ? deductionRemaining : 0,
    );
  }, [isReady, payment, clientType, deductionRemaining]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    const items = [
      `Ставка: ${result.rateLabel} (${clientType === 'individual' ? 'физлицо' : 'юрлицо/ИП'})`,
      `Налог без вычета: ${formatMoney(result.taxWithoutDeduction)} ₽`,
    ];
    if (result.deductionUsed > 0) {
      items.push(`Вычет: −${formatMoney(result.deductionUsed)} ₽`);
      items.push(`Остаток вычета: ${formatMoney(result.deductionRemainingAfter)} ₽`);
    }
    items.push(`К уплате: ${formatMoney(result.setAside)} ₽`);
    return items;
  }, [result, clientType]);

  return (
    <div className="flex flex-col gap-6" id="calculator-set-aside">
      {/* Input section */}
      <ControlGroup label="Оплата">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Кто заплатил?</span>
          <SegmentedToggle
            name="clientType"
            value={clientType}
            onChange={(v) => setClientType(v as ClientType)}
            options={[
              { value: 'individual', label: 'Физлицо' },
              { value: 'business', label: 'Юрлицо/ИП' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="set-aside-payment" className="text-sm font-medium text-ink">
            Сумма оплаты
          </label>
          <CurrencyInput
            id="set-aside-payment"
            value={payment}
            onValueChange={setPayment}
            required
            placeholder="30 000"
            hint="Сумма, которая поступила от клиента"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="set-aside-deduction" className="text-sm font-medium text-ink">
            Остаток вычета
          </label>
          <CurrencyInput
            id="set-aside-deduction"
            value={deductionRemaining}
            onValueChange={setDeductionRemaining}
            placeholder="0"
            hint="Если не знаете остаток или вычет исчерпан, оставьте поле пустым"
          />
        </div>
      </ControlGroup>

      {/* Result section */}
      <div aria-live="polite" role="status">
        {isReady && result ? (
          <ResultCard
            label="Отложите на налог"
            figure={`${formatMoney(result.setAside)} ₽`}
            subtitle={`${result.rateLabel} от ${formatMoney(payment)} ₽`}
            detail={`Можно тратить: ${formatMoney(result.toKeep)} ₽`}
            whyItems={whyItems}
            next={{ to: '/limit-dohoda', label: 'Проверить лимит дохода' }}
            trust={['По ФНС', 'НПД 2026', 'Без отправки данных']}
          />
        ) : null}
      </div>
    </div>
  );
}
