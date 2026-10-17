import type { CSSProperties } from 'react';
import { formatMoney } from '@/lib/format';
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
export function ValueTrack({value,max,label,endLabel,tone='green'}:{value:number;max:number;label:string;endLabel?:string;tone?:'green'|'warm'}){
 return <div className={`value-track tone-${tone}`}>{(label||endLabel)&&<div className="value-track-label"><span>{label}</span>{endLabel&&<strong>{endLabel}</strong>}</div>}<div className="value-track-rail" aria-hidden="true"><span style={{'--fill':clamp(max>0?value/max:0)} as CSSProperties}/>{[.25,.5,.75].map(p=><i key={p} style={{left:`${p*100}%`}}/>)}</div></div>;
}
export function Allocation({total,tax}:{total:number;tax:number}){
 const share=total>0?tax/total:0;
 return <div className="allocation" aria-hidden="true"><div className="allocation-rail"><span style={{'--fill':clamp(share)} as CSSProperties}/></div><div className="allocation-key"><span><i/>Налог {Number((share*100).toFixed(1)).toLocaleString('ru-RU')}%</span><span>Остальное — вам</span></div></div>;
}
export function MonthCalendar({months}:{months:number}){
 return <div className="month-calendar" role="img" aria-label={`${months} месяцев из 12 за календарный год`}>{Array.from({length:12},(_,i)=><span key={i} className={i<months?'month-active':''}><small>мес.</small><b>{i+1}</b></span>)}<p>Количество месяцев стажа. Фактический период подтверждает СФР.</p></div>;
}
export function EligibilityTimeline(){return <div className="eligibility-timeline"><div><b>6 мес.</b><span>70% страховой суммы</span></div><div><b>12 мес.</b><span>100% страховой суммы</span></div><p>Расчётная база после уплаты взносов. Размер пособия зависит также от стажа и дней болезни.</p></div>}
export function ConditionGraphic({hours,months}:{hours:number;months:number}){
 return <div className="condition-graphic">{[{name:'Часы в месяц',value:`${hours.toLocaleString('ru-RU')} ч`,met:hours>60,rule:'Больше 60 часов'},{name:'Месяцы подряд',value:`${months.toLocaleString('ru-RU')} мес.`,met:months>=6,rule:'Не меньше 6 месяцев'}].map(item=><div className="condition-row" key={item.name} data-met={item.met}><span className="condition-dot" aria-hidden="true"/><div><span>{item.name}</span><strong>{item.value}</strong></div><p>{item.rule}<b>{item.met?'Условие выполнено':'Условие не выполнено'}</b></p></div>)}</div>;
}
export function ChecklistMeter({count,total,label}:{count:number;total:number;label:string}){
 return <div className="checklist-meter"><div className="checklist-meter-heading"><span>{label}</span><strong>{count} / {total}</strong></div><div aria-hidden="true">{Array.from({length:total},(_,i)=><i key={i} className={i<count?'is-filled':''}/>)}</div></div>;
}
