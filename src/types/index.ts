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
}

export type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface DayPlan {
  dayKey: DayKey;
  dayLabel: string;
  comidaDishId: string | null; // dish id or 'out' or 'leftovers' or null
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
}

export interface SavedMenuTemplate {
  id: string;
  name: string;
  description?: string;
  days: DayPlan[];
  activeDaysCount: number;
  createdAt: string;
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
}

export interface UserSettings {
  postalCode: string;
  warehouse: string;
  syncCode: string;
  defaultDaysCount: number; // 6 or 7
  customStoreName?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface SyncPayload {
  syncCode: string;
  dishes: Dish[];
  weekMenu: WeekMenu;
  savedMenus: SavedMenuTemplate[];
  shoppingList: ShoppingListItem[];
  settings: UserSettings;
  timestamp: number;
}
