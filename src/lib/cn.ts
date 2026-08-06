import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединение классов: clsx для условных классов + tailwind-merge для разрешения конфликтов.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
