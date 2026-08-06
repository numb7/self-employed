/**
 * Адаптер над единым конфигом rules-2026.ts для мастера выбора режима.
 * Все числовые значения берутся из RULES_2026 — дублирования нет.
 */

import { RULES_2026 } from './rules-2026';

export const TAX_CONSTANTS_2026 = {
  get NPD_INCOME_LIMIT() { return RULES_2026.npd.incomeLimit; },
  get NPD_RATE_INDIVIDUAL() { return RULES_2026.npd.rateIndividuals; },
  get NPD_RATE_BUSINESS() { return RULES_2026.npd.rateCompanies; },

  get IP_FIXED_CONTRIBUTION() { return RULES_2026.ipUsn.fixedContribution; },
  get IP_ADDITIONAL_RATE() { return RULES_2026.ipUsn.additionalRate; },
  get IP_ADDITIONAL_THRESHOLD() { return RULES_2026.ipUsn.additionalThreshold; },
  get IP_ADDITIONAL_CAP() { return RULES_2026.ipUsn.additionalCap; },

  get USN_INCOME_RATE() { return RULES_2026.ipUsn.rateIncome; },
  get USN_INCOME_MINUS_EXPENSES_RATE() { return RULES_2026.ipUsn.rateIncomeMinusExpenses; },

  /** Точка безубыточности между УСН «доходы» и «доходы минус расходы» */
  get EXPENSE_SHARE_BREAKEVEN() { return RULES_2026.expenseShareBreakeven; },

  /** Справочные данные — не участвуют в recommendRegime(), для FAQ/дисклеймеров */
  get USN_INCOME_LIMIT_REF() { return RULES_2026.ipUsn.incomeLimitRef; },
  get VAT_THRESHOLD_REF() { return RULES_2026.ipUsn.vatThresholdRef; },

  get SOURCES_UPDATED() { return RULES_2026.updatedAt; },
} as const;
