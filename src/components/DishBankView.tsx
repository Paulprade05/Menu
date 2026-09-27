'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Dish, MealType } from '@/types';
import DishEditorModal from './DishEditorModal';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Store,
  Tag,
  Edit2,
  Trash2,
  DollarSign,
  CalendarPlus,
  Sparkles,
  Info
} from 'lucide-react';

export default function DishBankView() {
  const { dishes, deleteDish, setActiveTab } = useApp();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MealType | 'todos'>('todos');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(dishes.flatMap(d => d.tags || [])));

  const filteredDishes = dishes.filter(dish => {
    if (filterType !== 'todos') {
      if (dish.type !== 'ambas' && dish.type !== filterType) return false;
    }
    if (selectedTag) {
      if (!dish.tags.includes(selectedTag)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = dish.name.toLowerCase().includes(q);
      const matchIng = dish.ingredients.some(i => i.name.toLowerCase().includes(q));
      const matchTags = dish.tags.some(t => t.toLowerCase().includes(q));
      return matchName || matchIng || matchTags;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingDish(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (dish: Dish) => {
    setEditingDish(dish);
    setIsEditorOpen(true);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 40px 16px' }}>
      {/* Top Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-green" style={{ fontSize: '11px' }}>
              <Store size={12} /> Base de datos de platos
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {dishes.length} platos guardados
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>
            Banco de Platos & Recetas
          </h2>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{ padding: '10px 18px', fontSize: '14px' }}
        >
          <Plus size={18} />
          <span>Añadir nuevo plato</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '20px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por plato, ingrediente o etiqueta (ej: salmón, pasta, keto)..."
            className="input-field"
            style={{ paddingLeft: '40px', height: '44px', fontSize: '14px' }}
          />
        </div>

        {/* Type Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilterType('todos')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              background: filterType === 'todos' ? 'var(--accent-green)' : 'var(--bg-secondary)',
              color: filterType === 'todos' ? '#070a12' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Todos ({dishes.length})
          </button>
          <button
            onClick={() => setFilterType('comida')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              background: filterType === 'comida' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
              color: filterType === 'comida' ? '#070a12' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            ☀️ Comidas
          </button>
          <button
            onClick={() => setFilterType('cena')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              background: filterType === 'cena' ? '#8b5cf6' : 'var(--bg-secondary)',
              color: filterType === 'cena' ? '#ffffff' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            🌙 Cenas
          </button>

          {/* Tag pills */}
          {allTags.slice(0, 6).map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                background: selectedTag === tag ? 'var(--accent-green-subtle)' : 'var(--bg-tertiary)',
                color: selectedTag === tag ? 'var(--accent-green-light)' : 'var(--text-dim)',
                border: selectedTag === tag ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
      }}>
        {filteredDishes.map((dish) => (
          <div
            key={dish.id}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {/* Top Image or Header */}
            {dish.imageUrl ? (
              <div style={{ position: 'relative', height: '140px', width: '100%', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dish.imageUrl}
                  alt={dish.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(7, 10, 18, 0.9) 0%, transparent 60%)'
                }} />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  display: 'flex',
                  gap: '6px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: dish.type === 'comida' ? 'rgba(245, 158, 11, 0.9)' : dish.type === 'cena' ? 'rgba(139, 92, 246, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                  }}>
                    {dish.type === 'comida' ? 'Comida' : dish.type === 'cena' ? 'Cena' : 'Comida / Cena'}
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', right: '12px' }}>
                  <span className="price-text" style={{
                    fontSize: '17px',
                    fontWeight: '800',
                    color: '#ffffff',
                    textShadow: '0 2px 6px rgba(0,0,0,0.8)'
                  }}>
                    {dish.estimatedCost > 0 ? `${dish.estimatedCost.toFixed(2)} €` : '0.00 €'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '16px 16px 0 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: dish.type === 'comida' ? 'var(--accent-gold-subtle)' : dish.type === 'cena' ? 'rgba(139, 92, 246, 0.15)' : 'var(--accent-green-subtle)',
                  color: dish.type === 'comida' ? 'var(--accent-gold)' : dish.type === 'cena' ? '#a78bfa' : 'var(--accent-green-light)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {dish.type === 'comida' ? 'Comida' : dish.type === 'cena' ? 'Cena' : 'Comida / Cena'}
                </span>
                <span className="price-text" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-green-light)' }}>
                  {dish.estimatedCost > 0 ? `${dish.estimatedCost.toFixed(2)} €` : '0.00 €'}
                </span>
              </div>
            )}

            {/* Body */}
            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)', lineHeight: 1.3 }}>
                {dish.name}
              </h3>

              {/* Tags */}
              {dish.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                  {dish.tags.map(t => (
                    <span
                      key={t}
                      style={{
                        fontSize: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-dim)',
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredients Summary */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '14px',
                border: '1px solid var(--border-subtle)',
                marginTop: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>Ingredientes ({dish.ingredients.length})</span>
                  <span>Mercadona</span>
                </div>
                {dish.ingredients.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Sin ingredientes añadidos aún
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {dish.ingredients.slice(0, 3).map(ing => (
                      <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px' }}>
                          • {ing.name}
                        </span>
                        <span className="price-text" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {(ing.mercadonaProduct?.price ?? ing.estimatedPrice ?? 0).toFixed(2)} €
                        </span>
                      </div>
                    ))}
                    {dish.ingredients.length > 3 && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '2px', fontWeight: '500' }}>
                        + {dish.ingredients.length - 3} ingredientes más
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleOpenEdit(dish)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                >
                  <Edit2 size={14} />
                  <span>Editar / Añadir alimentos</span>
                </button>
                <button
                  onClick={() => deleteDish(dish.id)}
                  className="btn btn-ghost btn-icon"
                  style={{ width: '34px', height: '34px', color: 'var(--accent-rose)' }}
                  title="Eliminar plato"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDishes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <UtensilsCrossed size={48} color="var(--border-subtle)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
            No se encontraron platos
          </h3>
          <p style={{ fontSize: '13px', maxWidth: '340px', margin: '0 auto 16px auto' }}>
            Prueba a cambiar los filtros o crea un nuevo plato y añade sus alimentos de Mercadona.
          </p>
          <button onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={16} />
            <span>Crear primer plato</span>
          </button>
        </div>
      )}

      {/* Dish Editor Modal */}
      <DishEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        dishToEdit={editingDish}
      />
    </div>
  );
}
