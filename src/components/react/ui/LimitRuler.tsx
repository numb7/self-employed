export function LimitRuler({ earned }: { earned: number }) {
  const used = Math.min(100, Math.max(0, earned / 2400000 * 100));
  return <div className="limit-ruler"><div className="ruler-track" role="img" aria-label={`Использовано ${Math.round(earned / 2400000 * 100)} процентов годового лимита`}><div className="ruler-fill" style={{ width: `${used}%` }}/>{Array.from({ length: 25 }, (_, i) => <i key={i} className={i % 4 === 0 ? 'major' : ''} style={{ left: `${i / 24 * 100}%` }}/>)}<b style={{ left: `${used}%` }}/></div><div className="ruler-labels" aria-hidden="true"><span>0</span><span>Лимит 2,4 млн ₽</span></div></div>;
}
