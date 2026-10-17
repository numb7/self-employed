import { describe,it,expect } from 'vitest';
import { generateDocument } from '../src/components/react/calculators/ContractGenerator';
const data={docType:'agreement' as const,executorName:'Тестовый исполнитель',executorInn:'000000000000',clientName:'Тестовый заказчик',clientInn:'',service:'Макет сайта\nВторой этап',amount:50000,date:'2026-10-17',city:'Казань'};
describe('Содержимое документов',()=>{
 it('сохраняет реквизиты, дату, сумму и многострочную услугу в договоре',()=>{const text=generateDocument(data);expect(text).toContain('ДОГОВОР ОКАЗАНИЯ УСЛУГ');expect(text).toContain('17 октября 2026 г.');expect(text).toContain('г. Казань');expect(text).toContain(data.executorInn);expect(text).toContain(data.service);expect(text.replace(/\s/g,'')).toContain('50000рублей');expect(text).not.toMatch(/undefined|NaN/)});
 it('формирует отдельный акт с теми же сторонами и суммой',()=>{const text=generateDocument({...data,docType:'act'});expect(text).toContain('АКТ ОБ ОКАЗАННЫХ УСЛУГАХ');expect(text).not.toContain('ДОГОВОР ОКАЗАНИЯ УСЛУГ №');expect(text).toContain(data.executorName);expect(text).toContain(data.clientName);expect(text).toContain(data.service)});
 it('не теряет текст, похожий на разметку',()=>{const service='Макет <section> и символы &';expect(generateDocument({...data,service})).toContain(service)});
});
