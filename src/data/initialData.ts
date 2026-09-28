import type { Dish, SavedMenuTemplate, UserSettings, WeekMenu } from '@/types';

// Configurado por defecto para Logroño (La Rioja)
export const DEFAULT_POSTAL_CODE = '26001';
export const DEFAULT_WAREHOUSE = 'zgz1';

export const POSTAL_CODE_WAREHOUSES: Record<string, string> = {
  // La Rioja / Logroño
  '26': 'zgz1',
  // Zaragoza
  '50': 'zgz1',
  // Madrid
  '28': 'mad1',
  // Barcelona
  '08': 'bcn1',
  // Valencia
  '46': 'vlc1',
  // Alicante
  '03': 'alc1',
  // Sevilla
  '41': 'sev1',
  // Malaga
  '29': 'mlg1',
  // Murcia
  '30': 'mur1',
  // Vizcaya / Bilbao
  '48': 'bio1',
  // Navarra / Pamplona
  '31': 'zgz1',
  // Álava / Vitoria
  '01': 'bio1',
};

export function getWarehouseFromPostalCode(postalCode: string): string {
  if (!postalCode || postalCode.length < 2) return DEFAULT_WAREHOUSE;
  const prefix = postalCode.substring(0, 2);
  return POSTAL_CODE_WAREHOUSES[prefix] || DEFAULT_WAREHOUSE;
}

export const INITIAL_SETTINGS: UserSettings = {
  postalCode: DEFAULT_POSTAL_CODE,
  warehouse: DEFAULT_WAREHOUSE,
  syncCode: '', // se genera al arrancar la app
  defaultDaysCount: 6, // Lunes a Sábado por defecto
  customStoreName: 'Mercadona Logroño',
  prefsUpdatedAt: 0,
};

export const INITIAL_DISHES: Dish[] = [];

export const INITIAL_SAVED_MENUS: SavedMenuTemplate[] = [];

/**
 * Empty week. `updatedAt` is the epoch on purpose: a freshly installed device must
 * never win against a household menu when both are merged.
 */
export function createEmptyWeekMenu(activeDaysCount: number = 6, updatedAt: string = new Date(0).toISOString()): WeekMenu {
  return {
    id: 'menu-semana-activa',
    name: 'Menú semanal activo',
    activeDaysCount,
    updatedAt,
    days: [
      { dayKey: 'lunes', dayLabel: 'Lunes', comidaDishId: null, cenaDishId: null },
      { dayKey: 'martes', dayLabel: 'Martes', comidaDishId: null, cenaDishId: null },
      { dayKey: 'miercoles', dayLabel: 'Miércoles', comidaDishId: null, cenaDishId: null },
      { dayKey: 'jueves', dayLabel: 'Jueves', comidaDishId: null, cenaDishId: null },
      { dayKey: 'viernes', dayLabel: 'Viernes', comidaDishId: null, cenaDishId: null },
      { dayKey: 'sabado', dayLabel: 'Sábado', comidaDishId: null, cenaDishId: null },
      { dayKey: 'domingo', dayLabel: 'Domingo', comidaDishId: null, cenaDishId: null },
    ],
  };
}

export const INITIAL_WEEK_MENU: WeekMenu = createEmptyWeekMenu();
