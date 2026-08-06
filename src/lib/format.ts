/**
 * Утилиты форматирования.
 */

/**
 * Форматирование денег в русской локали (разряды через пробел: 1 500 000).
 * Округление — все расчёты дают целые копейки.
 */
export function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString('ru-RU');
}

/**
 * Форматирование процентов: 4 → "4 %", 4.5 → "4,5 %"
 */
export function formatPercent(value: number, decimals = 0): string {
  return value.toFixed(decimals).replace('.', ',') + ' %';
}

/**
 * Месяцы на русском.
 */
export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

export const MONTHS_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
] as const;
