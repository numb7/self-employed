import { useId } from 'react';
import type { ClientType } from '@/lib/rules-2026';
export function PayerCards({value,onChange}:{value:ClientType;onChange:(value:ClientType)=>void}) {
 const id=useId();
 return <div className="client-portraits" role="group" aria-label="Кто заплатил?">{([{value:'individual',title:'Человек',rate:'4%'},{value:'business',title:'Компания или ИП',rate:'6%'}] as const).map(p=><label className="desk-payer" key={p.value}><input type="radio" name={`${id}-payer`} checked={value===p.value} onChange={()=>onChange(p.value)}/><span>{p.title}</span><small>{p.rate}</small></label>)}</div>;
}
