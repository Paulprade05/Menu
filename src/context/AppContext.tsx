'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dish,
  WeekMenu,
  SavedMenuTemplate,
  ShoppingListItem,
  UserSettings,
  Ingredient,
  MercadonaProduct,
  DayKey,
  MealType
} from '@/types';
import {
  INITIAL_DISHES,
  INITIAL_WEEK_MENU,
  INITIAL_SAVED_MENUS,
  INITIAL_SETTINGS,
  getWarehouseFromPostalCode,
} from '@/data/initialData';

const STORAGE_KEYS = {
  DISHES: 'mercadona_dishes_v2',
  WEEK_MENU: 'mercadona_week_menu_v2',
  SAVED_MENUS: 'mercadona_saved_menus_v2',
  SHOPPING_LIST: 'mercadona_shopping_list_v2',
  SETTINGS: 'mercadona_settings_v2',
};

interface AppContextType {
  // Navigation
  activeTab: 'menu' | 'dishes' | 'shopping' | 'settings';
  setActiveTab: (tab: 'menu' | 'dishes' | 'shopping' | 'settings') => void;

  // Dishes Bank
  dishes: Dish[];
  addDish: (dish: Omit<Dish, 'id' | 'createdAt' | 'estimatedCost'>) => Dish;
  updateDish: (id: string, updates: Partial<Dish>) => void;
  deleteDish: (id: string) => void;
  addIngredientToDish: (dishId: string, ingredient: Omit<Ingredient, 'id'>) => void;
  removeIngredientFromDish: (dishId: string, ingredientId: string) => void;
  getDishById: (id: string | null) => Dish | undefined;

  // Weekly Menu Planner
  weekMenu: WeekMenu;
  setSlotDish: (dayKey: DayKey, slot: 'comida' | 'cena', dishId: string | null, customName?: string) => void;
  clearSlot: (dayKey: DayKey, slot: 'comida' | 'cena') => void;
  setActiveDaysCount: (count: number) => void;
  randomizeMenu: () => void;
  clearWeekMenu: () => void;

  // Saved Menus
  savedMenus: SavedMenuTemplate[];
  saveCurrentWeekAsTemplate: (name: string, description?: string) => void;
  loadSavedMenuTemplate: (templateId: string) => void;
  deleteSavedMenuTemplate: (templateId: string) => void;

  // Shopping List
  shoppingList: ShoppingListItem[];
  generateShoppingListFromMenu: () => void;
  addShoppingItem: (name: string, quantity: number, unit: string, mercadonaProduct?: MercadonaProduct, category?: string) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  updateShoppingItemQuantity: (id: string, delta: number) => void;
  clearCheckedShoppingItems: () => void;
  clearAllShoppingItems: () => void;

  // Settings & Sync
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetAllData: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncErrorMsg: string | null;
  lastSyncTime: Date | null;
  syncToCloud: () => Promise<boolean>;
  loadFromCloud: (codeToLoad?: string) => Promise<boolean>;

  // Computed totals
  menuTotalCost: number;
  shoppingTotalCost: number;
  shoppingPendingCost: number;
  shoppingCheckedCost: number;
  checkedItemsCount: number;
  totalItemsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'menu' | 'dishes' | 'shopping' | 'settings'>('menu');

  // State
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
  const [weekMenu, setWeekMenu] = useState<WeekMenu>(INITIAL_WEEK_MENU);
  const [savedMenus, setSavedMenus] = useState<SavedMenuTemplate[]>(INITIAL_SAVED_MENUS);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const savedDishes = localStorage.getItem(STORAGE_KEYS.DISHES);
      if (savedDishes) setDishes(JSON.parse(savedDishes));

      const savedWeek = localStorage.getItem(STORAGE_KEYS.WEEK_MENU);
      if (savedWeek) setWeekMenu(JSON.parse(savedWeek));

      const savedTemplates = localStorage.getItem(STORAGE_KEYS.SAVED_MENUS);
      if (savedTemplates) setSavedMenus(JSON.parse(savedTemplates));

      const savedShopping = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      if (savedShopping) setShoppingList(JSON.parse(savedShopping));

      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Generate random sync code if none exists
        const randomCode = 'CASA-' + Math.floor(1000 + Math.random() * 9000);
        setSettings(prev => ({ ...prev, syncCode: randomCode }));
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to LocalStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
      localStorage.setItem(STORAGE_KEYS.WEEK_MENU, JSON.stringify(weekMenu));
      localStorage.setItem(STORAGE_KEYS.SAVED_MENUS, JSON.stringify(savedMenus));
      localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(shoppingList));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [dishes, weekMenu, savedMenus, shoppingList, settings, isLoaded]);

  // Dish actions
  const calculateDishCost = useCallback((ingredients: Ingredient[]): number => {
    return Number(ingredients.reduce((acc, ing) => {
      const itemPrice = ing.mercadonaProduct?.price ?? ing.estimatedPrice ?? 0;
      return acc + (itemPrice * (ing.quantity || 1));
    }, 0).toFixed(2));
  }, []);

  const addDish = useCallback((dishData: Omit<Dish, 'id' | 'createdAt' | 'estimatedCost'>): Dish => {
    const cost = calculateDishCost(dishData.ingredients);
    const newDish: Dish = {
      ...dishData,
      id: 'dish-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      estimatedCost: cost,
      createdAt: new Date().toISOString(),
    };
    setDishes(prev => [newDish, ...prev]);
    return newDish;
  }, [calculateDishCost]);

  const updateDish = useCallback((id: string, updates: Partial<Dish>) => {
    setDishes(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updatedIngredients = updates.ingredients || d.ingredients;
      const newCost = calculateDishCost(updatedIngredients);
      return {
        ...d,
        ...updates,
        ingredients: updatedIngredients,
        estimatedCost: newCost,
      };
    }));
  }, [calculateDishCost]);

  const deleteDish = useCallback((id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
    // Also remove from current week menu slots if assigned
    setWeekMenu(prev => ({
      ...prev,
      days: prev.days.map(day => ({
        ...day,
        comidaDishId: day.comidaDishId === id ? null : day.comidaDishId,
        cenaDishId: day.cenaDishId === id ? null : day.cenaDishId,
      }))
    }));
  }, []);

  const addIngredientToDish = useCallback((dishId: string, ingredientData: Omit<Ingredient, 'id'>) => {
    const newIngredient: Ingredient = {
      ...ingredientData,
      id: 'ing-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    setDishes(prev => prev.map(dish => {
      if (dish.id !== dishId) return dish;
      const updatedIngredients = [...dish.ingredients, newIngredient];
      return {
        ...dish,
        ingredients: updatedIngredients,
        estimatedCost: calculateDishCost(updatedIngredients),
      };
    }));
  }, [calculateDishCost]);

  const removeIngredientFromDish = useCallback((dishId: string, ingredientId: string) => {
    setDishes(prev => prev.map(dish => {
      if (dish.id !== dishId) return dish;
      const updatedIngredients = dish.ingredients.filter(ing => ing.id !== ingredientId);
      return {
        ...dish,
        ingredients: updatedIngredients,
        estimatedCost: calculateDishCost(updatedIngredients),
      };
    }));
  }, [calculateDishCost]);

  const getDishById = useCallback((id: string | null): Dish | undefined => {
    if (!id) return undefined;
    return dishes.find(d => d.id === id);
  }, [dishes]);

  // Week Menu actions
  const setSlotDish = useCallback((dayKey: DayKey, slot: 'comida' | 'cena', dishId: string | null, customName?: string) => {
    setWeekMenu(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      days: prev.days.map(day => {
        if (day.dayKey !== dayKey) return day;
        if (slot === 'comida') {
          return {
            ...day,
            comidaDishId: dishId,
            comidaCustomName: customName !== undefined ? customName : (dishId ? undefined : day.comidaCustomName),
          };
        } else {
          return {
            ...day,
            cenaDishId: dishId,
            cenaCustomName: customName !== undefined ? customName : (dishId ? undefined : day.cenaCustomName),
          };
        }
      })
    }));
  }, []);

  const clearSlot = useCallback((dayKey: DayKey, slot: 'comida' | 'cena') => {
    setSlotDish(dayKey, slot, null, '');
  }, [setSlotDish]);

  const setActiveDaysCount = useCallback((count: number) => {
    setWeekMenu(prev => ({
      ...prev,
      activeDaysCount: count,
      updatedAt: new Date().toISOString(),
    }));
    setSettings(prev => ({ ...prev, defaultDaysCount: count }));
  }, []);

  const randomizeMenu = useCallback(() => {
    if (dishes.length === 0) return;
    const lunchDishes = dishes.filter(d => d.type === 'comida' || d.type === 'ambas');
    const dinnerDishes = dishes.filter(d => d.type === 'cena' || d.type === 'ambas');

    const getRandom = (arr: Dish[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)].id : null;

    setWeekMenu(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      days: prev.days.map(day => ({
        ...day,
        comidaDishId: getRandom(lunchDishes.length > 0 ? lunchDishes : dishes),
        cenaDishId: getRandom(dinnerDishes.length > 0 ? dinnerDishes : dishes),
        comidaCustomName: undefined,
        cenaCustomName: undefined,
      }))
    }));
  }, [dishes]);

  const clearWeekMenu = useCallback(() => {
    setWeekMenu(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      days: prev.days.map(day => ({
        ...day,
        comidaDishId: null,
        cenaDishId: null,
        comidaCustomName: undefined,
        cenaCustomName: undefined,
      }))
    }));
  }, []);

  // Saved Menu templates
  const saveCurrentWeekAsTemplate = useCallback((name: string, description?: string) => {
    const newTemplate: SavedMenuTemplate = {
      id: 'template-' + Date.now(),
      name: name || 'Menú Guardado',
      description: description || '',
      activeDaysCount: weekMenu.activeDaysCount,
      days: JSON.parse(JSON.stringify(weekMenu.days)),
      createdAt: new Date().toISOString(),
    };
    setSavedMenus(prev => [newTemplate, ...prev]);
  }, [weekMenu]);

  const loadSavedMenuTemplate = useCallback((templateId: string) => {
    const template = savedMenus.find(t => t.id === templateId);
    if (!template) return;
    setWeekMenu({
      id: 'menu-loaded-' + Date.now(),
      name: template.name,
      activeDaysCount: template.activeDaysCount || 6,
      days: JSON.parse(JSON.stringify(template.days)),
      updatedAt: new Date().toISOString(),
    });
  }, [savedMenus]);

  const deleteSavedMenuTemplate = useCallback((templateId: string) => {
    setSavedMenus(prev => prev.filter(t => t.id !== templateId));
  }, []);

  // Shopping list actions
  const generateShoppingListFromMenu = useCallback(() => {
    const activeDays = weekMenu.days.slice(0, weekMenu.activeDaysCount);
    const itemMap = new Map<string, ShoppingListItem>();

    for (const day of activeDays) {
      const comida = getDishById(day.comidaDishId);
      const cena = getDishById(day.cenaDishId);

      const processDish = (dish: Dish | undefined) => {
        if (!dish || !dish.ingredients) return;
        for (const ing of dish.ingredients) {
          // Key by Mercadona ID if present, otherwise by normalized name
          const key = ing.mercadonaProduct?.id ? `merc-${ing.mercadonaProduct.id}` : `name-${ing.name.toLowerCase().trim()}`;
          const existing = itemMap.get(key);

          const price = ing.mercadonaProduct?.price ?? ing.estimatedPrice ?? 0;
          const category = ing.mercadonaProduct?.categoryName || 'Despensa y Frescos';

          if (existing) {
            existing.quantity += (ing.quantity || 1);
            if (!existing.sourceDishNames.includes(dish.name)) {
              existing.sourceDishNames.push(dish.name);
            }
          } else {
            itemMap.set(key, {
              id: 'shop-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              name: ing.mercadonaProduct?.displayName || ing.name,
              quantity: ing.quantity || 1,
              unit: ing.unit || 'ud',
              category: category,
              checked: false,
              sourceDishNames: [dish.name],
              isManual: false,
              mercadonaProduct: ing.mercadonaProduct,
              estimatedPrice: price,
            });
          }
        }
      };

      processDish(comida);
      processDish(cena);
    }

    // Keep existing manual items that user added separately!
    const manualItems = shoppingList.filter(item => item.isManual);
    const generatedItems = Array.from(itemMap.values());

    setShoppingList([...manualItems, ...generatedItems]);
    setActiveTab('shopping');
  }, [weekMenu, getDishById, shoppingList]);

  const addShoppingItem = useCallback((
    name: string,
    quantity: number = 1,
    unit: string = 'ud',
    mercadonaProduct?: MercadonaProduct,
    category: string = 'Varios y Manuales'
  ) => {
    const newItem: ShoppingListItem = {
      id: 'shop-man-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: mercadonaProduct?.displayName || name,
      quantity,
      unit,
      category: mercadonaProduct?.categoryName || category,
      checked: false,
      sourceDishNames: ['Añadido a mano'],
      isManual: true,
      mercadonaProduct,
      estimatedPrice: mercadonaProduct?.price || 0,
    };
    setShoppingList(prev => [newItem, ...prev]);
  }, []);

  const toggleShoppingItem = useCallback((id: string) => {
    setShoppingList(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, checked: !item.checked };
    }));
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateShoppingItemQuantity = useCallback((id: string, delta: number) => {
    setShoppingList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, (item.quantity || 1) + delta);
      return { ...item, quantity: newQty };
    }));
  }, []);

  const clearCheckedShoppingItems = useCallback(() => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  }, []);

  const clearAllShoppingItems = useCallback(() => {
    setShoppingList([]);
  }, []);

  // Settings & Sync
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      if (updates.postalCode && updates.postalCode !== prev.postalCode) {
        next.warehouse = getWarehouseFromPostalCode(updates.postalCode);
      }
      return next;
    });
  }, []);

  const resetAllData = useCallback(() => {
    setDishes([]);
    setWeekMenu(INITIAL_WEEK_MENU);
    setSavedMenus([]);
    setShoppingList([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.DISHES);
      localStorage.removeItem(STORAGE_KEYS.WEEK_MENU);
      localStorage.removeItem(STORAGE_KEYS.SAVED_MENUS);
      localStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST);
      localStorage.removeItem('mercadona_dishes_v1');
      localStorage.removeItem('mercadona_week_menu_v1');
      localStorage.removeItem('mercadona_saved_menus_v1');
      localStorage.removeItem('mercadona_shopping_list_v1');
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Cloud Sync
  const syncToCloud = useCallback(async (): Promise<boolean> => {
    if (!settings.syncCode) return false;
    setSyncStatus('syncing');
    setSyncErrorMsg(null);
    try {
      const payload = {
        syncCode: settings.syncCode,
        dishes,
        weekMenu,
        savedMenus,
        shoppingList,
        settings,
      };
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al sincronizar con el servidor');
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 3000);
      return true;
    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncErrorMsg(e.message || 'Fallo de conexión');
      return false;
    }
  }, [settings, dishes, weekMenu, savedMenus, shoppingList]);

  const loadFromCloud = useCallback(async (codeToLoad?: string): Promise<boolean> => {
    const code = (codeToLoad || settings.syncCode || '').toUpperCase().trim();
    if (!code) return false;

    setSyncStatus('syncing');
    setSyncErrorMsg(null);
    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Código no encontrado o error de red');
      }
      const json = await res.json();
      if (!json.found || !json.data) {
        throw new Error('No se encontraron datos para este código');
      }

      const remoteData = json.data;
      if (remoteData.dishes) setDishes(remoteData.dishes);
      if (remoteData.weekMenu) setWeekMenu(remoteData.weekMenu);
      if (remoteData.savedMenus) setSavedMenus(remoteData.savedMenus);
      if (remoteData.shoppingList) setShoppingList(remoteData.shoppingList);
      if (remoteData.settings) {
        setSettings({ ...remoteData.settings, syncCode: code });
      } else {
        setSettings(prev => ({ ...prev, syncCode: code }));
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 3000);
      return true;
    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncErrorMsg(e.message || 'No se pudo conectar a la nube');
      return false;
    }
  }, [settings.syncCode]);

  // Computed values
  const menuTotalCost = useMemo(() => {
    const activeDays = weekMenu.days.slice(0, weekMenu.activeDaysCount);
    let total = 0;
    for (const d of activeDays) {
      const c = getDishById(d.comidaDishId);
      const cena = getDishById(d.cenaDishId);
      if (c) total += c.estimatedCost || 0;
      if (cena) total += cena.estimatedCost || 0;
    }
    return Number(total.toFixed(2));
  }, [weekMenu, getDishById]);

  const shoppingTotalCost = useMemo(() => {
    return Number(shoppingList.reduce((acc, item) => {
      const p = item.mercadonaProduct?.price ?? item.estimatedPrice ?? 0;
      return acc + (p * (item.quantity || 1));
    }, 0).toFixed(2));
  }, [shoppingList]);

  const shoppingPendingCost = useMemo(() => {
    return Number(shoppingList.filter(i => !i.checked).reduce((acc, item) => {
      const p = item.mercadonaProduct?.price ?? item.estimatedPrice ?? 0;
      return acc + (p * (item.quantity || 1));
    }, 0).toFixed(2));
  }, [shoppingList]);

  const shoppingCheckedCost = useMemo(() => {
    return Number(shoppingList.filter(i => i.checked).reduce((acc, item) => {
      const p = item.mercadonaProduct?.price ?? item.estimatedPrice ?? 0;
      return acc + (p * (item.quantity || 1));
    }, 0).toFixed(2));
  }, [shoppingList]);

  const checkedItemsCount = useMemo(() => {
    return shoppingList.filter(i => i.checked).length;
  }, [shoppingList]);

  const totalItemsCount = shoppingList.length;

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        dishes,
        addDish,
        updateDish,
        deleteDish,
        addIngredientToDish,
        removeIngredientFromDish,
        getDishById,
        weekMenu,
        setSlotDish,
        clearSlot,
        setActiveDaysCount,
        randomizeMenu,
        clearWeekMenu,
        savedMenus,
        saveCurrentWeekAsTemplate,
        loadSavedMenuTemplate,
        deleteSavedMenuTemplate,
        shoppingList,
        generateShoppingListFromMenu,
        addShoppingItem,
        toggleShoppingItem,
        removeShoppingItem,
        updateShoppingItemQuantity,
        clearCheckedShoppingItems,
        clearAllShoppingItems,
        settings,
        updateSettings,
        resetAllData,
        syncStatus,
        syncErrorMsg,
        lastSyncTime,
        syncToCloud,
        loadFromCloud,
        menuTotalCost,
        shoppingTotalCost,
        shoppingPendingCost,
        shoppingCheckedCost,
        checkedItemsCount,
        totalItemsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
