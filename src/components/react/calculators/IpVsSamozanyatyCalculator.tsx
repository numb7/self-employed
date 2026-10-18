import { ValueTrack } from '../ui/FinanceVisuals';
import { useState } from 'react';
import { RangeControl } from '../ui/RangeControl';
import { PayerCards } from '../ui/PayerCards';
import { AnimatedMoney } from '../ui/AnimatedMoney';
import { compareIpVsNpd } from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import type { ClientType } from '@/lib/rules-2026';

export function IpVsSamozanyatyCalculator() {
  const [revenue, setRevenue] = useState(1200000);
  const [client, setClient] = useState<ClientType>('individual');
  const result = compareIpVsNpd(revenue, client);
  const saving = Math.abs(result.ip - result.npd);
  return <div className="comparison-workspace" id="calculator-ip-vs-npd">
    <div className="comparison-input"><RangeControl label="Доход за год" value={revenue} onChange={setRevenue} max={4000000} limit={4000000} step={10000}/><div><h2 className="stage-question">Кто ваши заказчики?</h2><PayerCards value={client} onChange={setClient}/><p className="instrument-hint">Сравниваем два налоговых режима: НПД и УСН 6% для ИП без сотрудников. ИП тоже может применять НПД.</p></div></div>
    <p className="scope-note">Модель полного 2026 года: доход до 4 млн ₽, ИП без сотрудников, УСН 6% без льгот и НДС. Предполагаем, что освобождение от НДС действует. Все заказчики — выбранного типа; налоговый бонус НПД не учитывается.</p><div className="comparison-pair" role="status" aria-live="polite">
      <article className={`compare-card ${!result.overLimit && result.npd <= result.ip ? 'compare-preferred' : ''}`}>
        <h3>НПД · самозанятость</h3>
        {result.overLimit ? <><strong className="compare-unavailable">Лимит превышен</strong><p className="comparison-warning">При таком годовом доходе нельзя применять НПД ко всей сумме.</p></> : <><span className="compare-caption">Налог за год</span><div className="compare-number"><AnimatedMoney value={result.npd}/></div><span className="compare-foot">{client === 'individual' ? 4 : 6}% · без налогового бонуса</span><ValueTrack value={result.npd} max={Math.max(result.npd,result.ip,1)} label=""/></>}
      </article>
      <article className={`compare-card ${!result.overLimit && result.ip < result.npd ? 'compare-preferred' : ''}`}><h3>ИП на УСН 6%</h3><span className="compare-caption">Налог и взносы за год</span><div className="compare-number"><AnimatedMoney value={result.ip}/></div><span className="compare-foot">Обязательные взносы включены</span>{!result.overLimit&&<ValueTrack value={result.ip} max={Math.max(result.npd,result.ip,1)} label="" tone="warm"/>}</article>
    </div>
    <div className="comparison-conclusion">{result.overLimit ? <p>Для дохода за пределами НПД понадобится другой режим. <a href="https://npd.nalog.ru/" target="_blank" rel="noopener noreferrer">Уточнить порядок в ФНС ↗</a></p> : <p>{saving === 0 ? 'Расчётная нагрузка одинаковая.' : <>Разница — <strong>{formatMoney(saving)} ₽ в год</strong> в пользу {result.npd < result.ip ? 'НПД' : 'УСН 6%'}.</>} Учитывайте также условия работы и отчётность.</p>}</div>
    <details className="stage-method"><summary>Что вошло в расчёт <span aria-hidden="true">+</span></summary><p>ИП на УСН «Доходы» 6%, без сотрудников и дополнительных льгот, работает весь календарный год. Не учитываем НДС и особенности неполного года. Если доход прошлого года повлиял на освобождение от НДС, эта модель не подходит. Налог уменьшается на обязательные взносы. Налоговый бонус самозанятого здесь не учитывается.</p><dl className="compare-breakdown"><div><dt>Взносы ИП</dt><dd>{formatMoney(result.ipContributions)} ₽</dd></div><div><dt>Налог ИП после уменьшения</dt><dd>{formatMoney(Math.max(0, result.ip - result.ipContributions))} ₽</dd></div></dl><a href="/metodika">Методика и источники ↗</a></details>
  </div>;
}
