/**
 * Утилита переключения тёмной темы.
 * Добавляет/убирает class="dark" на <html>, сохраняет в localStorage.
 */

const STORAGE_KEY = 'npd-theme';

export function initTheme(): void {
  const saved = getStoredTheme();
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme(): void {
  const isDark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    // приватный режим
  }
}

export function getStoredTheme(): 'dark' | 'light' | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null;
  } catch {
    return null;
  }
}
