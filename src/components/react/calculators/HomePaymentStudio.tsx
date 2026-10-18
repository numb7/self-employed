import { useId, useState, type CSSProperties } from 'react';
import { NumericFormat } from 'react-number-format';
import { calculateSetAside } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { RULES_2026, type ClientType } from '@/lib/rules-2026';
import { AnimatedMoney } from '../ui/AnimatedMoney';

export function HomePaymentStudio() {
  const id = useId();
  const [amount, setAmount] = useState<number | undefined>(50000);
  const [client, setClient] = useState<ClientType>('individual');
  const value = amount ?? 0;
  const rate = client === 'individual' ? 4 : 6;
  const result = calculateSetAside(value, client, 0);
  const over = value > RULES_2026.npd.incomeLimit;
  const ready = amount !== undefined && !over;
  return <div className="payment-studio">
    <div className="studio-entry">
      <label className="studio-label" htmlFor={`${id}-amount`}>Вы получили оплату</label>
      <div className="studio-amount"><NumericFormat id={`${id}-amount`} value={amount ?? ''} onValueChange={({ floatValue }, { source }) => { if (source === 'event') setAmount(floatValue); }} thousandSeparator=" " decimalSeparator="," decimalScale={0} allowNegative={false} inputMode="numeric" autoComplete="off" placeholder="0" aria-describedby={`${id}-hint`} isAllowed={({floatValue})=>floatValue===undefined||floatValue<=100000000}/><span aria-hidden="true">₽</span></div>
      <p id={`${id}-hint`} className="studio-hint">Введите свою сумму или передвиньте ползунок</p>
      {value <= 200000 && <input className="studio-range" type="range" min="0" max="200000" step="500" value={value} aria-label="Сумма оплаты" aria-valuetext={`${formatMoney(value)} рублей`} style={{'--fill':`${value/2000}%`} as CSSProperties} onChange={e=>setAmount(Number(e.target.value))}/>}
      <fieldset className="studio-payers"><legend>Кто вам заплатил?</legend><div>{([{value:'individual',label:'Человек',rate:4},{value:'business',label:'Компания или ИП',rate:6}] as const).map(p=><label key={p.value}><input type="radio" name={`${id}-payer`} value={p.value} checked={client===p.value} onChange={()=>setClient(p.value)}/><span>{p.label}<small>{p.rate}%</small></span></label>)}</div></fieldset>
      <a className="studio-bonus" href="/vychet-10000">Есть налоговый бонус? Рассчитать со скидкой <span aria-hidden="true">↗</span></a>
    </div>
    <div className="studio-result" role="status" aria-live="polite" aria-atomic="true">
      {ready ? <>
        <span className="studio-label">Вам остаётся</span>
        <strong className="studio-kept"><AnimatedMoney value={result.toKeep}/></strong>
        <p className="studio-result-caption">После налога с этой оплаты</p>
        <div className="studio-distribution" aria-hidden="true"><span className="studio-owned" style={{flexGrow:100-rate}}/><span className="studio-tax-slice" style={{flexGrow:rate}}/></div>
        <div className="studio-tax-total"><div><span className="studio-dot"/>Отложите на налог <small>{rate}%</small></div><strong><AnimatedMoney value={result.setAside}/></strong></div>
      </> : <div className="studio-empty"><strong>{over?'Эта сумма больше годового лимита':'Сколько вам заплатили?'}</strong><p>{over?'Лимит самозанятости — 2,4 млн ₽ за год. Проверьте доход, прежде чем рассчитывать налог.':'Введите сумму слева — покажем налог и деньги, которые останутся вам.'}</p>{over&&<a href="/limit-dohoda">Проверить лимит</a>}</div>}
      <p className="studio-note">Предварительно, без налогового бонуса. Итог за месяц — в «Мой налог».</p>
    </div>
  </div>;
}
