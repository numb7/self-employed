import { useState, useMemo } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import { ControlGroup } from '../ui/ControlGroup';
import { ResultCard } from '../ui/ResultCard';
import {
  calculateTargetHourlyRate,
  calculateActualHourlyRate,
  type HourlyRateResult,
} from '@/lib/calculations';
import { formatMoney } from '@/lib/format';
import type { ClientType } from '@/lib/rules-2026';

export function HourlyRateCalculator() {
  const [mode, setMode] = useState<'target' | 'actual'>('target');
  const [clientType, setClientType] = useState<ClientType>('individual');
  // Target mode fields
  const [desiredNet, setDesiredNet] = useState<number | null>(null);
  const [hoursPerMonth, setHoursPerMonth] = useState<number | null>(null);
  // Actual mode fields
  const [projectPayment, setProjectPayment] = useState<number | null>(null);
  const [actualHours, setActualHours] = useState<number | null>(null);

  const rate = clientType === 'business' ? 6 : 4;

  // Target: desired net + hours
  const isReadyTarget = desiredNet !== null && desiredNet > 0 && hoursPerMonth !== null && hoursPerMonth > 0;
  // Actual: payment + hours
  const isReadyActual = projectPayment !== null && projectPayment > 0 && actualHours !== null && actualHours > 0;
  const isReady = mode === 'target' ? isReadyTarget : isReadyActual;

  const result = useMemo((): HourlyRateResult | null => {
    if (mode === 'target' && isReadyTarget) {
      return calculateTargetHourlyRate(desiredNet!, hoursPerMonth!, clientType);
    }
    if (mode === 'actual' && isReadyActual) {
      return calculateActualHourlyRate(projectPayment!, actualHours!, clientType);
    }
    return null;
  }, [mode, isReadyTarget, isReadyActual, desiredNet, hoursPerMonth, projectPayment, actualHours, clientType]);

  const whyItems = useMemo(() => {
    if (!result) return [];
    if (result.mode === 'target') {
      return [
        `Желаемый чистый доход: ${formatMoney(desiredNet!)} ₽/мес.`,
        `Ставка НПД: ${rate}% (${clientType === 'business' ? 'юрлица / ИП' : 'физлица'})`,
        `Необходимо выставить: ${formatMoney(result.grossNeeded)} ₽/мес.`,
      ];
    }
    return [
      `Оплата за проект: ${formatMoney(projectPayment!)} ₽`,
      `Ставка НПД: ${rate}% (${clientType === 'business' ? 'юрлица / ИП' : 'физлица'})`,
      `Чистыми: ${formatMoney(result.netTotal)} ₽`,
    ];
  }, [result, rate, clientType, projectPayment]);

  return (
    <div className="flex flex-col gap-6" id="calculator-hourly-rate">
      <ControlGroup label="Ставка в час">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Кто ваш клиент?</span>
          <SegmentedToggle
            name="hourlyClientType"
            value={clientType}
            onChange={(v) => setClientType(v as ClientType)}
            options={[
              { value: 'individual', label: 'Физлица (4% НПД)' },
              { value: 'business', label: 'Юрлица (6% НПД)' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Какой расчёт нужен?</span>
          <SegmentedToggle
            name="hourlyMode"
            value={mode}
            onChange={(v) => setMode(v as 'target' | 'actual')}
            options={[
              { value: 'target', label: 'Сколько просить' },
              { value: 'actual', label: 'Сколько реально получаю' },
            ]}
          />
        </div>

        {mode === 'target' ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hourly-desired" className="text-sm font-medium text-ink">
                Желаемый доход после налога
              </label>
              <CurrencyInput
                id="hourly-desired"
                value={desiredNet}
                onValueChange={setDesiredNet}
                required
                placeholder="150 000"
                hint="Доход после уплаты налога"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hourly-hours-target" className="text-sm font-medium text-ink">
                Рабочих часов в месяц
              </label>
              <NumberInput
                id="hourly-hours-target"
                value={hoursPerMonth}
                onValueChange={setHoursPerMonth}
                integer
                suffix="ч."
                placeholder="160"
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hourly-payment" className="text-sm font-medium text-ink">
                Оплата за проект
              </label>
              <CurrencyInput
                id="hourly-payment"
                value={projectPayment}
                onValueChange={setProjectPayment}
                required
                placeholder="100 000"
                hint="Сумма в договоре / счёте"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hourly-hours-actual" className="text-sm font-medium text-ink">
                Сколько часов потратили?
              </label>
              <NumberInput
                id="hourly-hours-actual"
                value={actualHours}
                onValueChange={setActualHours}
                suffix="ч."
                placeholder="40"
                required
              />
            </div>
          </>
        )}
      </ControlGroup>

      <div aria-live="polite" role="status">
        {!isReady ? (
          <p className="text-muted text-sm py-4">
            {mode === 'target'
              ? 'Укажите желаемый доход и рабочие часы — рассчитаем ставку'
              : 'Укажите оплату и потраченные часы — рассчитаем реальную ставку'}
          </p>
        ) : result ? (
          <ResultCard
            label={
              result.mode === 'target'
                ? 'Ставка для счёта'
                : 'Реальная ставка (после налога)'
            }
            figure={
              result.mode === 'target'
                ? `${formatMoney(result.hourlyRate)} ₽/ч`
                : `${formatMoney(result.netHourlyRate)} ₽/ч`
            }
            subtitle={
              result.mode === 'target'
                ? `Нужно выставлять ${formatMoney(result.grossMonthly)} ₽/мес. (до налога)`
                : `Чистыми за проект: ${formatMoney(result.netTotal)} ₽`
            }
            detail={
              result.mode === 'target'
                ? `С учётом НПД ${rate}%: заказчик платит ${formatMoney(result.grossNeeded)} ₽, вы получаете ${formatMoney(desiredNet!)} ₽`
                : `Проект: ${formatMoney(projectPayment!)} ₽ → налог ${rate}% → ${formatMoney(result.netTotal)} ₽`
            }
            whyItems={whyItems}
            next={{ to: '/otlozhit-na-nalog', label: 'Сколько отложить на налог' }}
            trust={['ФНС 2026', `НПД ${rate}%`, 'Без отправки данных']}
          />
        ) : null}
      </div>
    </div>
  );
}
