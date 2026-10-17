import type { ClientType } from '@/lib/rules-2026';
export function PayerCards({value,onChange}:{value:ClientType;onChange:(value:ClientType)=>void}) {
 return <div className="client-portraits" role="group" aria-label="Кто заплатил?">
  <button type="button" aria-pressed={value==='individual'} onClick={()=>onChange('individual')}><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="22" r="10"/><path d="M13 55v-6c0-10 8-17 19-17s19 7 19 17v6M21 18l4-8 16 3 3 7"/></svg><span><strong>Человек</strong><small>Частный заказ</small></span><b>4%</b></button>
  <button type="button" aria-pressed={value==='business'} onClick={()=>onChange('business')}><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M12 55V18h28v37M40 30h12v25M7 55h50M21 27h3m6 0h3m-12 9h3m6 0h3m-12 9h3m6 0h3M24 18V9h20v21"/></svg><span><strong>Компания / ИП</strong></span><b>6%</b></button>
 </div>;
}
