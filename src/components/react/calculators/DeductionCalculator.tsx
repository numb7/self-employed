import { CalculationContext, useCalculationExample } from '../ui/CalculationContext';
import { ValueTrack } from '../ui/FinanceVisuals';
import { useState } from 'react';
import { RangeControl } from '../ui/RangeControl';
import { AnimatedMoney } from '../ui/AnimatedMoney';
import { calculateDeduction } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
export function DeductionCalculator(){
 const {example,edit}=useCalculationExample();
 const [individual,setIndividual]=useState(100000);
 const [business,setBusiness]=useState(0);
 const result=calculateDeduction(individual,business);
 return <div className="instrument-workspace" id="calculator-deduction"><div className="instrument-controls"><p className="instrument-hint">Укажите все доходы с начала самозанятости. Покажем, сколько скидки на налог ещё осталось.</p><RangeControl label="От людей" value={individual} onChange={edit(setIndividual)} max={1000000} step={10000}/><RangeControl label="От компаний и ИП" value={business} onChange={edit(setBusiness)} max={500000} step={5000}/><p className="instrument-hint">Точный остаток смотрите в «Мой налог». Бонус не выплачивается на карту.</p></div><div className="instrument-output deduction-output"><span className="instrument-eyebrow">Налоговый бонус · 10 000 ₽</span><div className="bonus-wallet"><span>Оценка остатка</span><CalculationContext example={example}/><div className="output-number" role="status" aria-live="polite"><AnimatedMoney value={result.remaining}/></div><p>{result.exhausted?'По указанным доходам бонус израсходован.':'Для оценки нужны все доходы за время самозанятости. Точный остаток проверьте в «Мой налог».'}</p></div><ValueTrack value={result.used} max={10000} label="Использовано из 10 000 ₽" endLabel={`${formatMoney(result.used)} ₽`}/><details className="stage-method"><summary>Почему бонус расходуется постепенно? <span aria-hidden="true">+</span></summary><p>Он уменьшает ставку с 4% до 3% для дохода от людей и с 6% до 4% для дохода от компаний. Доходы: от людей {formatMoney(individual)} ₽, от компаний и ИП {formatMoney(business)} ₽ за всё время. Расход на указанный доход: {formatMoney(individual*.01+business*.02)} ₽, но не больше 10 000 ₽. Вычет рассчитывается налоговой автоматически.</p><a href="/metodika">Методика расчёта</a></details></div></div>;
}
