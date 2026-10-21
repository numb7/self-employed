import { useId, useState, useEffect, type KeyboardEvent } from 'react';

import { catalogCategory } from '@/lib/catalog-context';

const situations = [
  {id:'tax', name:'Налоги и режим', title:'Выбрать, как работать.', description:'Разберитесь с режимом и налогом, прежде чем принимать решение.', tools:[
    {title:'Подходит ли мне самозанятость?',description:'Пройдите короткий опрос по вашей ситуации.',href:'/master-vybora-rezhima'},
    {title:'Сравнить налоги',description:'Налог на профессиональный доход и упрощённая система налогообложения 6% для ИП без сотрудников.',href:'/ip-ili-samozanyatyy'},
    {title:'Налоговый бонус',description:'Оцените остаток скидки по доходам с начала самозанятости.',href:'/vychet-10000'},
  ]},
  {id:'clients', name:'Заказчики и платформы', title:'Работать на понятных условиях.', description:'Проверьте, на что обратить внимание в сотрудничестве.', tools:[
    {title:'Не похоже ли это на работу по найму?',description:'Проверьте признаки трудовых отношений.',href:'/risk-trudovyh'},
    {title:'Большая часть дохода от одного клиента',description:'Оцените, насколько ваш доход зависит от одного заказчика.',href:'/koncentracia-dohoda'},
    {title:'Работа через платформу',description:'Посмотрите, что важно проверить в вашей ситуации.',href:'/chasy-289-fz'},
  ]},
  {id:'future', name:'Пенсия и больничный', title:'Позаботиться о себе.', description:'Посмотрите, как устроены добровольные взносы и сколько они стоят.', tools:[
    {title:'Пенсионный стаж',description:'Оцените добровольный взнос за выбранное число месяцев.',href:'/pensiya'},
    {title:'Страхование больничного',description:'Сравните варианты добровольного страхования.',href:'/bolnichny'},
  ]},
];

function SituationArt({kind}:{kind:string}) {
  if(kind==='tax') return <div className="situation-art situation-art-tax" aria-hidden="true"><div className="tax-note-art"><span>Доход от работы</span><div className="tax-note-income"/><div className="tax-note-divider"/><span>Налог с дохода</span><div className="tax-note-share"><i/><b/></div><small>Сначала считаем. Потом решаем.</small></div></div>;
  if(kind==='clients') return <div className="situation-art situation-art-clients" aria-hidden="true"><svg viewBox="0 0 280 220"><path d="m140 110-85-65m85 65 92-50m-92 50-88 65m88-65 88 65" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="55" cy="45" r="22"/><circle cx="232" cy="60" r="16"/><circle cx="52" cy="175" r="17"/><circle cx="228" cy="175" r="24"/><circle className="client-core" cx="140" cy="110" r="40"/><text x="140" y="115" textAnchor="middle">Вы</text></svg></div>;
  return <div className="situation-art situation-art-future" aria-hidden="true"><div className="future-calendar"><div className="calendar-binding"><i/><i/></div><span>Время для себя</span><div className="calendar-days">{Array.from({length:14},(_,i)=><i key={i} className={i===9?'calendar-day-selected':''}>{i===9?<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>:null}</i>)}</div></div></div>;
}

export function HomeSituations(){
  const [active,setActive]=useState(0);
  const id=useId();
  useEffect(()=>{
    function restore(){
      const category=catalogCategory(window.location.search);
      setActive(Math.max(0,situations.findIndex(s=>s.id===category)));
    }
    restore();
    window.addEventListener('popstate',restore);
    return ()=>window.removeEventListener('popstate',restore);
  },[]);
  function select(index:number){
    setActive(index);
    const url=new URL(window.location.href);
    url.searchParams.set('tools',situations[index].id);
    // Context contains only this category, never values from a calculator.
    window.history.pushState(null,'',`${url.pathname}?tools=${situations[index].id}#all-tools`);
  }
  function navigate(e:KeyboardEvent<HTMLButtonElement>,index:number){
    let next=index;
    if(e.key==='ArrowRight') next=(index+1)%situations.length;
    else if(e.key==='ArrowLeft') next=(index+situations.length-1)%situations.length;
    else if(e.key==='Home') next=0;
    else if(e.key==='End') next=situations.length-1;
    else return;
    e.preventDefault(); select(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }
  return <div className="situations-browser">
    <div className="situations-tabs" role="tablist" aria-label="Выберите ситуацию">{situations.map((s,i)=><button key={s.id} type="button" role="tab" id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`} aria-selected={active===i} tabIndex={active===i?0:-1} onClick={()=>select(i)} onKeyDown={e=>navigate(e,i)}>{s.name}</button>)}</div>
    {situations.map((s,i)=><div key={s.id} id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={`${id}-tab-${i}`} hidden={active!==i} className={`situation-panel situation-${s.id}`}>
      <div className="situation-story"><h3>{s.title}</h3><p>{s.description}</p><SituationArt kind={s.id}/></div>
      <div className="situation-links">{s.tools.map(tool=><a href={`${tool.href}?tools=${s.id}`} key={tool.href}><div><h4>{tool.title}</h4><p>{tool.description}</p></div><span className="situation-go" aria-hidden="true">↗</span></a>)}</div>
    </div>)}
  </div>;
}
