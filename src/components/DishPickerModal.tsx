'use client';

import React, { useState } from 'react';
import { Dish, MealType } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  X,
  Search,
  Plus,
  UtensilsCrossed,
  Pizza,
  Package,
  Sparkles,
  Check,
  Tag
} from 'lucide-react';

interface DishPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLabel: string;
  slotType: 'comida' | 'cena';
  currentDishId: string | null;
  currentCustomName?: string;
  onSelectDish: (dishId: string | null, customName?: string) => void;
  onCreateNewDish: () => void;
}

export default function DishPickerModal({
  isOpen,
  onClose,
  dayLabel,
  slotType,
  currentDishId,
  currentCustomName,
  onSelectDish,
  onCreateNewDish,
}: DishPickerModalProps) {
  const { dishes } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MealType | 'todos'>(slotType);

  if (!isOpen) return null;

  const filteredDishes = dishes.filter(dish => {
    // Type filter
    if (filterType !== 'todos') {
      if (dish.type !== 'ambas' && dish.type !== filterType) {
        return false;
      }
    }
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = dish.name.toLowerCase().includes(q);
      const matchTags = dish.tags.some(t => t.toLowerCase().includes(q));
      const matchIng = dish.ingredients.some(i => i.name.toLowerCase().includes(q));
      return matchName || matchTags || matchIng;
    }
    return true;
  });

  const quickCustomOptions = [
    { label: 'Comer fuera / Restaurante 🍕', icon: Pizza },
    { label: 'Sobras de ayer / Batch cooking 🥡', icon: Package },
    { label: 'Comida libre / Improvisada ✨', icon: Sparkles },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
        <div className="sheet-handle" />

        {/* Header */}
        <div className="modal-header">
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: slotType === 'comida' ? 'var(--accent-gold)' : 'var(--accent-purple)',
              letterSpacing: '0.05em'
            }}>
              {slotType === 'comida' ? '☀️ Almuerzo / Comida' : '🌙 Cena'}
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
              Elegir plato para el {dayLabel}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '14px 20px 8px 20px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en tu banco de platos..."
              className="input-field"
              style={{ paddingLeft: '38px', height: '42px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setFilterType('todos')}
              style={{
                background: filterType === 'todos' ? 'var(--accent-green-subtle)' : 'var(--bg-tertiary)',
                color: filterType === 'todos' ? 'var(--accent-green-light)' : 'var(--text-dim)',
                border: filterType === 'todos' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Todos ({dishes.length})
            </button>
            <button
              onClick={() => setFilterType('comida')}
              style={{
                background: filterType === 'comida' ? 'var(--accent-gold-subtle)' : 'var(--bg-tertiary)',
                color: filterType === 'comida' ? 'var(--accent-gold)' : 'var(--text-dim)',
                border: filterType === 'comida' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Comidas
            </button>
            <button
              onClick={() => setFilterType('cena')}
              style={{
                background: filterType === 'cena' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-tertiary)',
                color: filterType === 'cena' ? '#a78bfa' : 'var(--text-dim)',
                border: filterType === 'cena' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cenas
            </button>
          </div>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px 20px' }}>
          {/* Quick Options */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Opciones especiales
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '6px' }}>
              {quickCustomOptions.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => {
                    onSelectDish(null, opt.label);
                    onClose();
                  }}
                  className="btn btn-secondary"
                  style={{
                    justifyContent: 'flex-start',
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: currentCustomName === opt.label ? 'var(--accent-green-subtle)' : 'var(--bg-tertiary)',
                    borderColor: currentCustomName === opt.label ? 'var(--accent-green)' : 'var(--border-subtle)',
                  }}
                >
                  <opt.icon size={16} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Create New Dish button */}
          <button
            onClick={() => {
              onClose();
              onCreateNewDish();
            }}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '16px', padding: '12px' }}
          >
            <Plus size={18} />
            <span>Crear nuevo plato para el banco</span>
          </button>

          {/* Dishes list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredDishes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
                <p style={{ fontSize: '14px' }}>No hay platos que coincidan con la búsqueda</p>
              </div>
            ) : (
              filteredDishes.map((dish) => {
                const isSelected = currentDishId === dish.id;
                return (
                  <div
                    key={dish.id}
                    onClick={() => {
                      onSelectDish(dish.id);
                      onClose();
                    }}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--accent-green-subtle)' : 'var(--bg-card)',
                    }}
                  >
                    {/* Dish image or placeholder */}
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: 'var(--bg-tertiary)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {dish.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : (
                        <UtensilsCrossed size={22} color="var(--accent-green)" />
                      )}
                    </div>

                    {/* Dish text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: dish.type === 'comida' ? 'var(--accent-gold)' : dish.type === 'cena' ? '#a78bfa' : 'var(--accent-green)',
                        }}>
                          {dish.type === 'comida' ? 'Comida' : dish.type === 'cena' ? 'Cena' : 'Comida / Cena'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          • {dish.ingredients.length} ing.
                        </span>
                      </div>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {dish.name}
                      </h4>
                      {dish.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {dish.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '10px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-dim)',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cost and select icon */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span className="price-text" style={{ fontSize: '14px', color: 'var(--accent-green-light)', fontWeight: '700' }}>
                        {dish.estimatedCost > 0 ? `${dish.estimatedCost.toFixed(2)} €` : '0.00 €'}
                      </span>
                      {isSelected ? (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--accent-green)',
                          color: '#070a12',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Elegir</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
