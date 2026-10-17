/** Code-native illustration: ring geometry uses the actual tax share. */
export function PaymentFlow({ share, motionKey }: {share:number; motionKey:string}) {
  const circumference = 2 * Math.PI * 35;
  return <svg key={motionKey} className="payment-flow" viewBox="0 0 420 132" fill="none" aria-hidden="true">
    <path className="flow-route" d="M170 28C105 28 105 85 59 85M250 28c65 0 65 57 111 57" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5"/>
    <g className="flow-payment"><rect x="157" y="7" width="106" height="47" rx="5" fill="#fff" stroke="#213d33" strokeWidth="1.5"/><path d="M167 18h12m62 25h12" stroke="#7c9182"/><circle cx="210" cy="30" r="13" fill="#e9efb2"/><path d="M207 38V22h5a4 4 0 1 1 0 8h-8m0 4h10" stroke="#213d33" strokeWidth="1.5"/></g>
    <g className="flow-tax"><path d="M30 48h59v65l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4-5-4-6 4V48Z" fill="#fff" stroke="#213d33" strokeWidth="1.5"/><path d="M42 63h30M42 72h20" stroke="#7c9182" strokeWidth="2"/><circle cx="72" cy="94" r="11" fill="#ee896b"/><path d="m67 94 3 3 6-7" stroke="#213d33" strokeWidth="1.5"/></g>
    <g className="flow-wallet"><rect x="320" y="48" width="66" height="53" rx="5" fill="#2b614e" stroke="#213d33" strokeWidth="1.5"/><path d="m325 48 39-15 8 15" fill="#fff" stroke="#213d33" strokeWidth="1.5"/><path d="M321 60h65" stroke="#bdd7a5"/><rect x="365" y="68" width="28" height="20" rx="4" fill="#e9efb2" stroke="#213d33" strokeWidth="1.5"/><circle cx="374" cy="78" r="2" fill="#213d33"/></g>
    <g className="flow-share"><circle cx="210" cy="94" r="35" stroke="#b7c995" strokeWidth="7"/><circle cx="210" cy="94" r="35" stroke="#2b614e" strokeWidth="7" strokeDasharray={`${circumference * share} ${circumference}`} transform="rotate(-90 210 94)"/><text x="210" y="99" textAnchor="middle" fill="#213d33" fontSize="14" fontFamily="Manrope, sans-serif">{Number((share*100).toFixed(1)).toLocaleString('ru-RU')}%</text></g>
  </svg>;
}
