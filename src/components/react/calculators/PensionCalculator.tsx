import { MonthCalendar } from '../ui/FinanceVisuals';
import { useState } from 'react';
import { RangeControl } from '../ui/RangeControl';
import { AnimatedMoney } from '../ui/AnimatedMoney';
import { calculatePensionCost,calculatePensionMonths } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import { RULES_2026 } from '@/lib/rules-2026';
export function PensionCalculator(){
 const [months,setMonths]=useState(12);
 const [amount,setAmount]=useState(36000);
 const result=calculatePensionCost(months);
 const byAmount=calculatePensionMonths(amount);
 return <div className="instrument-workspace" id="calculator-pension"><div className="instrument-controls"><p className="instrument-hint">Укажите, сколько месяцев стажа хотите рассчитать — от 1 до 12.</p><RangeControl label="Месяцев стажа" value={months} onChange={setMonths} min={1} max={12} step={1} suffix=" мес." limit={12}/><p className="instrument-hint">НПД сам по себе не формирует пенсионный стаж. Добровольные взносы и фактический период подтверждает СФР.</p></div><div className="instrument-output pension-output"><span className="instrument-eyebrow">Взнос за выбранный период</span><div className="output-number" role="status" aria-live="polite"><AnimatedMoney value={result.cost}/></div><p>За {months} мес. стажа в 2026 году</p><p className="scope-note">Это ориентир взноса, не подтверждённый стаж и не расчёт пенсионных баллов. Важны дата вступления и фактический период участия.</p><MonthCalendar months={months}/><details className="instrument-expand"><summary>Как начать платить взносы</summary><p>Сначала вступите в добровольные правоотношения по обязательному пенсионному страхованию через СФР или доступный официальный сервис. Порядок, реквизиты и срок оплаты проверьте в СФР. Сам перевод рассчитанной суммы не подтверждает выбранный стаж.</p><a href="https://sfr.gov.ru/employers/selfemployed/" target="_blank" rel="noopener noreferrer">Условия и порядок — СФР ↗</a></details><details className="instrument-expand"><summary>А сколько стажа даст моя сумма? <span aria-hidden="true">+</span></summary><RangeControl label="Сумма взноса" value={amount} onChange={setAmount} max={72000} step={1000}/><p className="forecast-answer">Ориентировочно {Math.min(12,byAmount.months).toLocaleString('ru-RU')} мес. за один календарный год. Фактический период зависит от даты вступления и условий СФР.</p></details><details className="stage-method"><summary>Как посчитано <span aria-hidden="true">+</span></summary><p>Стоимость года × {months} / 12. Округляем сумму до целого рубля. Это ориентир для планирования, а не реквизиты для платежа.</p><a href="/metodika">Источники СФР ↗</a></details></div></div>;
}
