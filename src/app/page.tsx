'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import MenuPlannerView from '@/components/MenuPlannerView';
import DishBankView from '@/components/DishBankView';
import ShoppingListView from '@/components/ShoppingListView';
import SettingsView from '@/components/SettingsView';
import PwaRegister from '@/components/PwaRegister';

export default function HomePage() {
  const { activeTab } = useApp();

  return (
    <div className="app-shell">
      <Navigation />

      <main className="app-main">
        {activeTab === 'menu' && <MenuPlannerView />}
        {activeTab === 'dishes' && <DishBankView />}
        {activeTab === 'shopping' && <ShoppingListView />}
        {activeTab === 'settings' && <SettingsView />}

        <PwaRegister />
      </main>
    </div>
  );
}
