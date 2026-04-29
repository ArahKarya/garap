export const formatIDR = (value: number | string, withSymbol = true): string => {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return withSymbol ? 'Rp 0' : '0';
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
  return withSymbol ? `Rp ${formatted}` : formatted;
};

export const parseIDR = (input: string): number => {
  const cleaned = input.replace(/[^\d,-]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
