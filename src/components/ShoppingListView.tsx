'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MercadonaProduct, ShoppingListItem } from '@/types';
import MercadonaSearchModal from './MercadonaSearchModal';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Share2,
  Store,
  ArrowRight,
  Check
} from 'lucide-react';

export default function ShoppingListView() {
  const {
    shoppingList,
    toggleShoppingItem,
    removeShoppingItem,
    updateShoppingItemQuantity,
    updateShoppingItemPrice,
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

    let text = `🛒 *Lista de la Compra Mercadona Logroño (CP ${settings.postalCode})*\n\n`;
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
      setTimeout(() => setCopiedNotification(false), 2000);
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
    <div className="view-container">
      {/* Header and Summary */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Mercadona Logroño ({settings.postalCode})
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {checkedItemsCount} de {totalItemsCount} comprados
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Lista de la Compra
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '360px' }}>
            <button
              onClick={() => setIsMercadonaModalOpen(true)}
              className="btn btn-primary"
              style={{ flex: 1, minWidth: '140px', fontSize: '12px', padding: '9px 14px' }}
            >
              <Plus size={15} />
              <span>Añadir producto</span>
            </button>

            {totalItemsCount > 0 && (
              <button
                onClick={handleCopyList}
                className="btn btn-secondary"
                style={{ flex: 1, minWidth: '110px', fontSize: '12px', padding: '9px 12px' }}
                title="Copiar lista para WhatsApp"
              >
                {copiedNotification ? (
                  <>
                    <Check size={15} color="#000000" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={15} />
                    <span>Compartir</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Total Cost & Progress Card */}
        {totalItemsCount > 0 && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px 18px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '14px',
              marginBottom: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                  Total Compra
                </span>
                <div className="price-text" style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                  {shoppingTotalCost.toFixed(2)} €
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                  En Carrito
                </span>
                <div className="price-text" style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  {shoppingCheckedCost.toFixed(2)} €
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                  Pendiente
                </span>
                <div className="price-text" style={{ fontSize: '18px', fontWeight: '700', color: '#64748b', marginTop: '2px' }}>
                  {shoppingPendingCost.toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ position: 'relative', width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${progressPercentage}%`,
                background: '#000000',
                borderRadius: '4px',
                transition: 'width 0.2s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
              <span>{progressPercentage}% completado</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {checkedItemsCount > 0 && (
                  <button
                    onClick={clearCheckedShoppingItems}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Borrar comprados
                  </button>
                )}
                <button
                  onClick={clearAllShoppingItems}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                >
                  Vaciar lista
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter View Selector */}
        {totalItemsCount > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <button
              onClick={() => setFilterView('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterView === 'all' ? '#000000' : '#ffffff',
                color: filterView === 'all' ? '#ffffff' : '#64748b',
                border: filterView === 'all' ? '1px solid #000000' : '1px solid #cbd5e1',
              }}
            >
              Todos ({totalItemsCount})
            </button>
            <button
              onClick={() => setFilterView('pending')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterView === 'pending' ? '#000000' : '#ffffff',
                color: filterView === 'pending' ? '#ffffff' : '#64748b',
                border: filterView === 'pending' ? '1px solid #000000' : '1px solid #cbd5e1',
              }}
            >
              Pendientes ({totalItemsCount - checkedItemsCount})
            </button>
            <button
              onClick={() => setFilterView('checked')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: filterView === 'checked' ? '#000000' : '#ffffff',
                color: filterView === 'checked' ? '#ffffff' : '#64748b',
                border: filterView === 'checked' ? '1px solid #000000' : '1px solid #cbd5e1',
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
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <ShoppingCart size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Tu lista de la compra está vacía
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Ve al <strong>Menú Semanal</strong> y pulsa &quot;Generar Lista de la Compra&quot; o añade productos sueltos usando el buscador de Mercadona.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('menu')}
              className="btn btn-primary"
              style={{ padding: '9px 16px', fontSize: '12px' }}
            >
              <span>Ir al Menú Semanal</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setIsMercadonaModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '9px 16px', fontSize: '12px' }}
            >
              <Plus size={14} />
              <span>Añadir producto suelto</span>
            </button>
          </div>
        </div>
      ) : (
        /* Categorized Items List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Array.from(categoriesMap.entries()).map(([categoryName, items]) => (
            <div key={categoryName}>
              {/* Category Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <Store size={14} color="#0f172a" />
                <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
                  {categoryName}
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>
                  {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item) => {
                  const itemPrice = item.estimatedPrice !== undefined ? item.estimatedPrice : (item.mercadonaProduct?.price ?? 0);
                  const lineTotal = itemPrice * (item.quantity || 1);

                  return (
                    <div
                      key={item.id}
                      className={`shopping-item-card ${item.checked ? 'is-checked' : ''}`}
                    >
                      {/* Top Row: Checkbox, Thumbnail, Full-width Name, Delete button */}
                      <div className="shopping-item-top-row">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleShoppingItem(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: item.checked ? '#000000' : '#94a3b8',
                            flexShrink: 0
                          }}
                        >
                          {item.checked ? (
                            <CheckCircle2 size={22} color="#000000" />
                          ) : (
                            <Circle size={22} />
                          )}
                        </button>

                        {/* Product Thumbnail */}
                        {item.mercadonaProduct?.thumbnail && (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            background: '#f8fafc',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid #e2e8f0'
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
                            fontSize: '13px',
                            fontWeight: '600',
                            lineHeight: 1.3,
                            color: '#0f172a',
                            textDecoration: item.checked ? 'line-through' : 'none',
                          }}>
                            {item.name}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
                            {item.mercadonaProduct?.brand && (
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                {item.mercadonaProduct.brand}
                              </span>
                            )}
                            <span>• {itemPrice > 0 ? `${itemPrice.toFixed(2)} €/ud` : 'Sin precio'}</span>
                            {item.sourceDishNames && item.sourceDishNames.length > 0 && (
                              <span style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '10px' }}>
                                {item.sourceDishNames.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remove item on top row */}
                        <button
                          onClick={() => removeShoppingItem(item.id)}
                          className="btn btn-ghost btn-icon"
                          style={{ width: '28px', height: '28px', color: '#94a3b8', flexShrink: 0, marginLeft: 'auto' }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Bottom Row / Side Row: Stepper and Total Price */}
                      <div className="shopping-item-bottom-row">
                        {/* Quantity Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={() => updateShoppingItemQuantity(item.id, -1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: '700'
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '22px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateShoppingItemQuantity(item.id, 1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: '700'
                            }}
                          >
                            +
                          </button>
                        </div>

                        {/* Unit price editor & Total line price */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            padding: '2px 5px'
                          }} title="Precio por unidad o bandeja. Haz clic para cambiarlo">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={itemPrice || ''}
                              onChange={(e) => updateShoppingItemPrice(item.id, parseFloat(e.target.value) || 0)}
                              style={{
                                width: '48px',
                                border: 'none',
                                background: 'transparent',
                                textAlign: 'right',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#0f172a',
                                outline: 'none',
                                padding: 0
                              }}
                            />
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>€</span>
                          </div>

                          <div style={{ textAlign: 'right', minWidth: '55px' }}>
                            <span className="price-text" style={{
                              fontSize: '14px',
                              fontWeight: '800',
                              color: item.checked ? '#94a3b8' : '#000000',
                            }}>
                              {lineTotal > 0 ? `${lineTotal.toFixed(2)} €` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
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
