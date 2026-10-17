import { ValueTrack } from '../ui/FinanceVisuals';
import { useState } from 'react';
import { RangeControl } from '../ui/RangeControl';
import { PayerCards } from '../ui/PayerCards';
import { AnimatedMoney } from '../ui/AnimatedMoney';
import { calculateTargetHourlyRate,calculateActualHourlyRate } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import type { ClientType } from '@/lib/rules-2026';

export function HourlyRateCalculator(){
 const [mode,setMode]=useState<'target'|'actual'>('target');
 const [client,setClient]=useState<ClientType>('individual');
 const [desired,setDesired]=useState(96000);
 const [hours,setHours]=useState(100);
 const [payment,setPayment]=useState(100000);
 const [actualHours,setActualHours]=useState(40);
 const target=calculateTargetHourlyRate(desired,hours,client);
 const actual=calculateActualHourlyRate(payment,actualHours,client);
 const isTarget=mode==='target';
 const rate=isTarget?target.hourlyRate:actual.netHourlyRate;
 const time=isTarget?hours:actualHours;
 return <div id="calculator-hourly-rate" className="instrument-workspace"><div className="instrument-controls"><div className="mode-cards" role="group" aria-label="Задача расчёта"><button aria-pressed={isTarget} onClick={()=>setMode('target')}><span aria-hidden="true">↗</span><strong>Назвать цену</strong></button><button aria-pressed={!isTarget} onClick={()=>setMode('actual')}><span aria-hidden="true">↙</span><strong>Проверить проект</strong></button></div><RangeControl key={isTarget?'target-money':'actual-money'} label={isTarget?'Хочу получать после налога':'Оплата за проект'} value={isTarget?desired:payment} onChange={isTarget?setDesired:setPayment} min={0} max={300000} step={1000} /><RangeControl key={isTarget?'target-hours':'actual-hours'} label={isTarget?'Рабочих часов в месяц':'Часов на проект, включая правки'} value={time} onChange={isTarget?setHours:setActualHours} min={isTarget?1:0.5} max={isTarget?240:200} step={isTarget?1:0.5} suffix=" ч" limit={10000}/><details className="instrument-expand"><summary>Тип заказчика <span>{client==='individual'?'Человек · 4%':'Компания · 6%'}</span></summary><PayerCards value={client} onChange={setClient}/></details></div><div className="instrument-output time-output"><span className="instrument-eyebrow">{isTarget?'Цена вашего рабочего часа':'Реальная стоимость часа'}</span><div className="output-number" role="status" aria-live="polite"><AnimatedMoney value={rate} suffix=""/><small>₽ / ч</small></div><p>{isTarget?'Столько нужно брать за час, чтобы получить желаемый доход после налога.':'Столько остаётся после налога за каждый потраченный час.'}</p><div className="hour-breakdown"><ValueTrack value={isTarget?target.hourlyRate*(client==='business'?.94:.96):actual.netHourlyRate} max={isTarget?target.hourlyRate:payment/actualHours} label="После налога за час" endLabel={`${formatMoney(isTarget?target.hourlyRate*(client==='business'?.94:.96):actual.netHourlyRate)} ₽`}/><p>Из {formatMoney(isTarget?target.hourlyRate:payment/actualHours)} ₽ оплаты за час.</p></div><details className="stage-method"><summary>Как получилась эта ставка <span aria-hidden="true">+</span></summary><p>{isTarget?`Чтобы получить ${formatMoney(desired)} ₽ после налога, нужно выставить ${formatMoney(target.grossMonthly)} ₽. Делим на ${formatMoney(hours)} рабочих часов.`:`Из ${formatMoney(payment)} ₽ после налога остаётся ${formatMoney(actual.netTotal)} ₽. Делим на ${actualHours.toLocaleString('ru-RU',{maximumFractionDigits:1})} часов.`}</p><a href="/metodika">Методика и источники ↗</a></details></div></div>;
}
