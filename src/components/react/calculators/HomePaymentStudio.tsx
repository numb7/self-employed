import { useId, useState, type CSSProperties } from 'react';
import { NumericFormat } from 'react-number-format';
import { calculateSetAside } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { RULES_2026, type ClientType } from '@/lib/rules-2026';
import { PaymentSculpture } from '../ui/PaymentSculpture';
import { TaxBonusInput } from '../ui/TaxBonusInput';
import { PaymentGuide } from '../ui/PaymentGuide';
import { AnimatedMoney } from '../ui/AnimatedMoney';

export function HomePaymentStudio() {
  const id = useId();
  const [replay,setReplay] = useState(0);
  const [amount, setAmount] = useState<number | undefined>(50000);
  const [example, setExample] = useState(true);
  const [useBonus,setUseBonus] = useState(false);
  const [bonus,setBonus] = useState<number | undefined>();
  const [client, setClient] = useState<ClientType>('individual');
  const value = amount ?? 0;
  const rate = client === 'individual' ? 4 : 6;
  const result = calculateSetAside(value, client, useBonus ? bonus ?? 0 : 0);
  const visualRate = Math.round(result.effectiveRate * 10000) / 100;
  const over = value > RULES_2026.npd.incomeLimit;
  const ready = amount !== undefined && !over && (!useBonus || bonus !== undefined);
  return <><div className="payment-studio">
    <div className="studio-entry">
      <label className="studio-label" htmlFor={`${id}-amount`}>Вы получили оплату</label>
      <div className="studio-amount"><NumericFormat id={`${id}-amount`} value={amount ?? ''} onValueChange={({ floatValue }, { source }) => { if (source === 'event') { setAmount(floatValue); setExample(false); } }} thousandSeparator=" " decimalSeparator="," decimalScale={0} allowNegative={false} inputMode="numeric" autoComplete="off" placeholder="0" aria-describedby={`${id}-hint`} isAllowed={({floatValue})=>floatValue===undefined||floatValue<=100000000}/><span aria-hidden="true">₽</span></div>
      <p id={`${id}-hint`} className="studio-hint">{example ? 'Пример оплаты — измените сумму на свою' : value<=200000?'Сумму также можно изменить ползунком':'Введите сумму оплаты в рублях'}</p>
      {value <= 200000 && <input className="studio-range" type="range" min="0" max="200000" step="500" value={value} aria-label="Сумма оплаты" aria-valuetext={`${formatMoney(value)} рублей`} style={{'--fill':`${value/2000}%`} as CSSProperties} onChange={e=>{setAmount(Number(e.target.value));setExample(false);}}/>}
      <fieldset className="studio-payers"><legend>Кто вам заплатил?</legend><div>{([{value:'individual',label:'Человек',rate:4},{value:'business',label:'Компания или ИП',rate:6}] as const).map(p=><label key={p.value}><input type="radio" name={`${id}-payer`} value={p.value} checked={client===p.value} onChange={()=>{setClient(p.value);setExample(false);}}/><span>{p.label}<small>{p.rate}%</small></span></label>)}</div></fieldset>
      <details className="studio-bonus-details"><summary>{ready && useBonus?'Налоговый бонус учтён':'Учесть налоговый бонус'}</summary><div>
        <p>Остаток скидки указан в «Мой налог». Если не знаете его, оставьте расчёт без бонуса.</p>
        <label className="bonus-checkbox"><input type="checkbox" checked={useBonus} onChange={e=>{setUseBonus(e.target.checked);setExample(false);}}/> Учесть известный остаток</label>
        {useBonus && <><TaxBonusInput id={`${id}-bonus`} label="Остаток бонуса, ₽" value={bonus} onChange={value=>{setBonus(value);setExample(false);}}/>{ready&&<p>Скидка с этой оплаты: {formatMoney(result.deductionUsed)} ₽. Бонуса останется: {formatMoney(result.deductionRemainingAfter)} ₽.</p>}</>}
      </div></details>
    </div>
    <div className="studio-result">
      <div className="studio-result-live" role="status" aria-live="polite" aria-atomic="true">
      {ready ? <>
        <span className="studio-label">Вам остаётся</span>
        <strong className="studio-kept"><AnimatedMoney value={result.toKeep}/></strong>
        <p className="studio-result-caption">После налога, до ваших расходов</p>
        {value > 0 && <PaymentSculpture rate={visualRate} replay={replay}/>}
        <div className="studio-tax-total"><div><span className="studio-dot"/>Отложите на налог <small>{result.deductionUsed > 0 ? 'со скидкой' : `${rate}%`}</small></div><strong><AnimatedMoney value={result.setAside}/></strong></div>
      </> : <div className="studio-empty"><strong>{over?'Эта сумма больше годового лимита':amount===undefined?'Сколько вам заплатили?':'Какой остаток бонуса?'}</strong><p>{over?'Лимит самозанятости — 2,4 млн ₽ за год. Проверьте доход, прежде чем рассчитывать налог.':amount===undefined?'Введите сумму слева — покажем налог и деньги, которые останутся вам.':'Введите известный остаток бонуса или снимите галочку — рассчитаем без скидки.'}</p>{over&&<a href="/limit-dohoda">Проверить лимит</a>}</div>}
      </div>
      {ready && value > 0 && <button className="studio-replay" type="button" onClick={()=>setReplay(n=>n+1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>Повторить движение</button>}
      <p className="studio-note">{ready ? `${example?'Пример расчёта. ':'Расчёт по значениям формы. '}Предварительный резерв${useBonus?' с учётом указанного бонуса':' без бонуса'}.` : 'Расчёт появится после проверки введённых данных.'} Итог за месяц — в «Мой налог».</p>
    </div>
  </div><PaymentGuide/></>;
}
