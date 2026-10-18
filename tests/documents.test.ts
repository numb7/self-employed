import { describe,it,expect } from 'vitest';
import { generateDocument } from '../src/components/react/calculators/ContractGenerator';
const data={docType:'agreement' as const,executorName:'Тестовый исполнитель',executorInn:'000000000000',clientName:'Тестовый заказчик',clientInn:'',service:'Макет сайта\nВторой этап',amount:50000,date:'2026-10-17',city:'Казань'};
describe('Содержимое документов',()=>{
 it('сохраняет реквизиты, дату, сумму и многострочную услугу в договоре',()=>{const text=generateDocument(data);expect(text).toContain('ДОГОВОР ОКАЗАНИЯ УСЛУГ');expect(text).toContain('17 октября 2026 г.');expect(text).toContain('г. Казань');expect(text).toContain(data.executorInn);expect(text).toContain(data.service);expect(text.replace(/\s/g,'')).toContain('50000рублей');expect(text).not.toMatch(/undefined|NaN/)});
 it('формирует отдельный акт с теми же сторонами и суммой',()=>{const text=generateDocument({...data,docType:'act'});expect(text).toContain('АКТ ОБ ОКАЗАННЫХ УСЛУГАХ');expect(text).not.toContain('ДОГОВОР ОКАЗАНИЯ УСЛУГ №');expect(text).toContain(data.executorName);expect(text).toContain(data.clientName);expect(text).toContain(data.service)});
 it('не теряет текст, похожий на разметку',()=>{const service='Макет <section> и символы &';expect(generateDocument({...data,service})).toContain(service)});
});

describe('Условия документа задают стороны',()=>{
 it('сохраняет согласованные оплату и период вместо выдуманных пяти дней',()=>{const text=generateDocument({...data,paymentTerms:'Аванс 20%, остальное до 30 ноября.',servicePeriod:'С 1 по 20 ноября 2026 года'});expect(text).toContain('Аванс 20%, остальное до 30 ноября.');expect(text).toContain('С 1 по 20 ноября 2026 года');expect(text).not.toContain('5 (пяти) рабочих дней');});
 it('не заявляет отсутствие претензий и не выдумывает представителя заказчика',()=>{const text=generateDocument({...data,docType:'act',acceptanceNotes:'Принято с замечаниями: исправить отступы.'});expect(text).toContain('Принято с замечаниями: исправить отступы.');expect(text).not.toContain('Претензий к качеству и объёму оказанных услуг не имеется');expect(text).not.toContain(`в лице ${data.clientName}`);});
 it('не подставляет договорные факты при отсутствии условий',()=>{const text=generateDocument(data);expect(text).toContain('Порядок и срок оплаты:\n________________________________');expect(text).not.toContain('5 (пяти) рабочих дней');const act=generateDocument({...data,docType:'act'});expect(act).toContain('Замечания и условия приёмки:\n________________________________');});
});

it('не восстанавливает город и дату после их явной очистки',()=>{const text=generateDocument({...data,city:'',date:''});expect(text).toContain('г. ________________');expect(text).toContain('«________________»');expect(text).not.toContain('г. Москва');});
