/**
 * Финансовый помощник для самозанятых
 * Единый файл нормативных параметров 2026 года.
 *
 * Все зависящие от года ставки, лимиты и взносы должны браться отсюда.
 * Для добавления параметров 2027 года создайте rules-2027.ts по аналогии.
 */

export const RULES_2026 = {
  updatedAt: '2026-07-16',
  sources: {
    npd: {
      title: 'ФНС: налог на профессиональный доход',
      url: 'https://www.nalog.gov.ru/',
    },
    sfr: {
      title: 'Социальный фонд России',
      url: 'https://sfr.gov.ru/',
    },
  },

  /** НПД — налог на профессиональный доход */
  npd: {
    incomeLimit: 2_400_000,
    rateIndividuals: 0.04,
    rateCompanies: 0.06,
    deductionLimit: 10_000,
    /** Льготные ставки с учётом вычета (пока не исчерпан) */
    rateIndividualsDeducted: 0.03,
    rateCompaniesDeducted: 0.04,
  },

  /** ИП на УСН «Доходы» 6% без работников */
  ipUsn: {
    rateIncome: 0.06,
    rateIncomeMinusExpenses: 0.15,
    fixedContribution: 57_390,
    additionalRate: 0.01,
    additionalThreshold: 300_000,
    additionalCap: 321_818,
    /** Справочно: лимит дохода для УСН */
    incomeLimitRef: 490_500_000,
    /** Справочно: порог НДС для УСН */
    vatThresholdRef: 20_000_000,
  },

  /** Добровольное социальное страхование (больничный) */
  socialInsurance: {
    tariff: 0.0384,
    insuranceAmounts: [35_000, 50_000] as const,
    discountMonths10: 19,
    discountMonths30: 25,
    discountFactor10: 0.9,
    discountFactor30: 0.7,
    rightToPayoutMonths: 6,
  },

  /** Добровольные пенсионные взносы (ОПС) */
  pension: {
    fullYearCost: 71_525.52,
    mrot: 27_093,
    formula: '22% × 12 × МРОТ',
  },

  /** Точка безубыточности УСН «Доходы» vs «Доходы минус расходы» */
  expenseShareBreakeven: 0.6,
} as const;

/** Типы для удобства */
export type ClientType = 'individual' | 'business';
export type RiskLevel = 'green' | 'amber' | 'red';
export type MonthName =
  | 'Январь' | 'Февраль' | 'Март' | 'Апрель' | 'Май' | 'Июнь'
  | 'Июль' | 'Август' | 'Сентябрь' | 'Октябрь' | 'Ноябрь' | 'Декабрь';
