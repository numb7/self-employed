/**
 * Финансовый помощник для самозанятых
 * localStorage-профиль (§7 ТЗ) — строго optional.
 *
 * Data model (ключ "npd_profile"):
 * {
 *   "version": 1,
 *   "income": [ { "month": "2026-01", "amount": 210000, "type": "phys", "clientId": "client_1" } ],
 *   "clients": [ { "id": "client_1", "name": "ООО Ромашка" } ],
 *   "updatedAt": "2026-07-18T13:01:00Z"
 * }
 */

import { RULES_2026 } from './rules-2026';
import type { RiskLevel } from './rules-2026';

const KEY = 'npd_profile';
const LIMIT = RULES_2026.npd.incomeLimit;

// ============================================
// Типы
// ============================================

export interface ProfileClient {
  id: string;
  name: string;
}

export interface ProfileIncome {
  month: string;
  amount: number;
  type: 'phys' | 'business';
  clientId: string | null;
}

export interface ProfileData {
  version: 1;
  income: ProfileIncome[];
  clients: ProfileClient[];
  updatedAt: string | null;
}

export interface LimitProgress {
  used: number;
  remaining: number;
  percent: number;
  limit: number;
}

export interface Concentration {
  topClientName: string | null;
  topShare: number;
  risk: RiskLevel;
}

export interface Forecast {
  willHitLimit: boolean;
  etaMonth: string | null;
  avgPerMonth?: number;
}

// ============================================
// Чтение / запись
// ============================================

function read(): ProfileData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, income: [], clients: [], updatedAt: null };
    const data: ProfileData = JSON.parse(raw);
    if (!data.income) data.income = [];
    if (!data.clients) data.clients = [];
    return data;
  } catch {
    return { version: 1, income: [], clients: [], updatedAt: null };
  }
}

function write(data: ProfileData): void {
  data.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // приватный режим — не блокируем
  }
}

// ============================================
// API
// ============================================

export function addClient(name: string): string | null {
  if (!name) return null;
  const data = read();
  const existing = data.clients.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  data.clients.push({ id, name });
  write(data);
  return id;
}

export function addIncome(
  month: string,
  amount: number,
  type: 'phys' | 'business' = 'phys',
  clientId: string | null = null,
): void {
  if (!month || !amount || amount <= 0) return;
  const data = read();
  const idx = data.income.findIndex(i => i.month === month && i.clientId === clientId);
  const entry: ProfileIncome = { month, amount: Math.round(amount), type, clientId };
  if (idx >= 0) data.income[idx] = entry;
  else data.income.push(entry);
  write(data);
}

export function getYearIncome(year?: number): number {
  const data = read();
  const y = year ?? new Date().getFullYear();
  return data.income
    .filter(i => i.month && i.month.startsWith(String(y)))
    .reduce((sum, i) => sum + (i.amount || 0), 0);
}

export function getLimitProgress(): LimitProgress {
  const used = getYearIncome();
  const remaining = Math.max(0, LIMIT - used);
  const percent = Math.round((used / LIMIT) * 100);
  return { used, remaining, percent, limit: LIMIT };
}

export function getConcentration(): Concentration {
  const data = read();
  const year = new Date().getFullYear();
  const byClient: Record<string, number> = {};
  let total = 0;

  data.income.forEach(i => {
    if (!i.month || !i.month.startsWith(String(year))) return;
    if (!i.clientId) return;
    byClient[i.clientId] = (byClient[i.clientId] || 0) + (i.amount || 0);
    total += i.amount || 0;
  });

  if (total === 0) return { topClientName: null, topShare: 0, risk: 'green' };

  const clientIds = Object.keys(byClient);
  if (clientIds.length === 0) return { topClientName: null, topShare: 0, risk: 'green' };

  const topId = clientIds.reduce((a, b) => (byClient[a] > byClient[b] ? a : b), clientIds[0]);
  const topShare = Math.round((byClient[topId] / total) * 100);
  const client = data.clients.find(c => c.id === topId);
  const risk: RiskLevel = topShare > 80 ? 'red' : topShare >= 50 ? 'amber' : 'green';

  return { topClientName: client ? client.name : 'Неизвестно', topShare, risk };
}

export function getForecast(): Forecast {
  const data = read();
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const yearIncome = data.income
    .filter(i => i.month && i.month.startsWith(String(year)))
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const monthsPassed = monthIdx + 1;

  if (monthsPassed === 0 || yearIncome === 0) {
    return { willHitLimit: false, etaMonth: null };
  }

  const avgPerMonth = yearIncome / monthsPassed;
  const remaining = LIMIT - yearIncome;

  if (remaining <= 0) return { willHitLimit: true, etaMonth: 'превышен' };

  const monthsToLimit = Math.ceil(remaining / avgPerMonth);
  if (monthsToLimit + monthsPassed > 12) {
    return { willHitLimit: false, etaMonth: null };
  }

  const etaDate = new Date(year, monthIdx + monthsToLimit, 1);
  const etaMonth = etaDate.toLocaleString('ru-RU', { month: 'long' });
  return { willHitLimit: true, etaMonth, avgPerMonth: Math.round(avgPerMonth) };
}

export function clearProfile(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function exportProfile(): void {
  const data = read();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'npd-profile.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function isEmpty(): boolean {
  const data = read();
  return data.income.length === 0;
}
