import { describe,it,expect } from 'vitest';
import {orientRegime,type OrientationAnswers} from '../src/lib/regime-orientation';
const base:OrientationAnswers={activity:'services',employees:'no',income:'within',restriction:'none'};
describe('limited regime orientation',()=>{
 it('does not establish eligibility from missing answers',()=>expect(orientRegime({}).status).toBe('unknown'));
 it('excludes nonresidential rental even with otherwise matching answers',()=>expect(orientRegime({...base,activity:'nonresidential'}).status).toBe('excluded'));
 it('does not assume an unknown property is residential',()=>expect(orientRegime({...base,activity:'rental_unknown'}).status).toBe('unknown'));
 it('gives only limited orientation for residential rental',()=>expect(orientRegime({...base,activity:'home'}).status).toBe('limited'));
 it('does not treat employer payments as ordinary NPD income',()=>expect(orientRegime({...base,restriction:'employer'}).title).toBe('Эта оплата не облагается НПД'));
 it('never automatically recommends USN for the unbounded income range',()=>expect(orientRegime({...base,income:'large'}).title).toBe('Нужен отдельный выбор режима'));
 it('leaves unknown restrictions unresolved',()=>expect(orientRegime({...base,restriction:'unknown'}).status).toBe('unknown'));
 it('does not allow employees or resale',()=>{expect(orientRegime({...base,employees:'yes'}).status).toBe('excluded');expect(orientRegime({...base,activity:'resale'}).status).toBe('excluded');});
});
