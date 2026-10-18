import { useState } from 'react';
import { RangeControl } from '../ui/RangeControl';
import { LimitRuler } from '../ui/LimitRuler';
import { AnimatedMoney } from '../ui/AnimatedMoney';
import { calculateIncomeRemaining, calculateIncomeWhenLimit } from '@/lib/calculations';
import { formatMoney, MONTHS } from '@/lib/format';
import { RULES_2026 } from '@/lib/rules-2026';

export function IncomeLimitCalculator(){
 const [earned,setEarned]=useState(1200000);
 const [month,setMonth]=useState(0);
 const [monthly,setMonthly]=useState(150000);
 const result=calculateIncomeRemaining(earned,month || 1);
 const forecast=calculateIncomeWhenLimit(earned,month || 1,monthly);
 const exceeded=earned>RULES_2026.npd.incomeLimit;
 return <div id="calculator-income-limit" className="instrument-workspace">
 <div className="instrument-controls"><div className="instrument-eyebrow">Пример расчёта · измените под себя</div><RangeControl label="Доход с начала года" value={earned} onChange={setEarned} max={3000000} step={10000}/><p className="instrument-hint">Учитывайте доход от самозанятости с 1 января. Зарплату по трудовому договору сюда не добавляйте.</p></div>
 <div className="instrument-output limit-output"><div className="output-overline"><span>Ваш запас на год</span><span className={`status-pill ${exceeded?'status-danger':''}`}>{exceeded?'Выше лимита':earned===2400000?'Лимит достигнут':result.earnedPercent>=80?'Близко к лимиту':'Есть запас'}</span></div><div className="output-number" role="status" aria-live="polite"><AnimatedMoney value={Math.abs(result.remaining)}/></div><p>{exceeded?'Сумма превышения лимита':'Ещё можно получить в пределах лимита'}</p><LimitRuler earned={earned}/>{earned>=2400000&&<p className="scope-note">{exceeded?'Доход уже превысил лимит. С даты превышения применять НПД нельзя. Дальнейшие действия зависят от статуса ИП и вашей ситуации.':'Вы достигли лимита, но ещё не превысили его. Запаса для следующего дохода на НПД нет.'} До следующей оплаты уточните порядок в ФНС. <a href="https://npd.nalog.ru/" target="_blank" rel="noopener noreferrer">Условия НПД ↗</a></p>}<details className="instrument-expand"><summary>Хватит ли лимита до конца года? <span aria-hidden="true">+</span></summary><label className="month-select-label">За какой месяц уже учтён весь доход?<select value={month} onChange={e=>setMonth(Number(e.target.value))}><option value={0} disabled>Выберите последний полный месяц</option>{MONTHS.map((m,i)=><option value={i+1} key={m}>{m}</option>)}</select></label><p className="instrument-hint">Выберите последний полностью учтённый месяц. Прогноз предполагает одинаковый доход в следующих месяцах.</p><RangeControl label="Ожидаемый доход за месяц" value={monthly} onChange={setMonthly} max={500000} step={5000}/><p className="forecast-answer" role="status" aria-live="polite">{month===0?'Сначала выберите последний месяц, доход за который учтён полностью.':earned>=2400000?'Лимит уже достигнут.':forecast.willReach?`При таком темпе лимит будет достигнут: ${forecast.limitMonthName}.`:`К концу года останется запас ${formatMoney(forecast.safetyMargin)} ₽.`}</p></details><details className="stage-method"><summary>Как устроен расчёт <span aria-hidden="true">+</span></summary><p>Лимит {formatMoney(RULES_2026.npd.incomeLimit)} ₽ минус доход {formatMoney(earned)} ₽. Отдельного месячного лимита нет. Прогноз — ориентир при равномерном доходе.</p><a href="/metodika">Методика и источники ↗</a></details></div></div>;
}
