'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MercadonaProduct, ShoppingListItem } from '@/types';
import MercadonaSearchModal from './MercadonaSearchModal';
import confetti from 'canvas-confetti';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Share2,
  Copy,
  Store,
  Sparkles,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';

export default function ShoppingListView() {
  const {
    shoppingList,
    toggleShoppingItem,
    removeShoppingItem,
    updateShoppingItemQuantity,
    clearCheckedShoppingItems,
    clearAllShoppingItems,
    addShoppingItem,
    shoppingTotalCost,
    shoppingPendingCost,
    shoppingCheckedCost,
    checkedItemsCount,
    totalItemsCount,
    setActiveTab,
    settings,
  } = useApp();

  const [isMercadonaModalOpen, setIsMercadonaModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [filterView, setFilterView] = useState<'all' | 'pending' | 'checked'>('all');

  const handleToggle = (item: ShoppingListItem) => {
    toggleShoppingItem(item.id);
    if (!item.checked && checkedItemsCount + 1 === totalItemsCount && totalItemsCount > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#f59e0b']
        });
      } catch (e) {
        // Ignore
      }
    }
  };

  const handleAddProduct = (product: MercadonaProduct) => {
    addShoppingItem(
      product.displayName,
      1,
      product.packaging || 'ud',
      product,
      product.categoryName || 'Supermercado'
    );
  };

  const handleCopyList = () => {
    if (shoppingList.length === 0) return;

    let text = `🛒 *Lista de la Compra (Mercadona CP ${settings.postalCode})*\n\n`;
    const pending = shoppingList.filter(i => !i.checked);
    const completed = shoppingList.filter(i => i.checked);

    if (pending.length > 0) {
      text += `*Por comprar (${pending.length}):*\n`;
      pending.forEach(item => {
        const price = (item.mercadonaProduct?.price ?? item.estimatedPrice ?? 0) * (item.quantity || 1);
        text += `◻️ ${item.quantity > 1 ? `[${item.quantity}x] ` : ''}${item.name} (${price.toFixed(2)} €)\n`;
      });
      text += `\n`;
    }

    if (completed.length > 0) {
      text += `*En el carrito (${completed.length}):*\n`;
      completed.forEach(item => {
        text += `✅ ~${item.name}~\n`;
      });
      text += `\n`;
    }

    text += `💰 *Total estimado:* ${shoppingTotalCost.toFixed(2)} €`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Group by category
  const categoriesMap = new Map<string, ShoppingListItem[]>();
  const displayedItems = shoppingList.filter(item => {
    if (filterView === 'pending') return !item.checked;
    if (filterView === 'checked') return item.checked;
    return true;
  });

  for (const item of displayedItems) {
    const cat = item.category || 'Despensa & Varios';
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, []);
    }
    categoriesMap.get(cat)!.push(item);
  }

  const progressPercentage = totalItemsCount > 0 ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 16px 40px 16px' }}>
      {/* Header and Summary */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-green" style={{ fontSize: '11px' }}>
                <Store size={12} /> Precios Mercadona CP {settings.postalCode}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {checkedItemsCount} de {totalItemsCount} comprados
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>
              Lista de la Compra
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsMercadonaModalOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '9px 16px' }}
            >
              <Plus size={16} />
              <span>Añadir producto</span>
            </button>

            <button
              onClick={handleCopyList}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '9px 14px' }}
              title="Copiar lista para WhatsApp"
            >
              {copiedNotification ? (
                <>
                  <Check size={16} color="var(--accent-green)" />
                  <span style={{ color: 'var(--accent-green)' }}>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Total Cost & Progress Card */}
        {totalItemsCount > 0 && (
          <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: '14px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Total Compra
                </span>
                <div className="price-text" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {shoppingTotalCost.toFixed(2)} €
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Por Pagar (Carrito)
                </span>
                <div className="price-text" style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-green-light)', marginTop: '2px' }}>
                  {shoppingCheckedCost.toFixed(2)} €
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Pendiente
                </span>
                <div className="price-text" style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-gold)', marginTop: '2px' }}>
                  {shoppingPendingCost.toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ position: 'relative', width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${progressPercentage}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
              <span>{progressPercentage}% completado</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {checkedItemsCount > 0 && (
                  <button
                    onClick={clearCheckedShoppingItems}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Borrar comprados
                  </button>
                )}
                <button
                  onClick={clearAllShoppingItems}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                >
                  Vaciar lista
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter View Selector */}
        {totalItemsCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setFilterView('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: filterView === 'all' ? 'var(--accent-green)' : 'var(--bg-secondary)',
                color: filterView === 'all' ? '#070a12' : 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Todos ({totalItemsCount})
            </button>
            <button
              onClick={() => setFilterView('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: filterView === 'pending' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: filterView === 'pending' ? '#070a12' : 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Pendientes ({totalItemsCount - checkedItemsCount})
            </button>
            <button
              onClick={() => setFilterView('checked')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: filterView === 'checked' ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                color: filterView === 'checked' ? '#070a12' : 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Comprados ({checkedItemsCount})
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {shoppingList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-subtle)'
        }}>
          <ShoppingCart size={48} color="var(--accent-green)" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
            Tu lista de la compra está vacía
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            Ve al <strong>Menú Semanal</strong> y pulsa el botón &quot;Generar Lista de la Compra&quot; para añadir automáticamente los ingredientes de tus comidas y cenas con precios de Mercadona.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('menu')}
              className="btn btn-primary"
              style={{ padding: '12px 20px' }}
            >
              <span>Ir al Menú Semanal</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => setIsMercadonaModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '12px 18px' }}
            >
              <Plus size={16} />
              <span>Añadir producto suelto</span>
            </button>
          </div>
        </div>
      ) : (
        /* Categorized List of Items */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Array.from(categoriesMap.entries()).map(([categoryName, items]) => (
            <div key={categoryName}>
              {/* Category Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <Store size={15} color="var(--accent-green)" />
                <h4 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  {categoryName}
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item) => {
                  const itemPrice = (item.mercadonaProduct?.price ?? item.estimatedPrice ?? 0);
                  const lineTotal = itemPrice * (item.quantity || 1);

                  return (
                    <div
                      key={item.id}
                      className="glass-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        background: item.checked ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                        border: item.checked ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-subtle)',
                        opacity: item.checked ? 0.65 : 1,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(item)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: item.checked ? 'var(--accent-green)' : 'var(--text-dim)',
                          flexShrink: 0
                        }}
                      >
                        {item.checked ? (
                          <CheckCircle2 size={24} color="#10b981" />
                        ) : (
                          <Circle size={24} />
                        )}
                      </button>

                      {/* Product Thumbnail */}
                      {item.mercadonaProduct?.thumbnail && (
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid var(--border-subtle)'
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.mercadonaProduct.thumbnail}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--text-main)',
                          textDecoration: item.checked ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                          {item.mercadonaProduct?.brand && (
                            <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>
                              {item.mercadonaProduct.brand}
                            </span>
                          )}
                          <span>• {itemPrice > 0 ? `${itemPrice.toFixed(2)} € / ud` : 'Sin precio'}</span>
                          {item.sourceDishNames && item.sourceDishNames.length > 0 && (
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                              {item.sourceDishNames.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={() => updateShoppingItemQuantity(item.id, -1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateShoppingItemQuantity(item.id, 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px'
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Total line price */}
                      <div style={{ textAlign: 'right', minWidth: '60px', flexShrink: 0 }}>
                        <span className="price-text" style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: item.checked ? 'var(--text-dim)' : 'var(--accent-green-light)',
                        }}>
                          {lineTotal > 0 ? `${lineTotal.toFixed(2)} €` : '-'}
                        </span>
                      </div>

                      {/* Remove item */}
                      <button
                        onClick={() => removeShoppingItem(item.id)}
                        className="btn btn-ghost btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--text-dim)', flexShrink: 0 }}
                        title="Eliminar de la lista"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mercadona Search Modal */}
      <MercadonaSearchModal
        isOpen={isMercadonaModalOpen}
        onClose={() => setIsMercadonaModalOpen(false)}
        onSelectProduct={handleAddProduct}
        title="Añadir a la lista de la compra"
      />
    </div>
  );
}
