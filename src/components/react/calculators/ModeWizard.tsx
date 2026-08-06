import { useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ProgressIndicator } from '../ui/ProgressIndicator';

// ============================================
// Types
// ============================================

type ActivityType = 'services' | 'own_goods' | 'resale' | 'rental';
type YesNo = 'true' | 'false';
type IncomeRange = 'under_2_4m' | '2_4_to_10m' | 'over_10m';
type ExpenseShare = 'none' | 'low' | 'high';
type Regime = 'npd' | 'usn_income' | 'usn_income_minus_expenses';

interface Answers {
  activityType: ActivityType | null;
  hasEmployees: YesNo | null;
  expectedIncome: IncomeRange | null;
  expenseShare: ExpenseShare | null;
}

interface Question {
  key: keyof Answers;
  title: string;
  options: { value: string; label: string; caption?: string }[];
}

// ============================================
// Wizard questions
// ============================================

const QUESTIONS: Question[] = [
  {
    key: 'activityType',
    title: 'Чем вы занимаетесь?',
    options: [
      { value: 'services', label: 'Оказываю услуги', caption: 'Фриланс, консультации, работы' },
      { value: 'own_goods', label: 'Продаю товары собственного производства' },
      { value: 'resale', label: 'Перепродаю товары', caption: 'Не своего производства' },
      { value: 'rental', label: 'Сдаю в аренду недвижимость' },
    ],
  },
  {
    key: 'hasEmployees',
    title: 'Планируете нанимать сотрудников?',
    options: [
      { value: 'true', label: 'Да' },
      { value: 'false', label: 'Нет' },
    ],
  },
  {
    key: 'expectedIncome',
    title: 'Сколько примерно планируете зарабатывать в год?',
    options: [
      { value: 'under_2_4m', label: 'До 2,4 млн ₽' },
      { value: '2_4_to_10m', label: 'От 2,4 до 10 млн ₽' },
      { value: 'over_10m', label: 'От 10 млн ₽' },
    ],
  },
  {
    key: 'expenseShare',
    title: 'Какая часть дохода уходит на расходы (закупка, аренда, материалы)?',
    options: [
      { value: 'none', label: 'Расходов почти нет', caption: 'Услуги, консультации' },
      { value: 'low', label: 'Небольшие расходы', caption: 'До 20–30% от дохода' },
      { value: 'high', label: 'Существенные расходы', caption: 'От 40% и выше' },
    ],
  },
];

// ============================================
// Decision logic
// ============================================

function buildNpdReasons(answers: Answers): string[] {
  const reasons = ['Доход в пределах лимита НПД (2,4 млн ₽/год)'];
  reasons.push(answers.hasEmployees === 'false' ? 'Не планируете нанимать сотрудников' : 'Нет наёмных сотрудников');
  if (answers.activityType === 'rental') {
    reasons.push('Сдача недвижимости в аренду допускается на НПД');
  } else {
    reasons.push('Деятельность не связана с перепродажей товаров');
  }
  return reasons;
}

function buildUsnReasons(answers: Answers, regime: Regime): string[] {
  const reasons: string[] = [];
  if (answers.activityType === 'resale') {
    reasons.push('Перепродажа товаров не подпадает под НПД');
  }
  if (answers.hasEmployees === 'true') {
    reasons.push('Планируете нанимать сотрудников — НПД это запрещает');
  }
  if (answers.expectedIncome === '2_4_to_10m' || answers.expectedIncome === 'over_10m') {
    reasons.push('Ожидаемый доход выше лимита НПД (2,4 млн ₽/год)');
  }
  if (regime === 'usn_income_minus_expenses') {
    reasons.push('Высокая доля расходов делает эту схему выгоднее');
  } else if (reasons.length < 2) {
    reasons.push('Расходы минимальны — платить с полного дохода проще и выгоднее');
  }
  return reasons.slice(0, 3);
}

function recommendRegime(answers: Answers): { regime: Regime; reasons: string[] } {
  const { activityType, hasEmployees, expectedIncome, expenseShare } = answers;

  const npdExcluded =
    activityType === 'resale' ||
    hasEmployees === 'true' ||
    expectedIncome === '2_4_to_10m' ||
    expectedIncome === 'over_10m';

  if (!npdExcluded) {
    return { regime: 'npd', reasons: buildNpdReasons(answers) };
  }

  if (expenseShare === 'high') {
    return { regime: 'usn_income_minus_expenses', reasons: buildUsnReasons(answers, 'usn_income_minus_expenses') };
  }

  return { regime: 'usn_income', reasons: buildUsnReasons(answers, 'usn_income') };
}

// ============================================
// Result data
// ============================================

const REGIME_LABELS: Record<Regime, string> = {
  npd: 'самозанятость',
  usn_income: 'ИП на УСН «Доходы»',
  usn_income_minus_expenses: 'ИП на УСН «Доходы минус расходы»',
};

const RESULT_DATA: Record<Regime, {
  title: string;
  receipts: { label: string; value: string; highlight?: boolean }[];
  nextSteps: string[];
  ctaTitle: string;
  ctaText: string;
  relatedUrl: string;
  relatedText: string;
}> = {
  npd: {
    title: 'Вам подходит самозанятость',
    receipts: [
      { label: 'Ставка налога (доход от физлиц)', value: '4%', highlight: true },
      { label: 'Ставка налога (доход от юрлиц/ИП)', value: '6%', highlight: true },
    ],
    nextSteps: [
      'Зарегистрироваться в приложении «Мой налог»',
      'Открыть счёт самозанятого в банке-партнёре, если нужен отдельный счёт',
    ],
    ctaTitle: 'Открыть счёт самозанятого',
    ctaText: 'Отдельный счёт для приёма оплат от клиентов — оформление в приложении банка-партнёра.',
    relatedUrl: '/limit-dohoda',
    relatedText: 'Калькулятор лимита дохода НПД →',
  },
  usn_income: {
    title: 'Вам подходит ИП на УСН «Доходы»',
    receipts: [
      { label: 'Ставка налога', value: '6% с дохода', highlight: true },
      { label: 'Фикс. взносы ИП «за себя» (2026)', value: '57 390 ₽/год' },
    ],
    nextSteps: [
      'Зарегистрировать ИП через Госуслуги или банк-партнёр',
      'Открыть расчётный счёт для ИП',
    ],
    ctaTitle: 'Открыть ИП и расчётный счёт',
    ctaText: 'Оформление ИП и счёта в банке-партнёре — онлайн, без визита в налоговую.',
    relatedUrl: '/ip-ili-samozanyatyy',
    relatedText: 'Сравнить точную налоговую нагрузку →',
  },
  usn_income_minus_expenses: {
    title: 'Вам подходит ИП на УСН «Доходы минус расходы»',
    receipts: [
      { label: 'Ставка налога', value: '15% с разницы (доходы − расходы)', highlight: true },
      { label: 'Фикс. взносы ИП «за себя» (2026)', value: '57 390 ₽/год' },
    ],
    nextSteps: [
      'Зарегистрировать ИП через Госуслуги или банк-партнёр',
      'Открыть расчётный счёт для ИП и вести учёт расходов с подтверждающими документами',
    ],
    ctaTitle: 'Открыть ИП и расчётный счёт',
    ctaText: 'Оформление ИП и счёта в банке-партнёре — онлайн, без визита в налоговую.',
    relatedUrl: '/ip-ili-samozanyatyy',
    relatedText: 'Сравнить точную налоговую нагрузку →',
  },
};

// ============================================
// localStorage
// ============================================

const STORAGE_KEY = 'fe_wizardResult';

function loadPreviousResult(): Regime | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.regime && REGIME_LABELS[parsed.regime as Regime]) {
      return parsed.regime as Regime;
    }
  } catch { /* ignore */ }
  return null;
}

function saveResult(regime: Regime) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ regime, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

// ============================================
// Animation helpers
// ============================================

type Direction = 'forward' | 'back';

function getSlideClass(direction: Direction, entering: boolean): string {
  if (entering) {
    return direction === 'forward'
      ? 'animate-[wizardSlideInRight_250ms_var(--ease-out)_both]'
      : 'animate-[wizardSlideInLeft_250ms_var(--ease-out)_both]';
  }
  return direction === 'forward'
    ? 'animate-[wizardSlideOutLeft_200ms_var(--ease-out)_both]'
    : 'animate-[wizardSlideOutRight_200ms_var(--ease-out)_both]';
}

// ============================================
// Sub-components
// ============================================

function TapCard({
  label,
  caption,
  selected,
  onClick,
}: {
  label: string;
  caption?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-[var(--radius-card)] border px-4 py-3.5 text-left transition-all duration-[var(--duration-fast)]',
        'hover:border-accent/50 active:scale-[0.98]',
        selected
          ? 'border-accent bg-accent-soft text-ink shadow-[0_0_0_1px_var(--color-accent)]'
          : 'border-line bg-surface text-ink',
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      {caption && <span className="text-xs text-muted">{caption}</span>}
    </button>
  );
}

function ReceiptLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="flex-1 text-muted">{label}</span>
      <span className="border-b border-dotted border-line flex-1" aria-hidden="true" />
      <span className={cn('font-mono text-sm shrink-0', highlight && 'text-green font-medium')}>
        {value}
      </span>
    </div>
  );
}

// ============================================
// Main component
// ============================================

export function ModeWizard() {
  // step: 0 = intro, 1-4 = questions, 5 = result
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    activityType: null,
    hasEmployees: null,
    expectedIncome: null,
    expenseShare: null,
  });
  const [direction, setDirection] = useState<Direction>('forward');
  const [previousResult, setPreviousResult] = useState<Regime | null>(loadPreviousResult);

  const currentQuestion = step >= 1 && step <= 4 ? QUESTIONS[step - 1] : null;

  const handleStart = useCallback(() => {
    setDirection('forward');
    setStep(1);
  }, []);

  const handleAnswer = useCallback((key: keyof Answers, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [key]: value };
      const nextStep = Math.min(step + 1, 5);
      setDirection('forward');
      setStep(nextStep);
      if (nextStep === 5) {
        const result = recommendRegime(updated);
        saveResult(result.regime);
        setPreviousResult(result.regime);
      }
      return updated;
    });
  }, [step]);

  const handleBack = useCallback(() => {
    if (step <= 1) {
      setDirection('back');
      setStep(0);
    } else {
      setDirection('back');
      setStep(step - 1);
    }
  }, [step]);

  const handleRestart = useCallback(() => {
    setAnswers({
      activityType: null,
      hasEmployees: null,
      expectedIncome: null,
      expenseShare: null,
    });
    setDirection('back');
    setStep(0);
  }, []);

  const result = step === 5 ? recommendRegime(answers) : null;
  const resultData = result ? RESULT_DATA[result.regime] : null;

  return (
    <div className="flex flex-col gap-5" id="calculator-wizard">
      {/* Intro */}
      {step === 0 && (
        <div className={cn('flex flex-col items-center gap-5 text-center', getSlideClass(direction, true))}>
          <div className="mx-auto max-w-md">
            <h2 className="font-head text-xl font-semibold text-ink">
              Не знаете, что выбрать — самозанятость или ИП?
            </h2>
            <p className="mt-3 text-sm text-muted">
              Ответьте на 4 вопроса, и мы подберём оптимальный налоговый режим для вашей ситуации.
            </p>
          </div>

          {previousResult && (
            <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
              <p className="text-muted">
                Вы уже проходили тест. Ваш результат:{' '}
                <strong className="text-ink">{REGIME_LABELS[previousResult]}</strong>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            className="rounded-[var(--radius-card)] bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-2 transition-colors duration-[var(--duration-fast)]"
          >
            Начать
          </button>
        </div>
      )}

      {/* Questions */}
      {step >= 1 && step <= 4 && currentQuestion && (
        <div className={cn('flex flex-col gap-5', getSlideClass(direction, true))}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-line text-ink hover:bg-lavender transition-colors duration-[var(--duration-fast)]"
              aria-label="Назад"
            >
              ←
            </button>
            <ProgressIndicator percent={Math.round((step / 4) * 100)} label={`Шаг ${step} из 4`} />
          </div>

          <h2 className="font-head text-lg font-semibold text-ink">{currentQuestion.title}</h2>

          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={currentQuestion.title}>
            <legend className="sr-only">{currentQuestion.title}</legend>
            {currentQuestion.options.map((option) => (
              <TapCard
                key={option.value}
                label={option.label}
                caption={option.caption}
                selected={answers[currentQuestion.key] === option.value}
                onClick={() => handleAnswer(currentQuestion.key, option.value)}
              />
            ))}
          </fieldset>
        </div>
      )}

      {/* Result */}
      {step === 5 && resultData && (
        <div className={cn('flex flex-col gap-5', getSlideClass(direction, true))}>
          <button
            type="button"
            onClick={handleBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-line text-ink hover:bg-lavender transition-colors duration-[var(--duration-fast)] self-start"
            aria-label="Назад"
          >
            ←
          </button>

          <section className="animate-[resultAppear_300ms_ease-out_both]" aria-live="polite">
            {/* Stamp */}
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border-2 border-green/40 bg-green/5 px-3 py-1.5 text-sm font-medium text-green -rotate-[3deg]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Рекомендация готова
            </div>

            <h2 className="font-head text-xl font-semibold text-ink">{resultData.title}</h2>

            {/* Reasons */}
            <ul className="mt-4 flex flex-col gap-2">
              {result.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {reason}
                </li>
              ))}
            </ul>

            {/* Receipt */}
            <div className="mt-5 flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-4">
              {resultData.receipts.map((r, i) => (
                <ReceiptLine key={i} label={r.label} value={r.value} highlight={r.highlight} />
              ))}
            </div>

            {/* Next steps */}
            <div className="mt-5">
              <h3 className="font-head text-sm font-semibold text-ink">Что дальше</h3>
              <ol className="mt-2 flex flex-col gap-1.5 text-sm text-muted list-decimal list-inside">
                {resultData.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <a
                href={resultData.relatedUrl}
                className="mt-3 inline-block rounded-[var(--radius-card)] border border-line bg-surface px-4 py-2.5 text-sm font-medium text-accent hover:bg-lavender transition-colors duration-[var(--duration-fast)]"
              >
                {resultData.relatedText}
              </a>
            </div>

            {/* CTA card */}
            <div className="mt-5 rounded-[var(--radius-card)] border border-accent/20 bg-accent-soft p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-accent">Следующий шаг</span>
              <h3 className="mt-1 font-head text-base font-semibold text-ink">{resultData.ctaTitle}</h3>
              <p className="mt-1 text-sm text-muted">{resultData.ctaText}</p>
            </div>

            {/* Disclaimer */}
            <p className="mt-4 text-xs text-faint">
              Это ориентир, а не официальная консультация. Точный расчёт может отличаться в зависимости от региона и вида деятельности — проверьте на сайте ФНС или у бухгалтера перед регистрацией.
            </p>

            {/* Restart */}
            <button
              type="button"
              onClick={handleRestart}
              className="mt-2 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-lavender transition-colors duration-[var(--duration-fast)]"
            >
              Пройти заново
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
