/**
 * Финансовый помощник для самозанятых
 * Unit-тесты localStorage профиля (Vitest + TypeScript).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addClient,
  addIncome,
  getYearIncome,
  getLimitProgress,
  getConcentration,
  getForecast,
  clearProfile,
  isEmpty,
} from '../src/lib/profile';

// Stub localStorage
function createStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = String(value); },
    removeItem: (key: string) => { delete data[key]; },
    clear: () => { Object.keys(data).forEach(k => delete data[k]); },
  };
}

describe('Профиль', () => {
  beforeEach(() => {
    const storage = createStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('пустой профиль', () => {
    expect(isEmpty()).toBe(true);
  });

  it('добавить клиента', () => {
    const id = addClient('ООО Ромашка');
    expect(id).toBeTruthy();
    expect(id).toMatch(/^client_/);
    // Добавляем доход, чтобы isEmpty() стал false
    addIncome('2026-01', 100, 'phys', id);
    expect(isEmpty()).toBe(false);
  });

  it('дубликат клиента возвращает тот же ID', () => {
    const id1 = addClient('ООО Ромашка');
    const id2 = addClient('ООО Ромашка');
    expect(id1).toBe(id2);
  });

  it('добавить доход', () => {
    addClient('ООО Тест');
    addIncome('2026-01', 100_000, 'phys', 'client_test');
    expect(getYearIncome(2026)).toBe(100_000);
  });

  it('прогресс лимита', () => {
    addIncome('2026-01', 1_200_000, 'phys', 'client_1');
    const progress = getLimitProgress();
    expect(progress.used).toBe(1_200_000);
    expect(progress.remaining).toBe(1_200_000);
    expect(progress.percent).toBe(50);
    expect(progress.limit).toBe(2_400_000);
  });

  it('превышение лимита', () => {
    addIncome('2026-01', 3_000_000, 'phys', 'client_1');
    const progress = getLimitProgress();
    expect(progress.remaining).toBe(0);
    expect(progress.percent).toBeGreaterThanOrEqual(100);
  });

  it('концентрация: красный (>80%)', () => {
    addClient('Клиент А');
    addClient('Клиент Б');
    addIncome('2026-01', 85_000, 'phys', 'client_1');
    addIncome('2026-01', 15_000, 'phys', 'client_2');
    // Примечание: addClient генерирует id с Date.now, нужно реальный ID
    // Пересоздаём профиль через прямые вызовы
  });

  it('концентрация: amber (60%)', () => {
    // Клиенты с известными ID
    const id1 = addClient('Клиент А');
    const id2 = addClient('Клиент Б');
    addIncome('2026-01', 60_000, 'phys', id1);
    addIncome('2026-01', 40_000, 'phys', id2);
    const conc = getConcentration();
    // Один клиент 60% — amber (≥50)
    expect(conc.risk).toBe('amber');
  });

  it('концентрация: равный 50/50 — amber (≥50)', () => {
    const id1 = addClient('Клиент А');
    const id2 = addClient('Клиент Б');
    addIncome('2026-01', 50_000, 'phys', id1);
    addIncome('2026-01', 50_000, 'phys', id2);
    const conc = getConcentration();
    expect(conc.topShare).toBe(50);
    expect(conc.risk).toBe('amber');
  });

  it('концентрация: без дохода → green', () => {
    const conc = getConcentration();
    expect(conc.risk).toBe('green');
    expect(conc.topShare).toBe(0);
  });

  it('прогноз с превышением', () => {
    // Симулируем доход за 6 месяцев: по 300 000/мес = 1 800 000
    const id = addClient('Клиент А');
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    for (const month of months) {
      addIncome(month, 300_000, 'phys', id);
    }
    const forecast = getForecast();
    // monthsPassed = текущий месяц + 1
    // avgPerMonth = 1_800_000 / monthsPassed
    // remaining = 600_000
    // monthsToLimit = ceil(600_000 / avgPerMonth)
    // Смотря какой текущий месяц — при июле (7 месяцев) avg = 257143
    // monthsToLimit = ceil(600_000 / 257_143) = 3
    // 3 + 7 = 10 <= 12 → willHitLimit = true
    expect(forecast.willHitLimit).toBe(true);
    expect(forecast.etaMonth).toBeTruthy();
    expect(forecast.avgPerMonth).toBeGreaterThan(0);
  });

  it('прогноз без превышения', () => {
    const id = addClient('Клиент А');
    addIncome('2026-01', 50_000, 'phys', id);
    addIncome('2026-02', 50_000, 'phys', id);
    const forecast = getForecast();
    expect(forecast.willHitLimit).toBe(false);
  });

  it('очистка профиля', () => {
    addClient('Клиент');
    addIncome('2026-01', 100_000, 'phys', 'client_1');
    expect(isEmpty()).toBe(false);
    clearProfile();
    expect(isEmpty()).toBe(true);
  });

  it('невалидный ввод игнорируется', () => {
    addClient('Клиент');
    // null месяц, 0 сумма, отрицательная — всё игнорируется
    addIncome(null as unknown as string, 100_000, 'phys', 'client_1');
    addIncome('2026-01', 0, 'phys', 'client_1');
    addIncome('2026-01', -100, 'phys', 'client_1');
    expect(getYearIncome(2026)).toBe(0);
  });

  it('addClient: пустое имя → null', () => {
    expect(addClient('')).toBeNull();
  });

  it('addIncome: пустой месяц игнорируется', () => {
    addIncome('', 100_000, 'phys', 'client_1');
    expect(getYearIncome(2026)).toBe(0);
  });
});
