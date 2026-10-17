import { ConditionGraphic } from '../ui/FinanceVisuals';
import { useState } from 'react';
import { RangeControl } from '../ui/RangeControl';
import { calculateChasy289 } from '@/lib/calculations';
export function Chasy289Calculator(){
 const [hours,setHours]=useState(40);
 const [months,setMonths]=useState(3);
 const result=calculateChasy289(hours,months);
 return <div className="instrument-workspace" id="calculator-chasy-289"><div className="instrument-controls"><RangeControl label="Часов в месяц у одного заказчика" value={hours} onChange={setHours} max={200} step={1} suffix=" ч" limit={744}/><RangeControl label="Сколько месяцев подряд" value={months} onChange={setMonths} min={1} max={12} step={1} suffix=" мес." limit={120}/><p className="instrument-hint">Указывайте объём, который сохранялся каждый месяц подряд через посредническую цифровую платформу.</p></div><div className={`instrument-output ${result.criterionMet?'criterion-attention':'pension-output'}`}><div className="criterion-verdict" role="status" aria-live="polite"><h2>{result.criterionMet?'Стоит проверить условия работы':'Эти два условия не совпали'}</h2><p>{result.criterionMet?'Проверьте условия сотрудничества и ограничения платформы.':'Это результат только этой проверки, а не общая оценка законности сотрудничества.'}</p></div><ConditionGraphic hours={hours} months={months}/><details className="stage-method"><summary>К кому применяется <span aria-hidden="true">+</span></summary><p>Критерий касается партнёров-исполнителей посреднических цифровых платформ. Он не является общим ограничением рабочего времени всех самозанятых. Два условия: больше 60 часов в месяц и не менее 6 месяцев подряд.</p><a href="/metodika">Источники и ограничения ↗</a></details></div></div>;
}
