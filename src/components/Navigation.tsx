'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  Settings,
  RefreshCw,
  Sparkles,
  Store,
  Share2,
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
      label: 'Lista Compra',
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
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', padding: '0 8px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <UtensilsCrossed size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', lineHeight: 1.2 }}>Menú & Compra</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="badge badge-green" style={{ fontSize: '10px', padding: '1px 6px' }}>
                <Store size={10} /> Mercadona CP {settings.postalCode}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
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
                  padding: '12px 14px',
                  background: isActive ? 'var(--accent-green-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent-green-light)' : 'var(--text-muted)',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid transparent',
                  position: 'relative',
                  width: '100%',
                }}
              >
                <Icon size={20} color={isActive ? '#10b981' : '#94a3b8'} />
                <span style={{ fontSize: '14px', fontWeight: isActive ? '700' : '500' }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--accent-green)',
                      color: '#070a12',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
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
        <div className="glass-card" style={{ padding: '16px', marginTop: 'auto', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estimación Menú
            </span>
            <span className="price-text" style={{ fontSize: '15px', color: 'var(--accent-gold)' }}>
              {menuTotalCost.toFixed(2)} €
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lista Compra
            </span>
            <span className="price-text" style={{ fontSize: '15px', color: 'var(--accent-green-light)' }}>
              {shoppingTotalCost.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Cloud Sync Status */}
        <button
          onClick={() => syncToCloud()}
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '12px', padding: '8px 12px', justifyContent: 'center' }}
        >
          <RefreshCw
            size={14}
            className={syncStatus === 'syncing' ? 'spin-anim' : ''}
            style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}
          />
          {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'synced' ? 'Sincronizado ✓' : `Sync (${settings.syncCode})`}
        </button>
      </aside>

      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
          }}>
            <UtensilsCrossed size={18} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', lineHeight: 1.1 }}>
              {activeTab === 'menu' && 'Menú Semanal'}
              {activeTab === 'dishes' && 'Banco de Platos'}
              {activeTab === 'shopping' && 'Lista de la Compra'}
              {activeTab === 'settings' && 'Ajustes & Sincronización'}
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Mercadona CP {settings.postalCode} • {settings.syncCode}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'shopping' && shoppingTotalCost > 0 && (
            <div className="badge badge-green" style={{ fontSize: '13px' }}>
              <span className="price-text">{shoppingTotalCost.toFixed(2)} €</span>
            </div>
          )}
          <button
            onClick={() => syncToCloud()}
            className="btn btn-ghost btn-icon"
            title="Sincronizar con la nube"
            style={{ width: '36px', height: '36px' }}
          >
            {syncStatus === 'synced' ? (
              <CheckCircle2 size={18} color="#10b981" />
            ) : syncStatus === 'error' ? (
              <AlertCircle size={18} color="#f43f5e" />
            ) : (
              <RefreshCw
                size={18}
                style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (iOS Native Style) */}
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
                <Icon size={20} />
              </div>
              <span>{item.shortLabel}</span>
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
