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
  Check
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
    if (filterType !== 'todos') {
      if (dish.type !== 'ambas' && dish.type !== filterType) {
        return false;
      }
    }
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="sheet-handle" />

        {/* Header */}
        <div className="modal-header">
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.04em'
            }}>
              {slotType === 'comida' ? '☀️ Comida' : '🌙 Cena'}
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              Elegir para el {dayLabel}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '12px 18px 6px 18px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en tu banco de platos..."
              className="input-field"
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setFilterType('todos')}
              style={{
                background: filterType === 'todos' ? '#000000' : '#ffffff',
                color: filterType === 'todos' ? '#ffffff' : '#64748b',
                border: filterType === 'todos' ? '1px solid #000000' : '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Todos ({dishes.length})
            </button>
            <button
              onClick={() => setFilterType('comida')}
              style={{
                background: filterType === 'comida' ? '#000000' : '#ffffff',
                color: filterType === 'comida' ? '#ffffff' : '#64748b',
                border: filterType === 'comida' ? '1px solid #000000' : '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Comidas
            </button>
            <button
              onClick={() => setFilterType('cena')}
              style={{
                background: filterType === 'cena' ? '#000000' : '#ffffff',
                color: filterType === 'cena' ? '#ffffff' : '#64748b',
                border: filterType === 'cena' ? '1px solid #000000' : '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cenas
            </button>
          </div>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px calc(24px + var(--sab)) 18px' }}>
          {/* Quick Options */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Opciones rápidas
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginTop: '6px' }}>
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
                    padding: '8px 10px',
                    background: currentCustomName === opt.label ? '#000000' : '#ffffff',
                    color: currentCustomName === opt.label ? '#ffffff' : '#0f172a',
                    borderColor: currentCustomName === opt.label ? '#000000' : '#cbd5e1',
                  }}
                >
                  <opt.icon size={15} />
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
            style={{ width: '100%', marginBottom: '14px', padding: '10px' }}
          >
            <Plus size={16} />
            <span>Crear nuevo plato</span>
          </button>

          {/* Dishes list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredDishes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b' }}>
                <p style={{ fontSize: '13px' }}>No hay platos en esta categoría.</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Pulsa &quot;Crear nuevo plato&quot; para añadir el primero.
                </p>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #000000' : '1px solid #e2e8f0',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#f1f5f9',
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
                        <UtensilsCrossed size={18} color="#64748b" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0f172a',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {dish.name}
                      </h4>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        {dish.ingredients.length} alimentos de Mercadona
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span className="price-text" style={{ fontSize: '13px', color: '#000000', fontWeight: '800' }}>
                        {dish.estimatedCost > 0 ? `${dish.estimatedCost.toFixed(2)} €` : '0.00 €'}
                      </span>
                      {isSelected && (
                        <Check size={16} strokeWidth={3} color="#000000" />
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
