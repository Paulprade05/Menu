'use client';

import React from 'react';
import { CalendarDays, Cloud, CloudOff, RefreshCw, Settings, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatEuro, formatRelativeTime } from '@/lib/format';
import type { AppTab } from '@/types';

const NAV_ITEMS: { id: AppTab; label: string; shortLabel: string; icon: typeof CalendarDays }[] = [
  { id: 'menu', label: 'Menú semanal', shortLabel: 'Menú', icon: CalendarDays },
  { id: 'dishes', label: 'Mis platos', shortLabel: 'Platos', icon: UtensilsCrossed },
  { id: 'shopping', label: 'Lista de la compra', shortLabel: 'Compra', icon: ShoppingCart },
  { id: 'settings', label: 'Ajustes', shortLabel: 'Ajustes', icon: Settings },
];

export default function Navigation() {
  const {
    activeTab,
    setActiveTab,
    pendingItemsCount,
    dishes,
    menuTotalCost,
    plannedMealsCount,
    maxMealsCount,
    shoppingPendingCost,
    storeLabel,
    sync,
    syncNow,
  } = useApp();

  // Only worth the user's attention when something is wrong with the household sync
  const syncProblem = !sync.enabled
    ? null
    : sync.status === 'offline'
      ? 'sin conexión: se sincronizará después'
      : sync.status === 'error' || sync.status === 'unconfigured'
        ? 'problema al sincronizar'
        : null;

  const countFor = (id: AppTab): number | null => {
    if (id === 'shopping') return pendingItemsCount > 0 ? pendingItemsCount : null;
    if (id === 'dishes') return dishes.length > 0 ? dishes.length : null;
    return null;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar" aria-label="Menú principal">
        <div className="sidebar__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="sidebar__logo" width={42} height={42} />
          <div className="grow">
            <div className="sidebar__title">Menú &amp; Compra</div>
            <div className="sidebar__store ellipsis">{storeLabel}</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const count = countFor(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar__link${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                <span>{item.label}</span>
                {count !== null && <span className="sidebar__count">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__stats">
          <div className="sidebar__stat">
            <span>Comidas planificadas</span>
            <strong>
              {plannedMealsCount}/{maxMealsCount}
            </strong>
          </div>
          <div className="sidebar__stat">
            <span>Coste del menú</span>
            <strong className="price">{formatEuro(menuTotalCost)}</strong>
          </div>
          <div className="sidebar__stat">
            <span>Falta por comprar</span>
            <strong className="price">{formatEuro(shoppingPendingCost)}</strong>
          </div>
        </div>

        {sync.enabled && (
          <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => void syncNow()}>
            {sync.status === 'syncing' ? (
              <RefreshCw size={15} className="spin" />
            ) : sync.status === 'offline' || sync.status === 'error' || sync.status === 'unconfigured' ? (
              <CloudOff size={15} />
            ) : (
              <Cloud size={15} />
            )}
            <span>
              {sync.status === 'syncing'
                ? 'Sincronizando…'
                : sync.status === 'offline'
                  ? 'Sin conexión'
                  : sync.status === 'error' || sync.status === 'unconfigured'
                    ? 'Error al sincronizar'
                    : `Sincronizado ${formatRelativeTime(sync.lastSyncAt)}`}
            </span>
          </button>
        )}
      </aside>

      {/* Phone tab bar */}
      <nav className="tabbar" aria-label="Menú principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badge = item.id === 'shopping' ? countFor('shopping') : null;
          const syncWarning = item.id === 'settings' ? syncProblem : null;
          const label = badge
            ? `${item.label}, ${badge} por comprar`
            : syncWarning
              ? `${item.label}, ${syncWarning}`
              : item.label;
          return (
            <button
              key={item.id}
              type="button"
              className={`tabbar__item${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
            >
              <span className="tabbar__icon">
                <Icon size={24} strokeWidth={isActive ? 2.4 : 1.8} />
              </span>
              <span>{item.shortLabel}</span>
              {badge !== null && <span className="tabbar__badge">{badge > 99 ? '99+' : badge}</span>}
              {syncWarning && (
                <span
                  className={`tabbar__dot${sync.status === 'offline' ? ' tabbar__dot--muted' : ''}`}
                  title={syncWarning}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
