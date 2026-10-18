import { useId, useRef, useState, useEffect } from 'react';
import { orientRegime, type OrientationAnswers } from '@/lib/regime-orientation';

const questions = [
  {key:'activity',title:'Чем вы занимаетесь?',options:[['services','Оказываю услуги'],['goods','Продаю товары собственного производства'],['home','Сдаю жилое помещение'],['nonresidential','Сдаю нежилое помещение'],['rental_unknown','Сдаю помещение, но не знаю его статус'],['resale','Перепродаю товары']]},
  {key:'employees',title:'Есть или планируются сотрудники по трудовому договору?',options:[['no','Нет'],['yes','Да']]},
  {key:'income',title:'Какой доход от этой деятельности ожидаете за год?',options:[['within','Не больше 2,4 млн ₽'],['above','Больше 2,4 млн, но меньше 10 млн ₽'],['large','От 10 млн ₽']]},
  {key:'restriction',title:'Есть ли среди ваших условий исключения?',options:[['none','Перечисленных условий нет'],['excluded','Есть ограничение по деятельности или другой налоговый режим'],['employer','Оплата за услуги или работы от нынешнего или бывшего менее двух лет работодателя'],['unknown','Не знаю, нужна проверка']]},
] as const;
export function ModeWizard(){
 const [step,setStep]=useState(-1);
 const [answers,setAnswers]=useState<OrientationAnswers>({});
 const root=useRef<HTMLDivElement>(null);const id=useId();
 useEffect(()=>{if(step>=0)root.current?.querySelector<HTMLElement>('[data-wizard-heading]')?.focus();},[step]);
 const q=step>=0&&step<questions.length?questions[step]:null;
 const result=step===questions.length?orientRegime(answers):null;
 return <div id="calculator-wizard" ref={root}>
 {step<0?<div className="wizard-intro"><ol className="wizard-route">{['Деятельность','Сотрудники','Доход','Ограничения'].map((t,i)=><li key={t}><span>{i+1}</span>{t}</li>)}</ol><h2 className="wizard-intro-title">Проверим базовые<br/>условия НПД.</h2><p className="instrument-hint">Четыре вопроса для первичной ориентации. Полную проверку права на режим этот опрос не заменяет.</p><button className="action-button" onClick={()=>setStep(0)}>Проверить условия</button></div>:<>
 <button className="plain-action" onClick={()=>setStep(s=>s-1)}>← Назад</button>
 {q&&<section aria-labelledby={`${id}-question`}><p className="instrument-hint">Шаг {step+1} из {questions.length}</p><h2 id={`${id}-question`} data-wizard-heading tabIndex={-1}>{q.title}</h2>
 {q.key==='restriction'&&<p className="scope-note">Ограничения включают маркированные и подакцизные товары, агентскую деятельность, добычу полезных ископаемых, операции с цифровой валютой и совмещение с другим налоговым режимом. Оплата от текущего или бывшего менее двух лет работодателя за услуги и работы проверяется отдельно. Список не заменяет статью 4 и статью 6 закона №422-ФЗ.</p>}
 <fieldset className="wizard-choices"><legend className="sr-only">{q.title}</legend>{q.options.map(([value,label])=><button key={value} type="button" className="wizard-choice" onClick={()=>{setAnswers(a=>({...a,[q.key]:value}));setStep(s=>s+1);}}>{label}</button>)}</fieldset></section>}
 {result&&<section aria-live="polite"><h2 data-wizard-heading tabIndex={-1}>{result.title}</h2><p className="scope-note">{result.reason}</p>
 <h3>Что проверено</h3><ul className="scope-list"><li>Выбранная деятельность: {questions[0].options.find(o=>o[0]===answers.activity)?.[1]}.</li><li>Наличие сотрудников, диапазон дохода и указанные вами ограничения.</li></ul>
 <h3>Что ещё нужно проверить</h3><p className="scope-note">Опрос не проверяет документы, гражданство и право регистрации, специальные условия профессии, все исключения из закона и порядок перехода с другого режима. Для УСН отдельно важны регион, предел дохода и обязанности по НДС. До регистрации уточните применимость в ФНС.</p>
 <a href="https://npd.nalog.ru/" target="_blank" rel="noopener noreferrer">Условия НПД на сайте ФНС ↗</a><div><button className="plain-action" onClick={()=>{setAnswers({});setStep(-1);}}>Пройти заново</button></div></section>}
 </>}
 </div>;
}
