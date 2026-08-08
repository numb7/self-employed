/**
 * Финансовый помощник для самозанятых
 * Чистые функции расчёта — без DOM-зависимости.
 * Все налоговые параметры берутся из rules-2026.ts.
 */

import {
  RULES_2026,
  type ClientType,
  type RiskLevel,
  type MonthName,
} from './rules-2026';
import { MONTHS } from './format';

// ============================================
// Типы результатов
// ============================================

export interface ContributionResult {
  monthlyContribution: number;
  payoutAfter6: number;
  payoutAfter12: number;
  yearCost: number;
  insuranceAmount: number;
  whyItems: string[];
}

export type IncomeMode = 'remaining' | 'whenLimit';

export interface IncomeRemainingResult {
  mode: 'remaining';
  earned: number;
  remaining: number;
  monthsLeft: number;
  safePace: number;
  earnedPercent: number;
  risk: RiskLevel;
}

export interface IncomeWhenLimitResult {
  mode: 'whenLimit';
  earned: number;
  remaining: number;
  monthsToLimit: number;
  limitMonth: number;
  limitMonthName: string | null;
  willReach: boolean;
  projectedIncome: number;
  safetyMargin: number;
}

export type IncomeLimitResult = IncomeRemainingResult | IncomeWhenLimitResult;

export interface IpComparisonResult {
  npd: number;
  ip: number;
  ipContributions: number;
  overLimit: boolean;
}

export interface PensionCostResult {
  mode: 'costForMonths';
  months: number;
  cost: number;
  pctOfFullYear: number;
}

export interface PensionMonthsResult {
  mode: 'monthsForPayment';
  amount: number;
  months: number;
}

export type PensionResult = PensionCostResult | PensionMonthsResult;

export interface ConcentrationSource {
  name: string;
  monthlyIncome: number;
  monthsWorking: number;
  share: number;
  risky: boolean;
}

export interface ConcentrationResult {
  sources: ConcentrationSource[];
  total: number;
  maxShare: number;
  level: RiskLevel;
}

export interface DeductionResult {
  used: number;
  remaining: number;
  pct: number;
  exhausted: boolean;
}

export interface SetAsideResult {
  taxWithoutDeduction: number;
  deductionUsed: number;
  deductionRemainingAfter: number;
  setAside: number;
  toKeep: number;
  rate: number;
  effectiveRate: number;
  rateLabel: string;
}

export interface HourlyTargetResult {
  mode: 'target';
  hourlyRate: number;
  grossMonthly: number;
  grossNeeded: number;
}

export interface HourlyActualResult {
  mode: 'actual';
  netHourlyRate: number;
  netTotal: number;
}

export type HourlyRateResult = HourlyTargetResult | HourlyActualResult;

export interface Chasy289Result {
  hours: number;
  consecutiveMonths: number;
  remaining: number;
  exceededBy: number;
  percent: number;
  risk: RiskLevel;
  limit: number;
  criterionMet: boolean;
}

export interface RiskTrudovyhResult {
  count: number;
  share: number;
  risk: RiskLevel;
}

// ============================================
// №1: Взносы на больничный
// ============================================

/**
 * Множитель тарифа для конкретного месяца (1-based).
 * Скидка с 19-го месяца (10%), с 25-го (30%).
 */
function monthlyFactor(month: number): number {
  const si = RULES_2026.socialInsurance;
  if (month >= si.discountMonths30) return si.discountFactor30;
  if (month >= si.discountMonths10) return si.discountFactor10;
  return 1.0;
}

/**
 * Итоговая стоимость за horizonMonths месяцев
 */
function calculateTotalCost(insuranceAmount: number, horizonMonths: number): number {
  const base = insuranceAmount * RULES_2026.socialInsurance.tariff;
  let total = 0;
  for (let m = 1; m <= horizonMonths; m++) {
    total += base * monthlyFactor(m);
  }
  return Math.round(total);
}

export function calculateContribution(insuranceAmount: number): ContributionResult {
  const monthlyContribution = Math.round(insuranceAmount * RULES_2026.socialInsurance.tariff);
  const payoutAfter6 = Math.round(insuranceAmount * 0.7);
  const payoutAfter12 = insuranceAmount;
  const yearCost = calculateTotalCost(insuranceAmount, 12);

  return {
    monthlyContribution,
    payoutAfter6,
    payoutAfter12,
    yearCost,
    insuranceAmount,
    whyItems: [
      `Страховая сумма: ${insuranceAmount.toLocaleString('ru-RU')} ₽`,
      `Тариф: ${RULES_2026.socialInsurance.tariff * 100}% (№ 456-ФЗ, ст. 5)`,
      `Взнос в месяц: ${monthlyContribution.toLocaleString('ru-RU')} ₽`,
      `Расчётная база через 6 мес: ${payoutAfter6.toLocaleString('ru-RU')} ₽ (70%)`,
      `Расчётная база через 12 мес: ${payoutAfter12.toLocaleString('ru-RU')} ₽ (100%)`,
      `Взнос за год: ${yearCost.toLocaleString('ru-RU')} ₽`,
    ],
  };
}

// ============================================
// №2: Лимит дохода
// ============================================

export function calculateIncomeRemaining(
  earned: number,
  currentMonth: number,
): IncomeRemainingResult {
  const limit = RULES_2026.npd.incomeLimit;
  const remaining = limit - earned;
  // earned is the income already received through currentMonth, so only the
  // following months are available for future income.
  const monthsLeft = Math.max(0, 12 - currentMonth);
  const safePace = monthsLeft > 0 ? remaining / monthsLeft : 0;
  const earnedPercent = Math.round((earned / limit) * 100);

  let risk: RiskLevel = 'green';
  if (remaining < 0) risk = 'red';
  else if (earnedPercent >= 80) risk = 'amber';

  return {
    mode: 'remaining',
    earned: Math.round(earned),
    remaining: Math.round(remaining),
    monthsLeft,
    safePace: Math.round(safePace),
    earnedPercent,
    risk,
  };
}

export function calculateIncomeWhenLimit(
  earned: number,
  currentMonth: number,
  avgMonthly: number,
): IncomeWhenLimitResult {
  const limit = RULES_2026.npd.incomeLimit;
  const remaining = limit - earned;

  if (remaining <= 0) {
    return {
      mode: 'whenLimit',
      earned: Math.round(earned),
      remaining: 0,
      monthsToLimit: 0,
      limitMonth: currentMonth,
      limitMonthName: 'превышен',
      willReach: true,
      projectedIncome: Math.round(earned),
      safetyMargin: 0,
    };
  }

  if (avgMonthly <= 0) {
    return {
      mode: 'whenLimit',
      earned: Math.round(earned),
      remaining: Math.round(remaining),
      monthsToLimit: Infinity,
      limitMonth: 13,
      limitMonthName: null,
      willReach: false,
      projectedIncome: Math.round(earned),
      safetyMargin: Math.round(remaining),
    };
  }

  // A partial month of income means the limit is reached in that next month,
  // not in the current one.
  const monthsToLimit = Math.ceil(remaining / avgMonthly);
  const limitMonth = currentMonth + monthsToLimit;

  if (limitMonth > 12) {
    const monthsLeftInYear = 12 - currentMonth;
    const projectedIncome = earned + avgMonthly * monthsLeftInYear;
    const safetyMargin = limit - projectedIncome;
    return {
      mode: 'whenLimit',
      earned: Math.round(earned),
      remaining: Math.round(remaining),
      monthsToLimit,
      limitMonth,
      limitMonthName: null,
      willReach: false,
      projectedIncome: Math.round(projectedIncome),
      safetyMargin: Math.round(safetyMargin),
    };
  }

  const limitMonthName = MONTHS[limitMonth - 1] ?? null;
  return {
    mode: 'whenLimit',
    earned: Math.round(earned),
    remaining: Math.round(remaining),
    monthsToLimit,
    limitMonth,
    limitMonthName,
    willReach: true,
    projectedIncome: Math.round(limit),
    safetyMargin: 0,
  };
}

// ============================================
// №3: ИП или самозанятый
// ============================================

function calculateIpContributions(revenue: number): number {
  const ip = RULES_2026.ipUsn;
  const additional = Math.min(
    ip.additionalRate * Math.max(0, revenue - ip.additionalThreshold),
    ip.additionalCap,
  );
  return ip.fixedContribution + additional;
}

function calculateIpTotalCost(revenue: number): number {
  const tax = revenue * RULES_2026.ipUsn.rateIncome;
  const contributions = calculateIpContributions(revenue);
  return Math.max(tax, contributions);
}

function calculateNpdCost(revenue: number, clientType: ClientType): number {
  const rate = clientType === 'business'
    ? RULES_2026.npd.rateCompanies
    : RULES_2026.npd.rateIndividuals;
  return revenue * rate;
}

export function compareIpVsNpd(
  revenue: number,
  clientType: ClientType,
): IpComparisonResult {
  return {
    npd: Math.round(calculateNpdCost(revenue, clientType)),
    ip: Math.round(calculateIpTotalCost(revenue)),
    ipContributions: Math.round(calculateIpContributions(revenue)),
    overLimit: revenue > RULES_2026.npd.incomeLimit,
  };
}

// ============================================
// №4: Пенсионный стаж
// ============================================

export function calculatePensionCost(months: number): PensionCostResult {
  const cost = Math.round(RULES_2026.pension.fullYearCost * (months / 12));
  return {
    mode: 'costForMonths',
    months,
    cost,
    pctOfFullYear: Math.round((months / 12) * 100),
  };
}

export function calculatePensionMonths(amount: number): PensionMonthsResult {
  const months = Math.round((amount / RULES_2026.pension.fullYearCost) * 12 * 10) / 10;
  return {
    mode: 'monthsForPayment',
    amount: Math.round(amount),
    months,
  };
}

// ============================================
// №5: Концентрация дохода
// ============================================

export function calculateConcentration(
  sources: Array<{ name: string; monthlyIncome: number; monthsWorking: number }>,
): ConcentrationResult {
  const total = sources.reduce((sum, s) => sum + Math.max(0, s.monthlyIncome), 0);

  const enriched: ConcentrationSource[] = sources.map(s => {
    const income = Math.max(0, s.monthlyIncome);
    const share = total > 0 ? Math.round((income / total) * 100) : 0;
    const risky = share >= 70 && s.monthsWorking >= 6;
    return { ...s, monthlyIncome: income, share, risky };
  });

  const maxShare = enriched.reduce((max, s) => Math.max(max, s.share), 0);

  let level: RiskLevel = 'green';
  if (enriched.some(s => s.risky)) level = 'red';
  else if (maxShare >= 50) level = 'amber';

  return { sources: enriched, total: Math.round(total), maxShare, level };
}

// ============================================
// №6: Вычет 10 000 ₽
// ============================================

export function calculateDeduction(
  incomeIndividual: number,
  incomeBusiness: number,
): DeductionResult {
  const npd = RULES_2026.npd;
  // 1 п.п. экономии от ставки 4% → 3%, 2 п.п. от 6% → 4%
  const used = Math.min(
    Math.round(incomeIndividual * (npd.rateIndividuals - npd.rateIndividualsDeducted)
      + incomeBusiness * (npd.rateCompanies - npd.rateCompaniesDeducted)),
    npd.deductionLimit,
  );
  const remaining = npd.deductionLimit - used;
  const pct = Math.min(Math.round((used / npd.deductionLimit) * 100), 100);

  return {
    used,
    remaining: Math.max(0, remaining),
    pct,
    exhausted: used >= npd.deductionLimit,
  };
}

// ============================================
// №7: Отложить на налог
// ============================================

export function calculateSetAside(
  paymentAmount: number,
  clientType: ClientType,
  deductionRemaining = 0,
): SetAsideResult {
  const npd = RULES_2026.npd;
  const baseRate = clientType === 'business' ? npd.rateCompanies : npd.rateIndividuals;
  const deductedRate = clientType === 'business' ? npd.rateCompaniesDeducted : npd.rateIndividualsDeducted;

  const taxWithoutDeduction = Math.round(paymentAmount * baseRate);

  let deductionUsed = 0;
  let deductionRemainingAfter = deductionRemaining;

  if (deductionRemaining > 0) {
    const potentialSavings = Math.round(paymentAmount * (baseRate - deductedRate));
    deductionUsed = Math.min(deductionRemaining, potentialSavings);
    deductionRemainingAfter = deductionRemaining - deductionUsed;
  }

  const setAside = taxWithoutDeduction - deductionUsed;
  const effectiveRate = paymentAmount > 0 ? setAside / paymentAmount : baseRate;

  return {
    taxWithoutDeduction,
    deductionUsed,
    deductionRemainingAfter,
    setAside,
    toKeep: paymentAmount - setAside,
    rate: baseRate,
    effectiveRate,
    rateLabel: `${Math.round(baseRate * 100)}%`,
  };
}

// ============================================
// №8: Ставка в час
// ============================================

export function calculateTargetHourlyRate(
  desiredNetIncome: number,
  hoursPerMonth: number,
  clientType: ClientType,
): HourlyTargetResult {
  const rate = clientType === 'business'
    ? RULES_2026.npd.rateCompanies
    : RULES_2026.npd.rateIndividuals;

  const grossNeeded = desiredNetIncome / (1 - rate);
  const hourlyRate = hoursPerMonth > 0 ? Math.round(grossNeeded / hoursPerMonth) : 0;
  const grossMonthly = Math.round(grossNeeded);

  return { mode: 'target', hourlyRate, grossMonthly, grossNeeded };
}

export function calculateActualHourlyRate(
  projectPayment: number,
  actualHoursSpent: number,
  clientType: ClientType,
): HourlyActualResult {
  const rate = clientType === 'business'
    ? RULES_2026.npd.rateCompanies
    : RULES_2026.npd.rateIndividuals;

  const net = projectPayment * (1 - rate);
  const netHourlyRate = actualHoursSpent > 0 ? Math.round(net / actualHoursSpent) : 0;
  const netTotal = Math.round(net);

  return { mode: 'actual', netHourlyRate, netTotal };
}

// ============================================
// №10: Риск переквалификации
// ============================================

export function calculateRiskTrudovyh(
  count: number,
  share: number,
): RiskTrudovyhResult {
  let risk: RiskLevel = 'green';
  if (count >= 3 || share > 80) risk = 'red';
  else if (count >= 1 || share >= 50) risk = 'amber';

  return { count, share, risk };
}

// ============================================
// №11: Часы 289-ФЗ
// ============================================

const CHASY_289_LIMIT = 60;

export function calculateChasy289(hours: number, consecutiveMonths = 1): Chasy289Result {
  const remaining = Math.max(0, CHASY_289_LIMIT - hours);
  const exceededBy = Math.max(0, hours - CHASY_289_LIMIT);
  const percent = Math.min(100, Math.round((hours / CHASY_289_LIMIT) * 100));
  const criterionMet = hours > CHASY_289_LIMIT && consecutiveMonths >= 6;

  let risk: RiskLevel = 'green';
  if (criterionMet) risk = 'red';
  else if (hours > CHASY_289_LIMIT || (hours > 50 && consecutiveMonths >= 5)) risk = 'amber';

  return { hours, consecutiveMonths, remaining, exceededBy, percent, risk, limit: CHASY_289_LIMIT, criterionMet };
}
