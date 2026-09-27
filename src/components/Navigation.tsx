'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  Settings,
  RefreshCw,
  Store,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Navigation() {
  const {
    activeTab,
    setActiveTab,
    totalItemsCount,
    checkedItemsCount,
    menuTotalCost,
    shoppingTotalCost,
    syncStatus,
    syncToCloud,
    settings,
  } = useApp();

  const navItems = [
    {
      id: 'menu' as const,
      label: 'Menú Semanal',
      shortLabel: 'Menú',
      icon: CalendarDays,
      badge: null,
    },
    {
      id: 'dishes' as const,
      label: 'Banco de Platos',
      shortLabel: 'Platos',
      icon: UtensilsCrossed,
      badge: null,
    },
    {
      id: 'shopping' as const,
      label: 'Lista de la Compra',
      shortLabel: 'Compra',
      icon: ShoppingCart,
      badge: totalItemsCount > 0 ? `${totalItemsCount - checkedItemsCount}` : null,
    },
    {
      id: 'settings' as const,
      label: 'Ajustes & Sync',
      shortLabel: 'Ajustes',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar (Classic Clean White & Black) */}
      <aside className="desktop-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '0 4px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: '#000000',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Menú & Compra
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="badge" style={{ fontSize: '10px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', padding: '1px 6px' }}>
                <Store size={10} style={{ display: 'inline', marginRight: '3px' }} />
                Logroño ({settings.postalCode})
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 12px',
                  background: isActive ? '#000000' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  width: '100%',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '13px',
                }}
              >
                <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: isActive ? '#ffffff' : '#000000',
                      color: isActive ? '#000000' : '#ffffff',
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '12px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Stats in Sidebar */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px',
          marginTop: 'auto',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Menú Semanal
            </span>
            <span className="price-text" style={{ fontSize: '13px', color: '#0f172a' }}>
              {menuTotalCost.toFixed(2)} €
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Lista Compra
            </span>
            <span className="price-text" style={{ fontSize: '14px', color: '#000000', fontWeight: '800' }}>
              {shoppingTotalCost.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Cloud Sync Status */}
        <button
          onClick={() => syncToCloud()}
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
        >
          <RefreshCw
            size={13}
            style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}
          />
          <span>{syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'synced' ? 'Sincronizado' : `Sync (${settings.syncCode})`}</span>
        </button>
      </aside>

      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: '#000000',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UtensilsCrossed size={16} />
          </div>
          <div>
            <h1 style={{ fontSize: '14px', fontWeight: '800', lineHeight: 1.1, color: '#0f172a' }}>
              {activeTab === 'menu' && 'Menú Semanal'}
              {activeTab === 'dishes' && 'Banco de Platos'}
              {activeTab === 'shopping' && 'Lista de la Compra'}
              {activeTab === 'settings' && 'Ajustes'}
            </h1>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>
              Mercadona Logroño ({settings.postalCode})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'shopping' && shoppingTotalCost > 0 && (
            <div style={{
              background: '#000000',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              <span className="price-text">{shoppingTotalCost.toFixed(2)} €</span>
            </div>
          )}
          <button
            onClick={() => syncToCloud()}
            className="btn btn-ghost btn-icon"
            title="Sincronizar"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            {syncStatus === 'synced' ? (
              <CheckCircle2 size={16} color="#000000" />
            ) : syncStatus === 'error' ? (
              <AlertCircle size={16} color="#dc2626" />
            ) : (
              <RefreshCw
                size={16}
                color="#64748b"
                style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Classic Clean White & Black) */}
      <nav className="mobile-nav-bar" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon-container">
                <Icon size={19} color={isActive ? '#000000' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 1.75} />
              </div>
              <span style={{ color: isActive ? '#000000' : '#94a3b8', fontWeight: isActive ? '700' : '500' }}>
                {item.shortLabel}
              </span>
              {item.badge && <span className="nav-tab-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
