import { useId, useState, type CSSProperties } from 'react';
import { NumericFormat } from 'react-number-format';
import { calculateSetAside } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { RULES_2026, type ClientType } from '@/lib/rules-2026';
import { AnimatedMoney } from '../ui/AnimatedMoney';

export function HomeTaxCalculator() {
  const id = useId();
  const [amount, setAmount] = useState<number | undefined>(50000);
  const [example, setExample] = useState(true);
  const [client, setClient] = useState<ClientType>('individual');
  const [deduction, setDeduction] = useState<number | undefined>(10000);
  const [useDeduction, setUseDeduction] = useState(false);
  const value = amount ?? 0;
  const rate = client === 'individual' ? 4 : 6;
  const overLimit = value > RULES_2026.npd.incomeLimit;
  const valid = amount !== undefined && (!useDeduction || deduction !== undefined);
  const result = calculateSetAside(value, client, useDeduction ? deduction ?? 0 : 0);

  return <div className="simple-tax">
    <div className="simple-tax-inputs">
      <div className="payment-label"><label htmlFor={`${id}-amount`}>Сколько вам заплатили?</label>{example && <span>Пример</span>}</div>
      <div className="payment-amount">
        <NumericFormat id={`${id}-amount`} name="payment-amount" autoComplete="off" value={amount ?? ''} onValueChange={({ floatValue }, { source }) => {
          if (source === 'event') { setAmount(floatValue); setExample(false); }
        }} thousandSeparator=" " decimalSeparator="," decimalScale={0} allowNegative={false} inputMode="numeric" placeholder="0" aria-describedby={`${id}-edit-hint`} isAllowed={({ floatValue }) => floatValue === undefined || floatValue <= 100000000} />
        <span aria-hidden="true">₽</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/></svg>
      </div>
      <span className="sr-only" id={`${id}-edit-hint`}>Введите сумму в рублях. Для сумм до 200 000 рублей также можно использовать ползунок.</span>
      {value <= 200000 && <input className="payment-range simple-tax-slider" type="range" min="0" max="200000" step="500" value={value} aria-label="Изменить сумму оплаты ползунком" aria-valuetext={`${formatMoney(value)} рублей`} style={{ '--range-fill': `${value / 2000}%` } as CSSProperties} onChange={e => { setAmount(Number(e.target.value)); setExample(false); }} />}
      <fieldset className="simple-payers"><legend>Кто заплатил?</legend><div>
        <label className="desk-payer"><input type="radio" name={`${id}-payer`} value="individual" checked={client === 'individual'} onChange={() => setClient('individual')}/><span>Человек</span></label>
        <label className="desk-payer"><input type="radio" name={`${id}-payer`} value="business" checked={client === 'business'} onChange={() => setClient('business')}/><span>Компания или ИП</span></label>
      </div></fieldset>
    </div>
    <div className="simple-tax-answer" role="status" aria-live="polite" aria-atomic="true">
      {overLimit ? <div className="simple-tax-unavailable"><strong>Сначала проверьте лимит</strong><p>Оплата больше годового лимита самозанятости — 2,4 млн ₽. Считать всю сумму по ставке {rate}% нельзя.</p><a href="/limit-dohoda">Проверить лимит дохода ↗</a></div> : !valid ? <div className="simple-tax-unavailable"><strong>{amount === undefined ? 'Укажите сумму оплаты' : 'Укажите остаток бонуса'}</strong><p>Тогда здесь появятся налог и сумма после него.</p></div> : <>
        <span className="simple-answer-label">{value === 0 ? 'Нет оплаты — нет налога' : 'Отложите на налог'}</span>
        <strong className="simple-answer-number"><AnimatedMoney value={result.setAside}/></strong>
        <span className="simple-answer-basis">{useDeduction ? 'С учётом налогового бонуса' : `${rate}% с этой оплаты · без налогового бонуса`}</span>
        <div className="desk-money-share" aria-hidden="true"><span style={{width: `${value > 0 ? result.setAside / value * 100 : 0}%`}} /></div>
        <div className="simple-keep"><span>Вам останется</span><strong><AnimatedMoney value={result.toKeep}/></strong></div>
      </>}
    </div>
    <details className="simple-tax-details"><summary>Учесть налоговый бонус <span aria-hidden="true">+</span></summary><div>
      <p>При регистрации самозанятому дают бонус 10 000 ₽ — в законе он называется вычетом. Это скидка на налог, а не деньги на карту. ФНС применяет её автоматически.</p>
      <label className="bonus-checkbox"><input type="checkbox" checked={useDeduction} onChange={e => setUseDeduction(e.target.checked)}/> Учесть мой остаток бонуса</label>
      {useDeduction && <><label className="bonus-input-label" htmlFor={`${id}-bonus`}>Остаток бонуса из «Мой налог», ₽</label><NumericFormat id={`${id}-bonus`} name="tax-bonus" autoComplete="off" className="bonus-input" value={deduction ?? ''} thousandSeparator=" " decimalScale={0} allowNegative={false} inputMode="numeric" isAllowed={({ floatValue }) => floatValue === undefined || floatValue <= 10000} onValueChange={({ floatValue }, { source }) => { if (source === 'event') setDeduction(floatValue); }}/><p>Если не знаете остаток, снимите галочку: получите расчёт без скидки.</p></>}
      {valid && !overLimit && <p className="simple-formula">{formatMoney(value)} ₽ × {rate}%{useDeduction ? ` − ${formatMoney(result.deductionUsed)} ₽ скидки` : ''} = {formatMoney(result.setAside)} ₽ налога.{useDeduction && ` После этой оплаты от бонуса останется ${formatMoney(result.deductionRemainingAfter)} ₽.`}</p>}
      <a href="/metodika">Как считаем ↗</a>
    </div></details>
    <p className="simple-tax-note">Это предварительный расчёт. Итоговый налог за месяц — в «Мой налог».</p>
  </div>;
}
