import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import { ProgressIndicator } from '../ui/ProgressIndicator';
import { calculateDeduction } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';

export function DeductionCalculator() {
  const [incomeIndividual, setIncomeIndividual] = useState<number | null>(null);
  const [incomeBusiness, setIncomeBusiness] = useState<number | null>(null);

  // Оба обязательных поля: доходим хотя бы к одному из них
  const hasAnyIncome = (incomeIndividual !== null && incomeIndividual > 0)
    || (incomeBusiness !== null && incomeBusiness > 0);

  const result = useMemo(() => {
    if (!hasAnyIncome) return null;
    return calculateDeduction(
      incomeIndividual && incomeIndividual > 0 ? incomeIndividual : 0,
      incomeBusiness && incomeBusiness > 0 ? incomeBusiness : 0,
    );
  }, [hasAnyIncome, incomeIndividual, incomeBusiness]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    const items = [
      `Лимит вычета: 10 000 ₽`,
      `Ставка с физлиц: 4% → 3% (экономия 1 п.п.)`,
      `Ставка с юрлиц: 6% → 4% (экономия 2 п.п.)`,
      `Использовано: ${formatMoney(result.used)} ₽ (${result.pct}%)`,
    ];
    if (result.exhausted) {
      items.push('Вычет полностью исчерпан');
    } else {
      items.push(`Остаток: ${formatMoney(result.remaining)} ₽`);
    }
    return items;
  }, [result]);

  return (
    <div className="flex flex-col gap-6" id="calculator-deduction">
      <ControlGroup label="Доход">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deduction-individual" className="text-sm font-medium text-ink">
            От физлиц
          </label>
          <CurrencyInput
            id="deduction-individual"
            value={incomeIndividual}
            onValueChange={setIncomeIndividual}
            required
            placeholder="100 000"
            hint="Все оплаты от физических лиц"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="deduction-business" className="text-sm font-medium text-ink">
            От юрлиц
          </label>
          <CurrencyInput
            id="deduction-business"
            value={incomeBusiness}
            onValueChange={setIncomeBusiness}
            placeholder="0"
            hint="Если оплат от юрлиц и ИП не было, оставьте поле пустым"
          />
        </div>
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!hasAnyIncome ? (
          <p className="text-muted text-sm py-4">Укажите доход — покажем, сколько вычета уже использовано</p>
        ) : result ? (
          <ResultCard
            label="Экономия от вычета"
            figure={`${formatMoney(result.used)} ₽`}
            subtitle={`Использовано ${result.pct}% из 10 000 ₽`}
            detail={result.exhausted
              ? 'Вычет полностью исчерпан — дальше ставки стандартные'
              : `Остаток: ${formatMoney(result.remaining)} ₽`
            }
            whyItems={whyItems}
            next={{ to: '/otlozhit-na-nalog', label: 'Сколько отложить на налог' }}
            trust={['ФЗ № 422-ФЗ', 'Вычет 10 000 ₽', 'Без отправки данных']}
          >
            <ProgressIndicator
              percent={result.pct}
              label={`${formatMoney(result.used)} ₽ из 10 000 ₽`}
              color="accent"
              className="mt-3"
            />
          </ResultCard>
        ) : null}
      </div>
    </div>
  );
}
