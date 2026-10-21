import { RULES_2026 } from './rules-2026';

/** A monthly extrapolation is a warning, never a separate monthly legal limit. */
export function hourlyNpdScope(gross: number, monthly: boolean) {
  if (gross > RULES_2026.npd.incomeLimit) return 'outside';
  if (monthly && gross * 12 > RULES_2026.npd.incomeLimit) return 'annual-warning';
  return 'within';
}
