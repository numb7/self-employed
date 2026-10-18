import { useId, type CSSProperties } from 'react';

/** A payment split into the actual tax share and the amount retained. */
export function PaymentSculpture({rate, replay}:{rate:number;replay:number}) {
  const id=useId().replace(/:/g,'');
  const split=420*(100-rate)/100;
  return <div className="payment-sculpture" key={replay} aria-hidden="true" style={{'--tax-shift':`${rate*1.3+22}px`} as CSSProperties}>
    <svg viewBox="0 0 520 216" fill="none">
      <defs>
        <linearGradient id={`${id}-paper`} x1="15" y1="25" x2="360" y2="170" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".48" stopColor="#f9fbff"/><stop offset="1" stopColor="#dce9ff"/></linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="120" x2="400" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#8caae7"/><stop offset="1" stopColor="#b8ceff"/></linearGradient>
        <linearGradient id={`${id}-tax`} x1="0" y1="0" x2="40" y2="130" gradientUnits="userSpaceOnUse"><stop stopColor="#dce9ff"/><stop offset="1" stopColor="#9bbaf5"/></linearGradient>
        <clipPath id={`${id}-keep`}><rect width={split} height="138" rx="3"/></clipPath>
        <clipPath id={`${id}-slice`}><rect x={split} width={420-split} height="138" rx="2"/></clipPath>
        <filter id={`${id}-shadow`} x="-30%" y="-40%" width="170%" height="200%"><feDropShadow dx="0" dy="15" stdDeviation="12" floodColor="#122b8a" floodOpacity=".32"/></filter>
        <pattern id={`${id}-lines`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0v9" stroke="#3455e9" strokeOpacity=".08" strokeWidth="1"/></pattern>
      </defs>
      <g className="payment-note-plane" transform="translate(22 23) rotate(-7 210 70) skewX(-8)" filter={`url(#${id}-shadow)`}>
        <g className="payment-keep-piece">
          <rect y="7" width={split} height="138" rx="4" fill={`url(#${id}-edge)`}/>
          <g clipPath={`url(#${id}-keep)`}>
            <rect width="420" height="138" rx="4" fill={`url(#${id}-paper)`}/>
            <rect x="10" y="10" width="400" height="118" rx="2" stroke="#3455e9" strokeOpacity=".2"/>
            <rect x="15" y="15" width="390" height="108" fill={`url(#${id}-lines)`}/>
            {Array.from({length:9},(_,i)=><ellipse key={i} cx="316" cy="69" rx={25+i*7} ry={22+i*3.5} stroke="#3455e9" strokeOpacity={.12+i*.01} strokeWidth=".6"/>)}
            <circle cx="316" cy="69" r="24" fill="#3455e9"/><text x="316" y="79" textAnchor="middle" fill="white" fontSize="29" fontFamily="Golos Text,sans-serif">₽</text>
            <text x="29" y="51" fill="#3455e9" fontSize="12" fontFamily="Golos Text,sans-serif">После налога</text>
            <text x="27" y="93" fill="#17254b" fontSize="37" fontWeight="500" letterSpacing="-1.5" fontFamily="Golos Text,sans-serif">{100-rate}% ваши</text>
          </g>
        </g>
        <g className="payment-tax-piece">
          <rect x={split} y="7" width={420-split} height="138" rx="2" fill="#7098e8"/>
          <g clipPath={`url(#${id}-slice)`}><rect width="420" height="138" fill={`url(#${id}-tax)`}/><rect x="10" y="10" width="400" height="118" stroke="#3455e9" strokeOpacity=".25"/>{Array.from({length:16},(_,i)=><path key={i} d={`M${split} ${i*10}h40`} stroke="#3455e9" strokeOpacity=".13"/>)}</g>
        </g>
      </g>
      <g className="payment-tax-caption"><path d="M472 96v53q0 12-12 12h-32" stroke="white" strokeOpacity=".5"/><circle cx="472" cy="96" r="3" fill="#dce9ff"/><text x="422" y="184" fill="#e5edff" fontSize="12" fontFamily="Golos Text,sans-serif">{rate}% налог</text></g>
    </svg>
  </div>;
}
