'use client';

import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { UIProvider } from '@/components/ui/UIProvider';
import Navigation from '@/components/Navigation';
import MenuPlannerView from '@/components/MenuPlannerView';
import DishBankView from '@/components/DishBankView';
import ShoppingListView from '@/components/ShoppingListView';
import SettingsView from '@/components/SettingsView';
import PwaRegister from '@/components/PwaRegister';

/**
 * The whole app runs in the browser only (data lives in localStorage), so it is
 * loaded with `ssr: false` from the page and can read storage on first render.
 */
export default function ClientApp() {
  return (
    <UIProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </UIProvider>
  );
}

function AppShell() {
  const { activeTab } = useApp();

  return (
    <div className="app-shell">
      <Navigation />
      <main className="app-main">
        {activeTab === 'menu' && <MenuPlannerView />}
        {activeTab === 'dishes' && <DishBankView />}
        {activeTab === 'shopping' && <ShoppingListView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
      <PwaRegister />
    </div>
  );
}
