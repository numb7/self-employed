// Финансовый помощник для самозанятых
// Адаптер над единым конфигом rules-2026.js для мастера выбора режима (js/wizard.js).
// Все числовые значения берутся из window.RULES_2026 — дублирования нет.

const TAX_CONSTANTS_2026 = {
    get NPD_INCOME_LIMIT() { return window.RULES_2026.npd.incomeLimit; },
    get NPD_RATE_INDIVIDUAL() { return window.RULES_2026.npd.rateIndividuals; },
    get NPD_RATE_BUSINESS() { return window.RULES_2026.npd.rateCompanies; },

    get IP_FIXED_CONTRIBUTION() { return window.RULES_2026.ipUsn.fixedContribution; },
    get IP_ADDITIONAL_RATE() { return window.RULES_2026.ipUsn.additionalRate; },
    get IP_ADDITIONAL_THRESHOLD() { return window.RULES_2026.ipUsn.additionalThreshold; },
    get IP_ADDITIONAL_CAP() { return window.RULES_2026.ipUsn.additionalCap; },

    get USN_INCOME_RATE() { return window.RULES_2026.ipUsn.rateIncome; },
    get USN_INCOME_MINUS_EXPENSES_RATE() { return window.RULES_2026.ipUsn.rateIncomeMinusExpenses; },

    // Точка безубыточности между УСН «доходы» и «доходы минус расходы»
    get EXPENSE_SHARE_BREAKEVEN() { return window.RULES_2026.expenseShareBreakeven; },

    // Справочные данные — не участвуют в recommendRegime(), для FAQ/дисклеймеров
    get USN_INCOME_LIMIT_REF() { return window.RULES_2026.ipUsn.incomeLimitRef; },
    get VAT_THRESHOLD_REF() { return window.RULES_2026.ipUsn.vatThresholdRef; },

    get SOURCES_UPDATED() { return window.RULES_2026.updatedAt; }
};
