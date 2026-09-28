const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** 1.5 -> "1,50 €" */
export function formatEuro(value: number | null | undefined): string {
  return euroFormatter.format(Number.isFinite(value) ? (value as number) : 0);
}

/** 1.5 -> "1,50" (no currency sign, used inside price inputs) */
export function formatDecimal(value: number | null | undefined): string {
  return decimalFormatter.format(Number.isFinite(value) ? (value as number) : 0);
}

/**
 * Parses what a Spanish user types in a price field: "1,50", "1.50", "1,5 €", " 2 ".
 * Returns null when there is no valid number.
 */
export function parseDecimal(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, '');
  if (!cleaned) return null;
  // "1.234,56" -> "1234.56"; "1,5" -> "1.5"; "1.5" -> "1.5"
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === '.') return null;
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

/** pluralize(3, 'plato', 'platos') -> "3 platos" */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "hace 2 min", "a las 18:04", "ayer a las 9:30" */
export function formatRelativeTime(timestamp: number | null | undefined, now: number = Date.now()): string {
  if (!timestamp) return 'nunca';
  const diff = Math.max(0, now - timestamp);
  if (diff < 45_000) return 'ahora mismo';
  if (diff < 3_600_000) return `hace ${Math.round(diff / 60_000)} min`;
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) return `hoy a las ${time}`;
  const yesterday = new Date(now - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return `ayer a las ${time}`;
  return `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las ${time}`;
}
