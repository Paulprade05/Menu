import type { DayKey, Ingredient, MercadonaProduct, ShoppingListItem } from '@/types';
import { roundMoney } from './format';

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** Lowercase + strip accents, so "salmon" finds "Salmón" */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const DAY_KEYS_BY_JS_DAY: DayKey[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export function todayDayKey(date: Date = new Date()): DayKey {
  return DAY_KEYS_BY_JS_DAY[date.getDay()];
}

interface Priced {
  estimatedPrice?: number;
  quantity?: number;
  mercadonaProduct?: MercadonaProduct;
}

/** Price per unit: the user's price if set, otherwise Mercadona's price */
export function unitPrice(item: Priced): number {
  if (typeof item.estimatedPrice === 'number' && Number.isFinite(item.estimatedPrice)) {
    return item.estimatedPrice;
  }
  return item.mercadonaProduct?.price ?? 0;
}

export function lineTotal(item: Priced): number {
  return roundMoney(unitPrice(item) * (item.quantity || 1));
}

export function ingredientsCost(ingredients: Ingredient[]): number {
  return roundMoney(ingredients.reduce((acc, ing) => acc + unitPrice(ing) * (ing.quantity || 1), 0));
}

export function shoppingItemKey(item: Pick<ShoppingListItem, 'name' | 'mercadonaProduct'>): string {
  return item.mercadonaProduct?.id ? `merc-${item.mercadonaProduct.id}` : `name-${normalizeText(item.name)}`;
}

/** Province capitals: postal codes whose third digit is 0 belong to the capital city */
const PROVINCE_CAPITALS: Record<string, [capital: string, province: string]> = {
  '01': ['Vitoria-Gasteiz', 'Álava'],
  '02': ['Albacete', 'Albacete'],
  '03': ['Alicante', 'Alicante'],
  '04': ['Almería', 'Almería'],
  '05': ['Ávila', 'Ávila'],
  '06': ['Badajoz', 'Badajoz'],
  '07': ['Palma', 'Baleares'],
  '08': ['Barcelona', 'Barcelona'],
  '09': ['Burgos', 'Burgos'],
  '10': ['Cáceres', 'Cáceres'],
  '11': ['Cádiz', 'Cádiz'],
  '12': ['Castellón', 'Castellón'],
  '13': ['Ciudad Real', 'Ciudad Real'],
  '14': ['Córdoba', 'Córdoba'],
  '15': ['A Coruña', 'A Coruña'],
  '16': ['Cuenca', 'Cuenca'],
  '17': ['Girona', 'Girona'],
  '18': ['Granada', 'Granada'],
  '19': ['Guadalajara', 'Guadalajara'],
  '20': ['San Sebastián', 'Gipuzkoa'],
  '21': ['Huelva', 'Huelva'],
  '22': ['Huesca', 'Huesca'],
  '23': ['Jaén', 'Jaén'],
  '24': ['León', 'León'],
  '25': ['Lleida', 'Lleida'],
  '26': ['Logroño', 'La Rioja'],
  '27': ['Lugo', 'Lugo'],
  '28': ['Madrid', 'Madrid'],
  '29': ['Málaga', 'Málaga'],
  '30': ['Murcia', 'Murcia'],
  '31': ['Pamplona', 'Navarra'],
  '32': ['Ourense', 'Ourense'],
  '33': ['Oviedo', 'Asturias'],
  '34': ['Palencia', 'Palencia'],
  '35': ['Las Palmas', 'Las Palmas'],
  '36': ['Pontevedra', 'Pontevedra'],
  '37': ['Salamanca', 'Salamanca'],
  '38': ['Santa Cruz de Tenerife', 'Santa Cruz de Tenerife'],
  '39': ['Santander', 'Cantabria'],
  '40': ['Segovia', 'Segovia'],
  '41': ['Sevilla', 'Sevilla'],
  '42': ['Soria', 'Soria'],
  '43': ['Tarragona', 'Tarragona'],
  '44': ['Teruel', 'Teruel'],
  '45': ['Toledo', 'Toledo'],
  '46': ['Valencia', 'Valencia'],
  '47': ['Valladolid', 'Valladolid'],
  '48': ['Bilbao', 'Bizkaia'],
  '49': ['Zamora', 'Zamora'],
  '50': ['Zaragoza', 'Zaragoza'],
  '51': ['Ceuta', 'Ceuta'],
  '52': ['Melilla', 'Melilla'],
};

/** "26001" -> "Logroño", "26200" -> "La Rioja", "" -> "" */
export function placeFromPostalCode(postalCode: string): string {
  const cp = (postalCode || '').trim();
  if (!/^\d{5}$/.test(cp)) return '';
  const entry = PROVINCE_CAPITALS[cp.slice(0, 2)];
  if (!entry) return '';
  return cp[2] === '0' ? entry[0] : entry[1];
}

/** "Mercadona Logroño" or "Mercadona CP 12345" */
export function storeLabel(postalCode: string): string {
  const place = placeFromPostalCode(postalCode);
  if (place) return `Mercadona ${place}`;
  return postalCode ? `Mercadona CP ${postalCode}` : 'Mercadona';
}

export function isValidPostalCode(postalCode: string): boolean {
  return /^\d{5}$/.test(postalCode.trim()) && Boolean(PROVINCE_CAPITALS[postalCode.trim().slice(0, 2)]);
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** Native share sheet when available (iPhone), clipboard otherwise. */
export async function shareOrCopy(data: { title?: string; text: string; url?: string }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // fall through to clipboard
    }
  }
  try {
    const payload = data.url ? `${data.text}\n${data.url}` : data.text;
    await navigator.clipboard.writeText(payload);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
