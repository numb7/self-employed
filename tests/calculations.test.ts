/**
 * Финансовый помощник для самозанятых
 * Unit-тесты чистых функций расчёта (Vitest + TypeScript).
 *
 * Запуск: npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSetAside,
  calculateIncomeRemaining,
  calculateIncomeWhenLimit,
  compareIpVsNpd,
  calculatePensionCost,
  calculatePensionMonths,
  calculateContribution,
  calculateConcentration,
  calculateDeduction,
  calculateTargetHourlyRate,
  calculateActualHourlyRate,
  calculateRiskTrudovyh,
  calculateChasy289,
} from '../src/lib/calculations';
import { RULES_2026 } from '../src/lib/rules-2026';
import { formatMoney, formatPercent } from '../src/lib/format';
import type { ClientType } from '../src/lib/rules-2026';

// ============================================
// Отложить на налог
// ============================================

describe('Отложить на налог', () => {
  it('без вычета — стандартная ставка', () => {
    const result = calculateSetAside(100_000, 'business', 0);
    expect(result.setAside).toBe(6000);
    expect(result.toKeep).toBe(94_000);
    expect(result.deductionUsed).toBe(0);
  });

  it('полный вычет', () => {
    // Доход 100 000 от юрлица, ставка 6%, льготная 4%
    // Потенциальная экономия = 100 000 × (6% - 4%) = 2 000
    // Остаток вычета = 10 000 → вычет покрывает полностью
    const result = calculateSetAside(100_000, 'business', 10_000);
    expect(result.taxWithoutDeduction).toBe(6000);
    expect(result.deductionUsed).toBe(2000);
    expect(result.setAside).toBe(4000);
    expect(result.deductionRemainingAfter).toBe(8000);
  });

  it('частичный вычет (ТЗ)', () => {
    // Потенциальная экономия = 2 000
    // Остаток вычета = 500 → вычет применяется частично
    const result = calculateSetAside(100_000, 'business', 500);
    expect(result.taxWithoutDeduction).toBe(6000);
    expect(result.deductionUsed).toBe(500);
    expect(result.setAside).toBe(5500);
    expect(result.deductionRemainingAfter).toBe(0);
  });

  it('физлица', () => {
    // Ставка 4%, льготная 3%
    // Потенциальная экономия = 100 000 × 1% = 1 000
    const result = calculateSetAside(100_000, 'individual', 500);
    expect(result.deductionUsed).toBe(500);
    expect(result.setAside).toBe(3500);
  });

  it('нулевой платёж', () => {
    const result = calculateSetAside(0, 'business', 10_000);
    expect(result.setAside).toBe(0);
  });

  // Edge cases
  it('отрицательный платёж → отрицательный результат (чистая функция)', () => {
    // Новая функция — чистая, не нормализует отрицательные входы.
    // UI-слой отвечает за валидацию (NumericFormat не позволяет минус).
    const result = calculateSetAside(-1000, 'business', 0);
    expect(result.setAside).toBe(-60);
    expect(result.toKeep).toBe(-940);
  });

  it('отрицательный вычет → 0', () => {
    const result = calculateSetAside(100_000, 'business', -500);
    // Отрицательный deductionRemaining не даёт положительный deductionUsed
    expect(result.deductionUsed).toBe(0);
    expect(result.setAside).toBe(6000);
  });

  it('избыточный вычет (>10 000)', () => {
    const result = calculateSetAside(100_000, 'business', 50_000);
    // deductionRemainingAfter = 50_000 - 2_000 = 48_000
    // Функция не ограничивает входной deductionRemaining, только мин
    expect(result.deductionRemainingAfter).toBe(48_000);
  });

  it('дробный платёж не падает', () => {
    const result = calculateSetAside(1000.5, 'business', 0);
    expect(typeof result.setAside).toBe('number');
  });

  it('огромный платёж работает', () => {
    const result = calculateSetAside(999_999_999, 'business', 0);
    expect(result.setAside).toBeGreaterThan(0);
  });

  it('null платёж', () => {
    // null coerces to 0 in JS multiplication
    const result = calculateSetAside(null as unknown as number, 'business', 5000);
    expect(result.setAside).toBe(0);
  });

  it('undefined платёж → NaN (чистая функция, UI фильтрует)', () => {
    const result = calculateSetAside(undefined as unknown as number, 'business', 5000);
    // Чистая функция не нормализует undefined — NaN. UI-слой проверяет payment > 0.
    expect(Number.isNaN(result.setAside)).toBe(true);
  });
});

// ============================================
// Лимит дохода
// ============================================

describe('Лимит дохода', () => {
  it('лимит НПД = 2 400 000', () => {
    expect(RULES_2026.npd.incomeLimit).toBe(2_400_000);
  });

  it('далеко от лимита', () => {
    const result = calculateIncomeRemaining(500_000, 1);
    expect(result.remaining).toBe(1_900_000);
    expect(result.earnedPercent).toBe(21);
    expect(result.risk).toBe('green');
    expect(result.safePace).toBeGreaterThanOrEqual(158_333);
  });

  it('около лимита — amber', () => {
    const result = calculateIncomeRemaining(2_200_000, 10);
    expect(result.remaining).toBe(200_000);
    expect(result.earnedPercent).toBe(92);
    expect(result.risk).toBe('amber');
  });

  it('превышение лимита — red', () => {
    const result = calculateIncomeRemaining(3_000_000, 12);
    expect(result.remaining).toBeLessThan(0);
    expect(result.risk).toBe('red');
  });

  it('whenLimit: в пределах, не достигнет', () => {
    const result = calculateIncomeWhenLimit(500_000, 6, 50_000);
    expect(result.willReach).toBe(false);
    expect(result.limitMonthName).toBeNull();
  });

  it('whenLimit: превысен', () => {
    const result = calculateIncomeWhenLimit(3_000_000, 12, 50_000);
    expect(result.willReach).toBe(true);
    expect(result.limitMonthName).toBe('превышен');
  });

  it('whenLimit: нулевой avgMonthly', () => {
    const result = calculateIncomeWhenLimit(500_000, 6, 0);
    expect(result.willReach).toBe(false);
    expect(result.monthsToLimit).toBe(Infinity);
  });

  it('whenLimit: неполный остаток переносит достижение на следующий месяц', () => {
    const result = calculateIncomeWhenLimit(2_350_000, 6, 100_000);
    expect(result.monthsToLimit).toBe(1);
    expect(result.limitMonth).toBe(7);
    expect(result.limitMonthName).toBe('Июль');
  });

  it('remaining: текущий месяц не считается повторно', () => {
    const result = calculateIncomeRemaining(1_200_000, 12);
    expect(result.monthsLeft).toBe(0);
    expect(result.safePace).toBe(0);
  });
});

// ============================================
// Сравнение НПД и ИП
// ============================================

describe('НПД vs ИП', () => {
  it('базовый (физлица)', () => {
    const result = compareIpVsNpd(1_000_000, 'individual');
    // НПД: 1 000 000 × 4% = 40 000
    expect(result.npd).toBe(40_000);
    // ИП: взносы = 57 390 + 1% × (1 000 000 - 300 000) = 57 390 + 7 000 = 64 390
    expect(result.ipContributions).toBe(64_390);
    // max(6% × 1 000 000, 64 390) = max(60 000, 64 390) = 64 390
    expect(result.ip).toBe(64_390);
    expect(result.overLimit).toBe(false);
  });

  it('юрлица', () => {
    const result = compareIpVsNpd(1_000_000, 'business');
    // НПД: 1 000 000 × 6% = 60 000
    expect(result.npd).toBe(60_000);
  });

  it('превышение лимита НПД', () => {
    const result = compareIpVsNpd(3_000_000, 'individual');
    expect(result.overLimit).toBe(true);
  });
});

// ============================================
// Ставка в час
// ============================================

describe('Ставка в час', () => {
  it('целевая ставка', () => {
    // Желаемый чистый доход 100 000, 160 часов, физлица (4%)
    // grossNeeded = 100 000 / 0.96 ≈ 104 166.67
    // hourlyRate = 104 167 / 160 ≈ 651
    const result = calculateTargetHourlyRate(100_000, 160, 'individual');
    expect(result.hourlyRate).toBeGreaterThan(0);
    expect(result.grossMonthly).toBeGreaterThan(100_000);
  });

  it('фактическая ставка', () => {
    // Оплата 50 000, 40 часов, юрлица (6%)
    // net = 50 000 × 0.94 = 47 000
    // netHourly = 47 000 / 40 = 1 175
    const result = calculateActualHourlyRate(50_000, 40, 'business');
    expect(result.netTotal).toBe(47_000);
    expect(result.netHourlyRate).toBe(1175);
  });

  it('нулевые часы → нулевая ставка', () => {
    const result = calculateActualHourlyRate(50_000, 0, 'individual');
    expect(result.netHourlyRate).toBe(0);
  });
});

// ============================================
// Вычет 10 000 ₽
// ============================================

describe('Вычет 10 000 ₽', () => {
  it('полный — доход от физлиц', () => {
    // Доход от физлиц 100 000, от юрлиц 0
    // used = 100 000 × (0.04 - 0.03) = 1 000
    const result = calculateDeduction(100_000, 0);
    expect(result.used).toBe(1000);
  });

  it('исчерпан при большом доходе', () => {
    // Доход от физлиц 1 000 000
    // used = min(1 000 000 × 0.01, 10 000) = 10 000
    const result = calculateDeduction(1_000_000, 0);
    expect(result.used).toBe(10_000);
    expect(result.remaining).toBe(0);
    expect(result.exhausted).toBe(true);
  });

  it('нулевой доход → нулевой вычет', () => {
    const result = calculateDeduction(0, 0);
    expect(result.used).toBe(0);
  });
});

// ============================================
// Пенсионный стаж
// ============================================

describe('Пенсионный стаж', () => {
  it('стоимость года = 71 525,52', () => {
    expect(RULES_2026.pension.fullYearCost).toBe(71_525.52);
  });

  it('стоимость 6 месяцев', () => {
    const result = calculatePensionCost(6);
    expect(result.cost).toBe(Math.round(71_525.52 * 0.5));
    expect(result.pctOfFullYear).toBe(50);
  });

  it('месяцы за сумму (~6 мес)', () => {
    const result = calculatePensionMonths(35_762.76);
    expect(Math.abs(result.months - 6)).toBeLessThan(0.1);
  });
});

// ============================================
// Больничный — взносы
// ============================================

describe('Больничный — взносы', () => {
  it('взнос 35 000 × 3,84% = 1 344', () => {
    const result = calculateContribution(35_000);
    expect(result.monthlyContribution).toBe(1344);
  });

  it('взнос 50 000 × 3,84% = 1 920', () => {
    const result = calculateContribution(50_000);
    expect(result.monthlyContribution).toBe(1920);
  });

  it('год взносов (12 мес без скидок)', () => {
    // 1 344 × 12 = 16 128
    const result = calculateContribution(35_000);
    expect(result.yearCost).toBe(16_128);
  });

  it('выплата через 6 мес = 70%', () => {
    const result = calculateContribution(35_000);
    expect(result.payoutAfter6).toBe(Math.round(35_000 * 0.7));
  });

  it('выплата через 12 мес = 100%', () => {
    const result = calculateContribution(35_000);
    expect(result.payoutAfter12).toBe(35_000);
  });
});

// ============================================
// Концентрация дохода
// ============================================

describe('Концентрация дохода', () => {
  it('50/50 — нет риска (amber по порогу ≥50%)', () => {
    const sources = [
      { name: 'A', monthlyIncome: 50_000, monthsWorking: 12 },
      { name: 'B', monthlyIncome: 50_000, monthsWorking: 12 },
    ];
    const result = calculateConcentration(sources);
    expect(result.sources[0].share).toBe(50);
    expect(result.sources[0].risky).toBe(false);
    expect(result.level).toBe('amber');
  });

  it('75% от одного клиента — risky', () => {
    const sources = [
      { name: 'A', monthlyIncome: 75_000, monthsWorking: 8 },
      { name: 'B', monthlyIncome: 25_000, monthsWorking: 8 },
    ];
    const result = calculateConcentration(sources);
    expect(result.sources[0].share).toBe(75);
    expect(result.sources[0].risky).toBe(true);
    expect(result.level).toBe('red');
  });

  it('80% но 3 месяца — не risky', () => {
    const sources = [
      { name: 'A', monthlyIncome: 80_000, monthsWorking: 3 },
      { name: 'B', monthlyIncome: 20_000, monthsWorking: 3 },
    ];
    const result = calculateConcentration(sources);
    expect(result.sources[0].risky).toBe(false);
    expect(result.level).toBe('amber');
  });

  it('отрицательный доход нормализуется', () => {
    const sources = [
      { name: 'A', monthlyIncome: -10_000, monthsWorking: 12 },
      { name: 'B', monthlyIncome: 50_000, monthsWorking: 12 },
    ];
    const result = calculateConcentration(sources);
    // -10_000 → Math.max(0, -10_000) = 0, только B
    expect(result.sources[0].monthlyIncome).toBe(0);
    expect(result.total).toBe(50_000);
  });

  it('пустой массив → green', () => {
    const result = calculateConcentration([]);
    expect(result.total).toBe(0);
    expect(result.level).toBe('green');
  });
});

// ============================================
// Риск переквалификации
// ============================================

describe('Риск переквалификации', () => {
  it('0 признаков, 0% доля → green', () => {
    const result = calculateRiskTrudovyh(0, 0);
    expect(result.risk).toBe('green');
  });

  it('1 признак → amber', () => {
    const result = calculateRiskTrudovyh(1, 0);
    expect(result.risk).toBe('amber');
  });

  it('3 признака → red', () => {
    const result = calculateRiskTrudovyh(3, 0);
    expect(result.risk).toBe('red');
  });

  it('85% доля → red', () => {
    const result = calculateRiskTrudovyh(0, 85);
    expect(result.risk).toBe('red');
  });

  it('60% доля → amber', () => {
    const result = calculateRiskTrudovyh(0, 60);
    expect(result.risk).toBe('amber');
  });

  it('50% доля → amber (≥50)', () => {
    const result = calculateRiskTrudovyh(0, 50);
    expect(result.risk).toBe('amber');
  });

  it('49% доля → green (<50)', () => {
    const result = calculateRiskTrudovyh(0, 49);
    expect(result.risk).toBe('green');
  });
});

// ============================================
// Часы 289-ФЗ
// ============================================

describe('Часы 289-ФЗ', () => {
  it('лимит 60 часов', () => {
    const result = calculateChasy289(0);
    expect(result.limit).toBe(60);
  });

  it('в пределах лимита — green', () => {
    const result = calculateChasy289(40);
    expect(result.remaining).toBe(20);
    expect(result.percent).toBe(67);
    expect(result.risk).toBe('green');
  });

  it('на грани лимита — red', () => {
    const result = calculateChasy289(60);
    expect(result.remaining).toBe(0);
    expect(result.risk).toBe('red');
  });

  it('превышение лимита — red', () => {
    const result = calculateChasy289(80);
    expect(result.remaining).toBe(0); // Math.max(0, 60-80)
    expect(result.risk).toBe('red');
    expect(result.percent).toBe(100);
  });

  it('нулевые часы', () => {
    const result = calculateChasy289(0);
    expect(result.remaining).toBe(60);
    expect(result.percent).toBe(0);
    expect(result.risk).toBe('green');
  });
});

// ============================================
// Форматирование
// ============================================

describe('Форматирование', () => {
  it('formatMoney: крупная сумма', () => {
    const formatted = formatMoney(1_500_000).replace(/\s/g, '');
    expect(formatted).toBe('1500000');
  });

  it('formatMoney: ноль', () => {
    expect(formatMoney(0)).toBe('0');
  });

  it('formatPercent: с дробной', () => {
    expect(formatPercent(75.5, 1)).toBe('75,5 %');
  });

  it('formatPercent: целый процент', () => {
    expect(formatPercent(100)).toBe('100 %');
  });

  it('formatPercent: 4% без дробей', () => {
    expect(formatPercent(4)).toBe('4 %');
  });
});

// ============================================
// Правила 2026
// ============================================

describe('Правила 2026', () => {
  it('лимит НПД = 2 400 000', () => {
    expect(RULES_2026.npd.incomeLimit).toBe(2_400_000);
  });

  it('ставка физлица = 4%', () => {
    expect(RULES_2026.npd.rateIndividuals).toBe(0.04);
  });

  it('ставка юрлиц = 6%', () => {
    expect(RULES_2026.npd.rateCompanies).toBe(0.06);
  });

  it('УСН ставка = 6%', () => {
    expect(RULES_2026.ipUsn.rateIncome).toBe(0.06);
  });

  it('фиксированные взносы ИП = 57 390', () => {
    expect(RULES_2026.ipUsn.fixedContribution).toBe(57_390);
  });

  it('дополнительный взнос 1%', () => {
    expect(RULES_2026.ipUsn.additionalRate).toBe(0.01);
  });

  it('порог доп. взноса = 300 000', () => {
    expect(RULES_2026.ipUsn.additionalThreshold).toBe(300_000);
  });

  it('стоимость года ОПС = 71 525,52', () => {
    expect(RULES_2026.pension.fullYearCost).toBe(71_525.52);
  });

  it('МРОТ 2026 = 27 093 ₽', () => {
    expect(RULES_2026.pension.mrot).toBe(27_093);
  });

  it('формула: 22% × 12 × МРОТ сходится', () => {
    const expected = Math.round(0.22 * 12 * 27_093 * 100) / 100;
    expect(RULES_2026.pension.fullYearCost).toBe(expected);
  });

  it('тариф СФР = 3,84%', () => {
    expect(RULES_2026.socialInsurance.tariff).toBe(0.0384);
  });

  it('страховые суммы', () => {
    expect(RULES_2026.socialInsurance.insuranceAmounts).toEqual([35_000, 50_000]);
  });
});
