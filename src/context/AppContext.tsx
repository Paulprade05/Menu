'use client';

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  AppTab,
  DayKey,
  DayPlan,
  Dish,
  DishInput,
  MealSlot,
  NewShoppingItem,
  SavedMenuTemplate,
  ShoppingListItem,
  SyncStatus,
  Tombstones,
  UserSettings,
  WeekMenu,
} from '@/types';
import { INITIAL_SETTINGS, createEmptyWeekMenu, getWarehouseFromPostalCode } from '@/data/initialData';
import { ingredientsCost, lineTotal, newId, shoppingItemKey, storeLabel as buildStoreLabel, unitPrice } from '@/lib/utils';
import { pluralize, roundMoney } from '@/lib/format';
import {
  buildSyncDoc,
  generateSyncCode,
  isValidSyncCode,
  isWeakSyncCode,
  normalizeSyncCode,
  normalizeSyncDoc,
  revertWeekMenuFields,
  sanitizeWeekMenu,
  stampWeekMenu,
  type SyncableData,
} from '@/lib/sync';
import { useUI } from '@/components/ui/UIProvider';
import { useCloudSync, type JoinResult } from './useCloudSync';

const STORAGE_KEYS = {
  DISHES: 'mercadona_dishes_v2',
  WEEK_MENU: 'mercadona_week_menu_v2',
  SAVED_MENUS: 'mercadona_saved_menus_v2',
  SHOPPING_LIST: 'mercadona_shopping_list_v2',
  SETTINGS: 'mercadona_settings_v2',
  TOMBSTONES: 'mercadona_tombstones_v1',
  SYNC: 'mercadona_sync_state_v1',
  TAB: 'mercadona_active_tab_v1',
};

const TABS: AppTab[] = ['menu', 'dishes', 'shopping', 'settings'];

export type AppData = SyncableData;

export interface SyncState {
  enabled: boolean;
  lastSyncAt: number | null;
}

export interface GenerateListResult {
  added: number;
  updated: number;
  removed: number;
  /** items in the list afterwards */
  total: number;
  /** true when the planned dishes have no ingredients: nothing was changed */
  empty: boolean;
}

interface AppContextType {
  // Navigation
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Dishes bank
  dishes: Dish[];
  addDish: (dish: DishInput) => Dish;
  updateDish: (id: string, updates: Partial<DishInput>) => Dish | undefined;
  deleteDish: (id: string) => void;
  getDishById: (id: string | null | undefined) => Dish | undefined;

  // Weekly menu
  weekMenu: WeekMenu;
  activeDays: DayPlan[];
  setSlotDish: (dayKey: DayKey, slot: MealSlot, dishId: string | null, customName?: string) => void;
  clearSlot: (dayKey: DayKey, slot: MealSlot) => void;
  setActiveDaysCount: (count: number) => void;
  /** Fills the empty meals (or every meal with mode 'all') with random dishes. Returns how many were filled. */
  randomizeMenu: (mode?: 'empty' | 'all') => number;
  clearWeekMenu: () => void;

  // Saved menus
  savedMenus: SavedMenuTemplate[];
  saveCurrentWeekAsTemplate: (name: string) => void;
  loadSavedMenuTemplate: (templateId: string) => void;
  deleteSavedMenuTemplate: (templateId: string) => void;

  // Shopping list
  shoppingList: ShoppingListItem[];
  /** Updates the list from the menu, keeping hand-added items and what was already ticked */
  generateShoppingListFromMenu: () => GenerateListResult;
  /** Adds an item (or +1 if the same product was already added by hand). Returns true when it merged. */
  addShoppingItem: (item: NewShoppingItem) => boolean;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  setShoppingItemQuantity: (id: string, quantity: number) => void;
  updateShoppingItemPrice: (id: string, price: number) => void;
  clearCheckedShoppingItems: () => void;
  clearAllShoppingItems: () => void;
  uncheckAllShoppingItems: () => void;

  // Settings
  settings: UserSettings;
  updateSettings: (updates: Partial<Omit<UserSettings, 'syncCode' | 'prefsUpdatedAt'>>) => void;
  storeLabel: string;
  resetAllData: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;

  // Household sync
  sync: {
    enabled: boolean;
    status: SyncStatus;
    error: string | null;
    lastSyncAt: number | null;
    codeIsWeak: boolean;
  };
  enableSync: () => Promise<boolean>;
  disableSync: () => void;
  syncNow: () => Promise<boolean>;
  joinHousehold: (code: string) => Promise<JoinResult>;
  regenerateSyncCode: () => void;

  // Totals
  menuTotalCost: number;
  plannedMealsCount: number;
  maxMealsCount: number;
  shoppingTotalCost: number;
  shoppingPendingCost: number;
  shoppingCheckedCost: number;
  checkedItemsCount: number;
  pendingItemsCount: number;
  totalItemsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Local storage
// ---------------------------------------------------------------------------

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function asArray<T extends { id: string }>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter((x) => x && typeof x === 'object' && typeof x.id === 'string') as T[]) : [];
}

interface InitialState {
  data: AppData;
  settings: UserSettings;
  syncState: SyncState;
  tab: AppTab;
}

function loadInitialState(): InitialState {
  const syncState: SyncState = { enabled: false, lastSyncAt: null, ...readJson<Partial<SyncState>>(STORAGE_KEYS.SYNC) };

  const storedSettings = readJson<Partial<UserSettings>>(STORAGE_KEYS.SETTINGS) ?? {};
  const settings: UserSettings = { ...INITIAL_SETTINGS, ...storedSettings };
  // Old codes ("CASA-1234") could be guessed. Replace them unless the user is actively syncing with one.
  if (!settings.syncCode || (!syncState.enabled && isWeakSyncCode(settings.syncCode))) {
    settings.syncCode = generateSyncCode();
  }

  const tombstones = readJson<Tombstones>(STORAGE_KEYS.TOMBSTONES);
  const storedTab = readJson<string>(STORAGE_KEYS.TAB);

  return {
    data: {
      dishes: asArray<Dish>(readJson(STORAGE_KEYS.DISHES)),
      weekMenu: sanitizeWeekMenu(readJson(STORAGE_KEYS.WEEK_MENU)),
      savedMenus: asArray<SavedMenuTemplate>(readJson(STORAGE_KEYS.SAVED_MENUS)),
      shoppingList: asArray<ShoppingListItem>(readJson(STORAGE_KEYS.SHOPPING_LIST)),
      tombstones: tombstones && typeof tombstones === 'object' ? tombstones : {},
    },
    settings,
    syncState,
    tab: TABS.includes(storedTab as AppTab) ? (storedTab as AppTab) : 'menu',
  };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function isoNow(now: number): string {
  return new Date(now).toISOString();
}

function withTombstones(tombstones: Tombstones, ids: string[], now: number): Tombstones {
  if (ids.length === 0) return tombstones;
  const next = { ...tombstones };
  for (const id of ids) next[id] = now;
  return next;
}

function slotHasMeal(day: DayPlan, slot: MealSlot): boolean {
  return slot === 'comida' ? Boolean(day.comidaDishId || day.comidaCustomName) : Boolean(day.cenaDishId || day.cenaCustomName);
}

type Entity = { id: string; updatedAt?: number };

/**
 * Replaces everything with `snapshot` (restoring a backup) in a way that also wins
 * when merged with other devices: restored entities get a fresh `updatedAt`,
 * entities that are not in the snapshot get a tombstone.
 */
function restoreSnapshot(current: AppData, snapshot: Omit<AppData, 'tombstones'>, now: number): AppData {
  const tombstones: Tombstones = { ...current.tombstones };

  function restore<T extends Entity>(cur: T[], snap: T[]): T[] {
    const curById = new Map(cur.map((e) => [e.id, e]));
    const snapIds = new Set(snap.map((e) => e.id));
    for (const e of cur) {
      if (!snapIds.has(e.id)) tombstones[e.id] = now;
    }
    return snap.map((e) => {
      if (curById.get(e.id) === e) return e;
      delete tombstones[e.id];
      return { ...e, updatedAt: now };
    });
  }

  return {
    dishes: restore(current.dishes, snapshot.dishes),
    savedMenus: restore(current.savedMenus, snapshot.savedMenus),
    shoppingList: restore(current.shoppingList, snapshot.shoppingList),
    weekMenu: current.weekMenu === snapshot.weekMenu ? current.weekMenu : stampWeekMenu(current.weekMenu, snapshot.weekMenu, now),
    tombstones,
  };
}

/**
 * "Deshacer": reverts only what one action changed (from `before` to `after`),
 * leaving alone anything changed since by the user or by another device.
 */
function revertAction(current: AppData, before: AppData, after: AppData, now: number): AppData {
  const tombstones: Tombstones = { ...current.tombstones };
  let changed = false;

  function revert<T extends Entity>(cur: T[], bef: T[], aft: T[]): T[] {
    if (bef === aft) return cur;
    const befById = new Map(bef.map((e) => [e.id, e]));
    const aftById = new Map(aft.map((e) => [e.id, e]));
    const touched = new Set<string>();
    for (const e of bef) if (aftById.get(e.id) !== e) touched.add(e.id); // changed or removed
    for (const e of aft) if (!befById.has(e.id)) touched.add(e.id); // added
    if (touched.size === 0) return cur;

    let out = cur;
    for (const id of touched) {
      const b = befById.get(id);
      const a = aftById.get(id);
      const c = out.find((e) => e.id === id);
      if (c !== a) continue; // changed again since the action: keep that change
      if (b) {
        const restored = { ...b, updatedAt: now };
        delete tombstones[id];
        if (c) {
          out = out.map((e) => (e.id === id ? restored : e));
        } else {
          const index = Math.min(bef.indexOf(b), out.length);
          out = [...out.slice(0, index), restored, ...out.slice(index)];
        }
      } else if (c) {
        out = out.filter((e) => e.id !== id);
        tombstones[id] = now;
      }
      changed = true;
    }
    return out;
  }

  const dishes = revert(current.dishes, before.dishes, after.dishes);
  const savedMenus = revert(current.savedMenus, before.savedMenus, after.savedMenus);
  const shoppingList = revert(current.shoppingList, before.shoppingList, after.shoppingList);
  const weekMenu =
    before.weekMenu === after.weekMenu ? current.weekMenu : revertWeekMenuFields(current.weekMenu, before.weekMenu, after.weekMenu, now);
  if (!changed && weekMenu === current.weekMenu) return current;
  return { dishes, savedMenus, shoppingList, weekMenu, tombstones };
}

function pickRandom<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useUI();
  const [initial] = useState(loadInitialState);

  const [activeTab, setActiveTabState] = useState<AppTab>(initial.tab);
  const [data, setData] = useState<AppData>(initial.data);
  const [settings, setSettings] = useState<UserSettings>(initial.settings);
  const [syncState, setSyncState] = useState<SyncState>(initial.syncState);

  // Latest values for event handlers (updated after every commit)
  const dataRef = useRef(data);
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    dataRef.current = data;
    settingsRef.current = settings;
  }, [data, settings]);

  // ---- Persistence --------------------------------------------------------
  useEffect(() => writeJson(STORAGE_KEYS.DISHES, data.dishes), [data.dishes]);
  useEffect(() => writeJson(STORAGE_KEYS.WEEK_MENU, data.weekMenu), [data.weekMenu]);
  useEffect(() => writeJson(STORAGE_KEYS.SAVED_MENUS, data.savedMenus), [data.savedMenus]);
  useEffect(() => writeJson(STORAGE_KEYS.SHOPPING_LIST, data.shoppingList), [data.shoppingList]);
  useEffect(() => writeJson(STORAGE_KEYS.TOMBSTONES, data.tombstones), [data.tombstones]);
  useEffect(() => writeJson(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => writeJson(STORAGE_KEYS.SYNC, syncState), [syncState]);
  useEffect(() => writeJson(STORAGE_KEYS.TAB, activeTab), [activeTab]);

  // Same app open in another browser tab (desktop): follow its changes instead of overwriting them
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || !event.key || event.newValue === null) return;
      let value: unknown;
      try {
        value = JSON.parse(event.newValue);
      } catch {
        return;
      }
      switch (event.key) {
        case STORAGE_KEYS.DISHES:
          setData((d) => ({ ...d, dishes: asArray<Dish>(value) }));
          break;
        case STORAGE_KEYS.WEEK_MENU:
          setData((d) => ({ ...d, weekMenu: sanitizeWeekMenu(value) }));
          break;
        case STORAGE_KEYS.SAVED_MENUS:
          setData((d) => ({ ...d, savedMenus: asArray<SavedMenuTemplate>(value) }));
          break;
        case STORAGE_KEYS.SHOPPING_LIST:
          setData((d) => ({ ...d, shoppingList: asArray<ShoppingListItem>(value) }));
          break;
        case STORAGE_KEYS.TOMBSTONES:
          if (value && typeof value === 'object') setData((d) => ({ ...d, tombstones: value as Tombstones }));
          break;
        case STORAGE_KEYS.SETTINGS:
          if (value && typeof value === 'object') setSettings((s) => ({ ...s, ...(value as Partial<UserSettings>) }));
          break;
        case STORAGE_KEYS.SYNC:
          if (value && typeof value === 'object') setSyncState((s) => ({ ...s, ...(value as Partial<SyncState>) }));
          break;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabState(tab);
    window.scrollTo({ top: 0 });
  }, []);

  /** Runs a data change and offers "Deshacer" in a toast */
  const withUndo = useCallback(
    (message: string, updater: (current: AppData, now: number) => AppData) => {
      const now = Date.now();
      const before = dataRef.current;
      const after = updater(before, now);
      setData((current) => (current === before ? after : updater(current, now)));
      showToast(message, {
        actionLabel: 'Deshacer',
        onAction: () => {
          const undoAt = Date.now() + 1;
          // Only what this action changed: later ticks, additions or synced changes stay
          setData((current) => revertAction(current, before, after, undoAt));
        },
      });
    },
    [showToast],
  );

  // ---- Dishes -------------------------------------------------------------
  const dishesById = useMemo(() => new Map(data.dishes.map((d) => [d.id, d])), [data.dishes]);

  const getDishById = useCallback((id: string | null | undefined) => (id ? dishesById.get(id) : undefined), [dishesById]);

  const addDish = useCallback((input: DishInput): Dish => {
    const now = Date.now();
    const dish: Dish = {
      ...input,
      id: newId('dish'),
      estimatedCost: ingredientsCost(input.ingredients),
      createdAt: isoNow(now),
      updatedAt: now,
    };
    setData((d) => ({ ...d, dishes: [dish, ...d.dishes] }));
    return dish;
  }, []);

  const updateDish = useCallback((id: string, updates: Partial<DishInput>): Dish | undefined => {
    const existing = dataRef.current.dishes.find((d) => d.id === id);
    if (!existing) return undefined;
    const now = Date.now();
    const ingredients = updates.ingredients ?? existing.ingredients;
    const updated: Dish = { ...existing, ...updates, ingredients, estimatedCost: ingredientsCost(ingredients), updatedAt: now };
    setData((d) => ({ ...d, dishes: d.dishes.map((x) => (x.id === id ? { ...x, ...updates, ingredients, estimatedCost: updated.estimatedCost, updatedAt: now } : x)) }));
    return updated;
  }, []);

  const deleteDish = useCallback(
    (id: string) => {
      const dish = dataRef.current.dishes.find((d) => d.id === id);
      if (!dish) return;
      withUndo(`«${dish.name}» eliminado`, (d, now) => {
        const usedInMenu = d.weekMenu.days.some((day) => day.comidaDishId === id || day.cenaDishId === id);
        return {
          ...d,
          dishes: d.dishes.filter((x) => x.id !== id),
          weekMenu: usedInMenu
            ? stampWeekMenu(
                d.weekMenu,
                {
                  ...d.weekMenu,
                  days: d.weekMenu.days.map((day) => ({
                    ...day,
                    comidaDishId: day.comidaDishId === id ? null : day.comidaDishId,
                    cenaDishId: day.cenaDishId === id ? null : day.cenaDishId,
                  })),
                },
                now,
              )
            : d.weekMenu,
          tombstones: withTombstones(d.tombstones, [id], now),
        };
      });
    },
    [withUndo],
  );

  // ---- Week menu ----------------------------------------------------------
  const updateMenu = useCallback((mutate: (menu: WeekMenu) => WeekMenu) => {
    const now = Date.now();
    setData((d) => ({ ...d, weekMenu: stampWeekMenu(d.weekMenu, mutate(d.weekMenu), now) }));
  }, []);

  const setSlotDish = useCallback(
    (dayKey: DayKey, slot: MealSlot, dishId: string | null, customName?: string) => {
      const name = customName?.trim() || undefined;
      updateMenu((menu) => ({
        ...menu,
        days: menu.days.map((day) => {
          if (day.dayKey !== dayKey) return day;
          return slot === 'comida'
            ? { ...day, comidaDishId: dishId, comidaCustomName: dishId ? undefined : name }
            : { ...day, cenaDishId: dishId, cenaCustomName: dishId ? undefined : name };
        }),
      }));
    },
    [updateMenu],
  );

  const clearSlot = useCallback(
    (dayKey: DayKey, slot: MealSlot) => {
      const day = dataRef.current.weekMenu.days.find((d) => d.dayKey === dayKey);
      if (!day || !slotHasMeal(day, slot)) return;
      withUndo(`${slot === 'comida' ? 'Comida' : 'Cena'} del ${day.dayLabel.toLowerCase()} quitada`, (d, now) => ({
        ...d,
        weekMenu: stampWeekMenu(
          d.weekMenu,
          {
            ...d.weekMenu,
            days: d.weekMenu.days.map((x) =>
              x.dayKey !== dayKey
                ? x
                : slot === 'comida'
                  ? { ...x, comidaDishId: null, comidaCustomName: undefined }
                  : { ...x, cenaDishId: null, cenaCustomName: undefined },
            ),
          },
          now,
        ),
      }));
    },
    [withUndo],
  );

  const setActiveDaysCount = useCallback(
    (count: number) => {
      const value = count === 7 ? 7 : 6;
      updateMenu((menu) => ({ ...menu, activeDaysCount: value }));
      setSettings((s) => (s.defaultDaysCount === value ? s : { ...s, defaultDaysCount: value, prefsUpdatedAt: Date.now() }));
    },
    [updateMenu],
  );

  const randomizeMenu = useCallback(
    (mode: 'empty' | 'all' = 'empty'): number => {
      const { dishes, weekMenu } = dataRef.current;
      if (dishes.length === 0) return 0;
      const forSlot = (slot: MealSlot) => {
        const matching = dishes.filter((d) => d.type === slot || d.type === 'ambas');
        return matching.length ? matching : dishes;
      };
      const lunchPool = forSlot('comida');
      const dinnerPool = forSlot('cena');

      const activeCount = weekMenu.activeDaysCount;
      const used = new Set<string>();
      if (mode === 'empty') {
        weekMenu.days.slice(0, activeCount).forEach((day) => {
          if (day.comidaDishId) used.add(day.comidaDishId);
          if (day.cenaDishId) used.add(day.cenaDishId);
        });
      }

      let filled = 0;
      const pick = (pool: Dish[], previous: string | null) => {
        const fresh = pool.filter((d) => !used.has(d.id) && d.id !== previous);
        const notYesterday = pool.filter((d) => d.id !== previous);
        const choice = pickRandom(fresh) ?? pickRandom(notYesterday) ?? pickRandom(pool);
        if (choice) used.add(choice.id);
        return choice?.id ?? null;
      };

      let previousLunch: string | null = null;
      let previousDinner: string | null = null;
      const days = weekMenu.days.map((day, index) => {
        if (index >= activeCount) return day;
        const next = { ...day };
        if (mode === 'all' || !slotHasMeal(day, 'comida')) {
          next.comidaDishId = pick(lunchPool, previousLunch);
          next.comidaCustomName = undefined;
          filled += 1;
        }
        if (mode === 'all' || !slotHasMeal(day, 'cena')) {
          next.cenaDishId = pick(dinnerPool, previousDinner);
          next.cenaCustomName = undefined;
          filled += 1;
        }
        previousLunch = next.comidaDishId;
        previousDinner = next.cenaDishId;
        return next;
      });

      if (filled === 0) return 0;
      withUndo(mode === 'all' ? 'Semana rehecha al azar' : `${pluralize(filled, 'comida asignada', 'comidas asignadas')} al azar`, (d, now) => ({
        ...d,
        weekMenu: stampWeekMenu(d.weekMenu, { ...d.weekMenu, days }, now),
      }));
      return filled;
    },
    [withUndo],
  );

  const clearWeekMenu = useCallback(() => {
    withUndo('Semana vaciada', (d, now) => ({
      ...d,
      weekMenu: stampWeekMenu(
        d.weekMenu,
        {
          ...d.weekMenu,
          days: d.weekMenu.days.map((day) => ({
            ...day,
            comidaDishId: null,
            cenaDishId: null,
            comidaCustomName: undefined,
            cenaCustomName: undefined,
          })),
        },
        now,
      ),
    }));
  }, [withUndo]);

  // ---- Saved menus --------------------------------------------------------
  const saveCurrentWeekAsTemplate = useCallback(
    (name: string) => {
      const now = Date.now();
      const { weekMenu } = dataRef.current;
      const template: SavedMenuTemplate = {
        id: newId('template'),
        name: name.trim() || 'Menú guardado',
        activeDaysCount: weekMenu.activeDaysCount,
        days: weekMenu.days.map((day) => ({ ...day })),
        createdAt: isoNow(now),
        updatedAt: now,
      };
      setData((d) => ({ ...d, savedMenus: [template, ...d.savedMenus] }));
      showToast(`Plantilla «${template.name}» guardada`, { tone: 'success' });
    },
    [showToast],
  );

  const loadSavedMenuTemplate = useCallback(
    (templateId: string) => {
      const template = dataRef.current.savedMenus.find((t) => t.id === templateId);
      if (!template) return;
      withUndo(`Menú «${template.name}» cargado`, (d, now) => {
        const loaded = sanitizeWeekMenu({ ...d.weekMenu, days: template.days, activeDaysCount: template.activeDaysCount });
        return { ...d, weekMenu: stampWeekMenu(d.weekMenu, { ...loaded, name: template.name }, now) };
      });
    },
    [withUndo],
  );

  const deleteSavedMenuTemplate = useCallback(
    (templateId: string) => {
      const template = dataRef.current.savedMenus.find((t) => t.id === templateId);
      if (!template) return;
      withUndo(`Plantilla «${template.name}» eliminada`, (d, now) => ({
        ...d,
        savedMenus: d.savedMenus.filter((t) => t.id !== templateId),
        tombstones: withTombstones(d.tombstones, [templateId], now),
      }));
    },
    [withUndo],
  );

  // ---- Shopping list ------------------------------------------------------
  const generateShoppingListFromMenu = useCallback((): GenerateListResult => {
    const { weekMenu, dishes, shoppingList } = dataRef.current;
    const byId = new Map(dishes.map((d) => [d.id, d]));

    // What the menu needs, grouped by product
    const needed = new Map<string, Omit<ShoppingListItem, 'id' | 'checked' | 'isManual'>>();
    for (const day of weekMenu.days.slice(0, weekMenu.activeDaysCount)) {
      for (const dishId of [day.comidaDishId, day.cenaDishId]) {
        const dish = dishId ? byId.get(dishId) : undefined;
        if (!dish) continue;
        for (const ing of dish.ingredients ?? []) {
          const key = shoppingItemKey(ing);
          const existing = needed.get(key);
          if (existing) {
            existing.quantity += ing.quantity || 1;
            if (!existing.sourceDishNames.includes(dish.name)) existing.sourceDishNames.push(dish.name);
          } else {
            needed.set(key, {
              name: ing.mercadonaProduct?.displayName || ing.name,
              quantity: ing.quantity || 1,
              unit: ing.unit || 'ud',
              category: ing.mercadonaProduct?.categoryName || 'Despensa y frescos',
              sourceDishNames: [dish.name],
              mercadonaProduct: ing.mercadonaProduct,
              estimatedPrice: unitPrice(ing),
            });
          }
        }
      }
    }

    if (needed.size === 0) {
      showToast('Los platos del menú no tienen ingredientes todavía', { tone: 'error' });
      return { added: 0, updated: 0, removed: 0, total: shoppingList.length, empty: true };
    }

    let added = 0;
    let updated = 0;
    let removed = 0;
    const now = Date.now();
    const removedIds: string[] = [];
    const next: ShoppingListItem[] = [];

    // Everything visible already ticked = last trip is finished: this is a new shopping trip
    const visible = shoppingList.filter((i) => !i.dismissed);
    const newTrip = visible.length > 0 && visible.every((i) => i.checked);

    for (const item of shoppingList) {
      if (item.isManual) {
        if (newTrip && item.checked) {
          // bought on the previous trip
          removed += 1;
          removedIds.push(item.id);
        } else {
          next.push(item);
        }
        continue;
      }
      const key = shoppingItemKey(item);
      const need = needed.get(key);
      if (!need) {
        if (!item.dismissed) removed += 1;
        removedIds.push(item.id);
        continue;
      }
      needed.delete(key);
      const price = item.priceEdited ? item.estimatedPrice : need.estimatedPrice;
      let quantity: number;
      let checked: boolean;
      let dismissed: boolean;
      if (newTrip) {
        quantity = need.quantity;
        checked = false;
        dismissed = false;
      } else {
        // Keep the user's own changes on top of what the menu now asks for
        const extra = need.quantity - (item.menuQuantity ?? item.quantity);
        quantity = Math.max(1, item.quantity + extra);
        // Needs more than what was ticked/removed → it has to be bought again
        checked = item.checked && extra <= 0;
        dismissed = Boolean(item.dismissed) && extra <= 0;
      }
      const changed =
        item.quantity !== quantity ||
        item.menuQuantity !== need.quantity ||
        item.checked !== checked ||
        Boolean(item.dismissed) !== dismissed ||
        price !== item.estimatedPrice ||
        item.sourceDishNames.join('|') !== need.sourceDishNames.join('|') ||
        item.name !== need.name;
      if (changed && !(item.dismissed && dismissed)) updated += 1;
      next.push(
        changed
          ? { ...item, ...need, quantity, menuQuantity: need.quantity, checked, dismissed, estimatedPrice: price, updatedAt: now }
          : item,
      );
    }

    const fresh: ShoppingListItem[] = [];
    for (const [key, need] of needed) {
      added += 1;
      // Same id on every device for the same product: generating on two phones doesn't duplicate items
      fresh.push({ ...need, id: `shop-auto-${key}`, menuQuantity: need.quantity, checked: false, isManual: false, updatedAt: now });
    }

    const total = [...fresh, ...next].filter((i) => !i.dismissed).length;
    const parts = [
      added ? pluralize(added, 'nuevo', 'nuevos') : '',
      updated ? pluralize(updated, 'actualizado', 'actualizados') : '',
      removed ? pluralize(removed, 'quitado', 'quitados') : '',
    ].filter(Boolean);
    const message = parts.length ? `Lista actualizada: ${parts.join(', ')}` : 'La lista ya estaba al día';

    withUndo(message, (d) => ({
      ...d,
      shoppingList: [...fresh, ...next],
      tombstones: withTombstones(d.tombstones, removedIds, now),
    }));
    return { added, updated, removed, total, empty: false };
  }, [showToast, withUndo]);

  const addShoppingItem = useCallback((input: NewShoppingItem): boolean => {
    const now = Date.now();
    const product = input.product;
    const draft = { name: product?.displayName || input.name.trim(), mercadonaProduct: product };
    if (!draft.name) return false;
    const key = shoppingItemKey(draft);
    const quantity = Math.max(1, input.quantity ?? 1);
    const existing = dataRef.current.shoppingList.find((i) => i.isManual && !i.checked && shoppingItemKey(i) === key);

    if (existing) {
      setData((d) => ({
        ...d,
        shoppingList: d.shoppingList.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + quantity, updatedAt: now } : i)),
      }));
      return true;
    }

    const item: ShoppingListItem = {
      id: newId('shop-man'),
      name: draft.name,
      quantity,
      unit: input.unit || product?.packaging || 'ud',
      category: product?.categoryName || input.category || 'Otros',
      checked: false,
      sourceDishNames: [],
      isManual: true,
      mercadonaProduct: product,
      estimatedPrice: input.price ?? product?.price ?? 0,
      updatedAt: now,
    };
    setData((d) => ({ ...d, shoppingList: [item, ...d.shoppingList] }));
    return false;
  }, []);

  const updateItem = useCallback((id: string, mutate: (item: ShoppingListItem) => ShoppingListItem) => {
    const now = Date.now();
    setData((d) => ({
      ...d,
      shoppingList: d.shoppingList.map((i) => (i.id === id ? { ...mutate(i), updatedAt: now } : i)),
    }));
  }, []);

  const toggleShoppingItem = useCallback((id: string) => updateItem(id, (i) => ({ ...i, checked: !i.checked })), [updateItem]);

  const setShoppingItemQuantity = useCallback(
    (id: string, quantity: number) => updateItem(id, (i) => ({ ...i, quantity: Math.max(1, Math.round(quantity)) })),
    [updateItem],
  );

  const updateShoppingItemPrice = useCallback(
    (id: string, price: number) => updateItem(id, (i) => ({ ...i, estimatedPrice: Math.max(0, roundMoney(price)), priceEdited: true })),
    [updateItem],
  );

  const removeShoppingItem = useCallback(
    (id: string) => {
      const item = dataRef.current.shoppingList.find((i) => i.id === id);
      if (!item) return;
      withUndo(`«${item.name}» quitado de la lista`, (d, now) =>
        item.isManual
          ? {
              ...d,
              shoppingList: d.shoppingList.filter((i) => i.id !== id),
              tombstones: withTombstones(d.tombstones, [id], now),
            }
          : {
              // From the menu: hide it, so "Actualizar lista" doesn't add it back
              ...d,
              shoppingList: d.shoppingList.map((i) => (i.id === id ? { ...i, dismissed: true, updatedAt: now } : i)),
            },
      );
    },
    [withUndo],
  );

  const clearCheckedShoppingItems = useCallback(() => {
    const list = dataRef.current.shoppingList;
    const checkedCount = list.filter((i) => i.checked && !i.dismissed).length;
    if (checkedCount === 0) return;
    // Removed-from-menu items go too: the trip is done, next list starts clean
    const ids = list.filter((i) => i.checked || i.dismissed).map((i) => i.id);
    withUndo(`${pluralize(checkedCount, 'producto comprado borrado', 'productos comprados borrados')}`, (d, now) => ({
      ...d,
      shoppingList: d.shoppingList.filter((i) => !ids.includes(i.id)),
      tombstones: withTombstones(d.tombstones, ids, now),
    }));
  }, [withUndo]);

  const clearAllShoppingItems = useCallback(() => {
    const ids = dataRef.current.shoppingList.map((i) => i.id);
    if (ids.length === 0) return;
    withUndo('Lista vaciada', (d, now) => ({
      ...d,
      shoppingList: [],
      tombstones: withTombstones(d.tombstones, ids, now),
    }));
  }, [withUndo]);

  const uncheckAllShoppingItems = useCallback(() => {
    if (!dataRef.current.shoppingList.some((i) => i.checked && !i.dismissed)) return;
    withUndo('Todos los productos desmarcados', (d, now) => ({
      ...d,
      shoppingList: d.shoppingList.map((i) => (i.checked && !i.dismissed ? { ...i, checked: false, updatedAt: now } : i)),
    }));
  }, [withUndo]);

  // ---- Settings -----------------------------------------------------------
  const updateSettings = useCallback((updates: Partial<Omit<UserSettings, 'syncCode' | 'prefsUpdatedAt'>>) => {
    setSettings((prev) => {
      const next: UserSettings = { ...prev, ...updates };
      if (updates.postalCode && updates.postalCode !== prev.postalCode) {
        next.warehouse = getWarehouseFromPostalCode(updates.postalCode);
      }
      const prefsChanged =
        next.postalCode !== prev.postalCode || next.warehouse !== prev.warehouse || next.defaultDaysCount !== prev.defaultDaysCount;
      if (prefsChanged) next.prefsUpdatedAt = Date.now();
      return next;
    });
  }, []);

  const resetAllData = useCallback(() => {
    const now = Date.now();
    setData((d) => ({
      dishes: [],
      savedMenus: [],
      shoppingList: [],
      weekMenu: stampWeekMenu(d.weekMenu, createEmptyWeekMenu(d.weekMenu.activeDaysCount), now),
      tombstones: withTombstones(
        d.tombstones,
        [...d.dishes, ...d.savedMenus, ...d.shoppingList].map((e) => e.id),
        now,
      ),
    }));
    showToast('Todos los datos se han borrado');
  }, [showToast]);

  const exportBackup = useCallback((): string => {
    const doc = buildSyncDoc(dataRef.current, settingsRef.current);
    return JSON.stringify({ app: 'menu-compra', version: 1, exportedAt: new Date().toISOString(), doc }, null, 2);
  }, []);

  const importBackup = useCallback(
    (json: string): boolean => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        return false;
      }
      const container = parsed && typeof parsed === 'object' && 'doc' in parsed ? (parsed as { doc: unknown }).doc : parsed;
      const doc = normalizeSyncDoc(container);
      if (!doc || (!doc.dishes.length && !doc.shoppingList.length && !doc.savedMenus.length && !doc.weekMenu.days.some((d) => d.comidaDishId || d.cenaDishId))) {
        return false;
      }
      withUndo('Copia de seguridad restaurada', (current, now) =>
        restoreSnapshot(current, { dishes: doc.dishes, savedMenus: doc.savedMenus, shoppingList: doc.shoppingList, weekMenu: doc.weekMenu }, now),
      );
      return true;
    },
    [withUndo],
  );

  // ---- Household sync -----------------------------------------------------
  const cloud = useCloudSync({
    data,
    settings,
    syncState,
    setData,
    setSettings,
    setSyncState,
    dataRef,
    settingsRef,
  });

  const joinHousehold = useCallback(
    async (rawCode: string): Promise<JoinResult> => {
      const code = normalizeSyncCode(rawCode);
      if (!isValidSyncCode(code)) return { ok: false, message: 'El código no es válido. Revisa que esté bien escrito.' };
      return cloud.join(code);
    },
    [cloud],
  );

  const regenerateSyncCode = useCallback(() => {
    cloud.changeCode(generateSyncCode());
  }, [cloud]);

  // ---- Totals -------------------------------------------------------------
  const activeDays = useMemo(() => data.weekMenu.days.slice(0, data.weekMenu.activeDaysCount), [data.weekMenu]);

  const { menuTotalCost, plannedMealsCount } = useMemo(() => {
    let total = 0;
    let planned = 0;
    for (const day of activeDays) {
      total += getDishById(day.comidaDishId)?.estimatedCost ?? 0;
      total += getDishById(day.cenaDishId)?.estimatedCost ?? 0;
      if (slotHasMeal(day, 'comida')) planned += 1;
      if (slotHasMeal(day, 'cena')) planned += 1;
    }
    return { menuTotalCost: roundMoney(total), plannedMealsCount: planned };
  }, [activeDays, getDishById]);

  // Items removed from the menu's list ("ya lo tengo") stay in the data but are not shown
  const visibleShoppingList = useMemo(() => data.shoppingList.filter((i) => !i.dismissed), [data.shoppingList]);

  const shoppingTotals = useMemo(() => {
    let total = 0;
    let checkedCost = 0;
    let checked = 0;
    for (const item of visibleShoppingList) {
      const line = lineTotal(item);
      total += line;
      if (item.checked) {
        checkedCost += line;
        checked += 1;
      }
    }
    return {
      shoppingTotalCost: roundMoney(total),
      shoppingCheckedCost: roundMoney(checkedCost),
      shoppingPendingCost: roundMoney(total - checkedCost),
      checkedItemsCount: checked,
      pendingItemsCount: visibleShoppingList.length - checked,
      totalItemsCount: visibleShoppingList.length,
    };
  }, [visibleShoppingList]);

  const storeLabel = useMemo(() => buildStoreLabel(settings.postalCode), [settings.postalCode]);

  const value: AppContextType = {
    activeTab,
    setActiveTab,
    dishes: data.dishes,
    addDish,
    updateDish,
    deleteDish,
    getDishById,
    weekMenu: data.weekMenu,
    activeDays,
    setSlotDish,
    clearSlot,
    setActiveDaysCount,
    randomizeMenu,
    clearWeekMenu,
    savedMenus: data.savedMenus,
    saveCurrentWeekAsTemplate,
    loadSavedMenuTemplate,
    deleteSavedMenuTemplate,
    shoppingList: visibleShoppingList,
    generateShoppingListFromMenu,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    setShoppingItemQuantity,
    updateShoppingItemPrice,
    clearCheckedShoppingItems,
    clearAllShoppingItems,
    uncheckAllShoppingItems,
    settings,
    updateSettings,
    storeLabel,
    resetAllData,
    exportBackup,
    importBackup,
    sync: {
      enabled: syncState.enabled,
      status: cloud.status,
      error: cloud.error,
      lastSyncAt: syncState.lastSyncAt,
      codeIsWeak: isWeakSyncCode(settings.syncCode),
    },
    enableSync: cloud.enable,
    disableSync: cloud.disable,
    syncNow: cloud.syncNow,
    joinHousehold,
    regenerateSyncCode,
    menuTotalCost,
    plannedMealsCount,
    maxMealsCount: activeDays.length * 2,
    ...shoppingTotals,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
