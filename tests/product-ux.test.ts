import { describe, it, expect } from 'vitest';
import { parseNumberDraft } from '../src/lib/number-input';
import { hourlyNpdScope } from '../src/lib/hourly-scope';
import { calculateConcentration, calculateTargetHourlyRate, calculateActualHourlyRate } from '../src/lib/calculations';
import { catalogCategory, catalogReturn } from '../src/lib/catalog-context';

describe('whole-month input preserves meaning', () => {
  it.each(['-6','1.5','1,5','1e3','abc6','6abc','9007199254740992'])('rejects %s instead of extracting digits', raw => {
    expect(parseNumberDraft(raw,true).kind).toBe('invalid');
    expect(parseNumberDraft(raw,true).value).toBeNull();
  });
  it('distinguishes unknown, zero and a valid correction',()=>{
    expect(parseNumberDraft('',true).kind).toBe('empty');
    expect(parseNumberDraft('0',true).value).toBe(0);
    expect(parseNumberDraft('6',true).value).toBe(6);
    expect(parseNumberDraft('1 200',true).value).toBe(1200);
  });
  it('does not invent duration while calculating financial shares',()=>{
    const result=calculateConcentration([{name:'A',monthlyIncome:80000,monthsWorking:null},{name:'B',monthlyIncome:20000,monthsWorking:null}]);
    expect(result.sources.map(s=>s.share)).toEqual([80,20]);
    expect(result.sources[0].monthsWorking).toBeNull();
    expect(result.sources.some(s=>s.risky)).toBe(false);
  });
});
describe('hourly NPD model boundaries',()=>{
  it('rejects the full payment above the yearly limit',()=>expect(hourlyNpdScope(3000000,false)).toBe('outside'));
  it('does not turn the annual extrapolation into a monthly ban',()=>{
    expect(hourlyNpdScope(250000,true)).toBe('annual-warning');
    expect(hourlyNpdScope(250000,false)).toBe('within');
    expect(hourlyNpdScope(2400000,false)).toBe('within');
    expect(hourlyNpdScope(2400000,true)).toBe('annual-warning');
    expect(hourlyNpdScope(2400000.01,true)).toBe('outside');
  });
  it('uses unrounded required revenue and keeps valid control examples',()=>{
    expect(hourlyNpdScope(calculateTargetHourlyRate(2304001,100,'individual').grossNeeded,true)).toBe('outside');
    expect(calculateTargetHourlyRate(96000,100,'individual').hourlyRate).toBe(1000);
    expect(calculateActualHourlyRate(100000,40,'individual').netHourlyRate).toBe(2400);
  });
});
describe('catalog navigation context',()=>{
  it.each(['tax','clients','future'])('restores %s without any calculation data',category=>{
    expect(catalogReturn(`?tools=${category}&amount=50000&inn=000000000000`)).toBe(`/?tools=${category}#all-tools`);
  });
  it('ignores missing and untrusted categories',()=>{
    expect(catalogCategory('?tools=https://example.com')).toBeNull();
    expect(catalogReturn('?tools=unknown')).toBe('/#tools');
    expect(catalogReturn('')).toBe('/#tools');
  });
});
