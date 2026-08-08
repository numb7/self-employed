import { useState, useMemo } from 'react';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { CurrencyInput } from '../ui/CurrencyInput';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';

type DocType = 'agreement' | 'act';

interface FormData {
  docType: DocType;
  executorName: string;
  executorInn: string;
  clientName: string;
  clientInn: string;
  service: string;
  amount: number | null;
  date: string;
  city: string;
}

function generateDocument(data: FormData): string {
  const today = data.date || new Date().toISOString().slice(0, 10);
  const city = data.city || 'Москва';
  const amountStr = data.amount ? `${formatMoney(data.amount)} рублей` : '________ рублей';

  if (data.docType === 'agreement') {
    return `ДОГОВОР ОКАЗАНИЯ УСЛУГ № ____

г. ${city}                                                    «${formatDateRu(today)}»

${data.clientName || 'Заказчик'}, именуемое в дальнейшем «Заказчик», с одной стороны, и
${data.executorName || 'Исполнитель'}, ИНН ${data.executorInn || '________'}, именуемый в дальнейшем «Исполнитель», с другой стороны,

совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать Заказчику следующие услуги:
${data.service || '________________________________________'}
1.2. Заказчик обязуется принять и оплатить оказанные услуги.

2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК ОПЛАТЫ
2.1. Стоимость услуг по настоящему Договору составляет ${amountStr} 00 коп., включая НДС — не облагается (Исполнитель применяет налог на профессиональный доход).
2.2. Оплата производится в течение 5 (пяти) рабочих дней с момента подписания Акта об оказанных услугах.

3. ПОРЯДОК СДАЧИ-ПРИЁМКИ УСЛУГ
3.1. По завершении оказания услуг Стороны подписывают Акт об оказанных услугах.
3.2. Качество оказанных услуг должно соответствовать требованиям настоящего Договора.

4. ОТВЕТСТВЕННОСТЬ СТОРОН
4.1. За неисполнение или ненадлежащее исполнение обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством РФ.

5. СРОК ДЕЙСТВИЯ ДОГОВОРА
5.1. Настоящий Договор вступает в силу с момента его подписания Сторонами.
5.2. Договор считается исполненным после полного выполнения обязательств Сторонами.

6. ПРОЧИЕ УСЛОВИЯ
6.1. Настоящий Договор составлен в двух экземплярах, имеющих равную юридическую силу.

РЕКВИЗИТЫ СТОРОН:

Заказчик: ${data.clientName || '________________________________'}
ИНН: ${data.clientInn || '________________________________'}

Исполнитель: ${data.executorName || '________________________________'}
ИНН: ${data.executorInn || '________________________________'}


Заказчик: ___________________ / ${data.clientName || '________'} /

Исполнитель: ___________________ / ${data.executorName || '________'} /


М.П.                                                                 М.П.`;
  }

  // Act
  return `АКТ ОБ ОКАЗАННЫХ УСЛУГАХ № ____

г. ${city}                                                    «${formatDateRu(today)}»

${data.clientName || 'Заказчик'}, именуемое в дальнейшем «Заказчик», в лице ${data.clientName || '________'}, с одной стороны, и
${data.executorName || 'Исполнитель'}, ИНН ${data.executorInn || '________'}, именуемое в дальнейшем «Исполнитель», с другой стороны,

совместно именуемые «Стороны», составили настоящий Акт о нижеследующем:

1. Исполнитель оказал, а Заказчик принял следующие услуги:
${data.service || '________________________________________'}

2. Стоимость оказанных услуг составляет ${amountStr} 00 коп., включая НДС — не облагается (Исполнитель применяет налог на профессиональный доход).

3. Претензий к качеству и объёму оказанных услуг не имеется.

4. Настоящий Акт составлен в двух экземплярах, имеющих равную юридическую силу.


Заказчик: ___________________ / ${data.clientName || '________'} /

Исполнитель: ___________________ / ${data.executorName || '________'} /


М.П.                                                                 М.П.`;
}

function formatDateRu(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y} г.`;
}

export function ContractGenerator() {
  const [formData, setFormData] = useState<FormData>({
    docType: 'agreement',
    executorName: '',
    executorInn: '',
    clientName: '',
    clientInn: '',
    service: '',
    amount: null,
    date: new Date().toISOString().slice(0, 10),
    city: 'Москва',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isReady = formData.executorName.trim() !== '' && formData.clientName.trim() !== '';

  const document = useMemo(() => {
    if (!showPreview) return '';
    return generateDocument(formData);
  }, [showPreview, formData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([document], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = formData.docType === 'agreement' ? 'dogovor.txt' : 'akt.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6" id="calculator-contract">
      <ControlGroup
        label="Документ"
        description="Укажите данные — сервис соберёт редактируемый шаблон договора или акта."
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Тип документа</span>
          <SegmentedToggle
            name="docType"
            value={formData.docType}
            onChange={(v) => { update('docType', v as DocType); setShowPreview(false); }}
            options={[
              { value: 'agreement', label: 'Договор' },
              { value: 'act', label: 'Акт' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="executorName" className="text-sm font-medium text-ink">
              ФИО исполнителя
            </label>
            <input
              id="executorName"
              type="text"
              value={formData.executorName}
              onChange={(e) => update('executorName', e.target.value)}
              placeholder="Иванов Иван Иванович"
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="executorInn" className="text-sm font-medium text-ink">
              ИНН исполнителя
            </label>
            <input
              id="executorInn"
              type="text"
              inputMode="numeric"
              value={formData.executorInn}
              onChange={(e) => update('executorInn', e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="000000000000"
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientName" className="text-sm font-medium text-ink">
              Название / ФИО заказчика
            </label>
            <input
              id="clientName"
              type="text"
              value={formData.clientName}
              onChange={(e) => update('clientName', e.target.value)}
              placeholder="ООО «Компания»"
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientInn" className="text-sm font-medium text-ink">
              ИНН заказчика
            </label>
            <input
              id="clientInn"
              type="text"
              inputMode="numeric"
              value={formData.clientInn}
              onChange={(e) => update('clientInn', e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="0000000000"
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="service" className="text-sm font-medium text-ink">
            Описание услуги
          </label>
          <textarea
            id="service"
            value={formData.service}
            onChange={(e) => update('service', e.target.value)}
            placeholder="Разработка дизайна сайта, написание текстов..."
            rows={3}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)] resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="text-sm font-medium text-ink">
              Сумма, ₽
            </label>
            <CurrencyInput
              id="amount"
              value={formData.amount}
              onValueChange={(v) => update('amount', v)}
              placeholder="50 000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-ink">
              Дата
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => update('date', e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="city" className="text-sm font-medium text-ink">
              Город
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Москва"
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 hover:border-line-2 transition-colors duration-[var(--duration-fast)]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(true)}
          disabled={!isReady}
          className={cn(
            'min-h-11 rounded-[var(--radius-card)] px-5 py-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]',
            isReady
              ? 'bg-accent text-white hover:bg-accent-2'
              : 'bg-lavender text-faint cursor-not-allowed',
          )}
        >
          {formData.docType === 'agreement' ? 'Сформировать договор' : 'Сформировать акт'}
        </button>
      </ControlGroup>

      {showPreview && (
        <div className="animate-[resultAppear_300ms_ease-out_both]">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card-rest)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-badge)] bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                {formData.docType === 'agreement' ? 'Договор сформирован' : 'Акт сформирован'}
              </span>
            </div>
            <pre className="whitespace-pre-wrap font-body text-sm text-ink leading-relaxed">
              {document}
            </pre>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-11 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-lavender transition-colors duration-[var(--duration-fast)]"
            >
              {copied ? 'Текст скопирован' : 'Скопировать текст'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="min-h-11 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-lavender transition-colors duration-[var(--duration-fast)]"
            >
              Скачать файл .txt
            </button>
          </div>

          <p className="mt-3 text-xs text-faint">
            Проверьте условия перед подписанием: шаблон не учитывает особенности конкретной сделки и не заменяет консультацию юриста.
          </p>
        </div>
      )}
    </div>
  );
}
