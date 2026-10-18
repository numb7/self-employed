import {useState} from 'react';

type Props={id:string;label:string;value:number|undefined;onChange:(value:number|undefined)=>void};
/** Keep an invalid draft visible while preventing a misleading current result. */
export function TaxBonusInput({id,label,value,onChange}:Props){
 const [draft,setDraft]=useState(value===undefined?'':String(value));
 const clean=draft.replace(/\s/g,'');
 const valid=/^\d+$/.test(clean)&&Number(clean)<=10000;
 return <><label htmlFor={id}>{label}</label><input id={id} className="bonus-input" type="text" inputMode="numeric" autoComplete="off" value={draft} placeholder="От 0 до 10 000" aria-invalid={!valid} aria-describedby={`${id}-validation`} onChange={e=>{const text=e.target.value;setDraft(text);const n=text.replace(/\s/g,'');onChange(/^\d+$/.test(n)&&Number(n)<=10000?Number(n):undefined);}}/><p id={`${id}-validation`}>{valid?'Остаток можно посмотреть в «Мой налог».':'Укажите целое число от 0 до 10 000 ₽ или отключите учёт бонуса.'}</p></>;
}
