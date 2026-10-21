/** Parse the complete draft; never turn a sign, fraction or partial token into another number. */
export function parseNumberDraft(raw: string, integer = false, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const clean = raw.replace(/\s/g, '');
  if (!clean) return { kind: 'empty' as const, value: null };
  const format = integer ? /^\d+$/ : /^\d+(?:[.,]\d+)?$/;
  const value = Number(clean.replace(',', '.'));
  if (!format.test(clean) || !Number.isFinite(value) || value < min || value > max ||
    (integer && !Number.isSafeInteger(value))) return { kind: 'invalid' as const, value: null };
  return { kind: 'valid' as const, value };
}
