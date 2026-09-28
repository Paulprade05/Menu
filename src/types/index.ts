export interface MercadonaProduct {
  id: string;
  slug: string;
  displayName: string;
  brand: string;
  packaging: string;
  price: number; // unit_price in euros
  bulkPrice?: number | null;
  referencePrice?: number | null;
  referenceFormat?: string | null;
  thumbnail: string;
  shareUrl?: string;
  categoryName?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string; // 'ud', 'g', 'kg', 'ml', 'l', 'pack', 'bote'
  estimatedPrice: number;
  mercadonaProduct?: MercadonaProduct;
}

export type MealType = 'comida' | 'cena' | 'ambas';
export type MealSlot = 'comida' | 'cena';

export interface Dish {
  id: string;
  name: string;
  type: MealType;
  tags: string[];
  ingredients: Ingredient[];
  notes?: string;
  imageUrl?: string;
  estimatedCost: number;
  createdAt: string;
  /** ms epoch of the last change, used to merge between devices */
  updatedAt?: number;
}

export type DishInput = Omit<Dish, 'id' | 'createdAt' | 'estimatedCost' | 'updatedAt'>;

export type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface DayPlan {
  dayKey: DayKey;
  dayLabel: string;
  comidaDishId: string | null;
  comidaCustomName?: string;
  cenaDishId: string | null;
  cenaCustomName?: string;
}

export interface WeekMenu {
  id: string;
  name: string;
  activeDaysCount: number; // 6 (L-S) or 7 (L-D)
  days: DayPlan[];
  updatedAt: string;
  /**
   * ms epoch of the last change of each meal ("lunes:comida", "martes:cena"…),
   * "activeDaysCount" and "name": two people can plan different meals at the same time
   */
  fieldUpdatedAt?: Record<string, number>;
}

export interface SavedMenuTemplate {
  id: string;
  name: string;
  description?: string;
  days: DayPlan[];
  activeDaysCount: number;
  createdAt: string;
  updatedAt?: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  sourceDishNames: string[];
  isManual: boolean;
  mercadonaProduct?: MercadonaProduct;
  estimatedPrice: number;
  updatedAt?: number;
  /** true when the user changed the price by hand in the list (kept when the list is regenerated) */
  priceEdited?: boolean;
  /** Items from the menu: the quantity the menu asked for last time (user changes are kept on top) */
  menuQuantity?: number;
  /** Items from the menu the user removed ("ya lo tengo"): hidden, so updating the list doesn't bring them back */
  dismissed?: boolean;
}

export interface NewShoppingItem {
  name: string;
  quantity?: number;
  unit?: string;
  product?: MercadonaProduct;
  category?: string;
  price?: number;
}

export interface UserSettings {
  postalCode: string;
  warehouse: string;
  /** Household code, local to this device (never synced as data) */
  syncCode: string;
  defaultDaysCount: number; // 6 or 7
  customStoreName?: string;
  /** ms epoch of the last change to synced preferences */
  prefsUpdatedAt?: number;
}

/** id -> ms epoch when it was deleted */
export type Tombstones = Record<string, number>;

export interface SyncPrefs {
  postalCode: string;
  warehouse: string;
  defaultDaysCount: number;
  updatedAt: number;
}

/** Document stored in the cloud for a household code */
export interface SyncDoc {
  schema: 1;
  dishes: Dish[];
  savedMenus: SavedMenuTemplate[];
  shoppingList: ShoppingListItem[];
  weekMenu: WeekMenu;
  prefs: SyncPrefs;
  tombstones: Tombstones;
  updatedAt: number;
}

export type AppTab = 'menu' | 'dishes' | 'shopping' | 'settings';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'unconfigured';
