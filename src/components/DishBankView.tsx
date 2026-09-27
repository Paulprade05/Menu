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
  Edit2,
  Trash2
} from 'lucide-react';

export default function DishBankView() {
  const { dishes, deleteDish } = useApp();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MealType | 'todos'>('todos');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

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
    <div className="view-container">
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
              Base de Datos
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {dishes.length} {dishes.length === 1 ? 'plato' : 'platos'} guardados
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Banco de Platos & Recetas
          </h2>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary btn-mobile-full"
          style={{ padding: '10px 16px', fontSize: '13px' }}
        >
          <Plus size={16} />
          <span>Añadir nuevo plato</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plato, ingrediente o etiqueta..."
            className="input-field"
            style={{ paddingLeft: '38px', height: '42px' }}
          />
        </div>

        {/* Type Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilterType('todos')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              background: filterType === 'todos' ? '#000000' : '#ffffff',
              color: filterType === 'todos' ? '#ffffff' : '#64748b',
              border: filterType === 'todos' ? '1px solid #000000' : '1px solid #cbd5e1',
            }}
          >
            Todos ({dishes.length})
          </button>
          <button
            onClick={() => setFilterType('comida')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              background: filterType === 'comida' ? '#000000' : '#ffffff',
              color: filterType === 'comida' ? '#ffffff' : '#64748b',
              border: filterType === 'comida' ? '1px solid #000000' : '1px solid #cbd5e1',
            }}
          >
            Comidas
          </button>
          <button
            onClick={() => setFilterType('cena')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              background: filterType === 'cena' ? '#000000' : '#ffffff',
              color: filterType === 'cena' ? '#ffffff' : '#64748b',
              border: filterType === 'cena' ? '1px solid #000000' : '1px solid #cbd5e1',
            }}
          >
            Cenas
          </button>

          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                background: selectedTag === tag ? '#000000' : '#f8fafc',
                color: selectedTag === tag ? '#ffffff' : '#64748b',
                border: selectedTag === tag ? '1px solid #000000' : '1px solid #e2e8f0',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Cards Grid */}
      {filteredDishes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <UtensilsCrossed size={42} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            {dishes.length === 0 ? 'No hay platos guardados en el banco' : 'No se encontraron platos'}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {dishes.length === 0
              ? 'Empieza creando tus comidas y cenas favoritas y añadiendo los alimentos de Mercadona necesarios.'
              : 'Prueba a cambiar el filtro de búsqueda o el tipo de plato.'}
          </p>
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ padding: '9px 18px' }}>
            <Plus size={16} />
            <span>Crear primer plato</span>
          </button>
        </div>
      ) : (
        <div className="responsive-day-grid">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {dish.imageUrl && (
                <div style={{ height: '120px', width: '100%', overflow: 'hidden', background: '#f8fafc' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
              )}

              <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0'
                  }}>
                    {dish.type === 'comida' ? 'Comida' : dish.type === 'cena' ? 'Cena' : 'Comida / Cena'}
                  </span>
                  <span className="price-text" style={{ fontSize: '14px', fontWeight: '800', color: '#000000' }}>
                    {dish.estimatedCost > 0 ? `${dish.estimatedCost.toFixed(2)} €` : '0.00 €'}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>
                  {dish.name}
                </h3>

                {dish.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                    {dish.tags.map(t => (
                      <span
                        key={t}
                        style={{
                          fontSize: '10px',
                          background: '#f8fafc',
                          color: '#64748b',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ingredients summary */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  marginBottom: '12px',
                  marginTop: 'auto',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                    <span>Ingredientes ({dish.ingredients.length})</span>
                    <span>Mercadona</span>
                  </div>
                  {dish.ingredients.length === 0 ? (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                      Sin alimentos añadidos
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {dish.ingredients.slice(0, 3).map(ing => (
                        <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                            • {ing.name}
                          </span>
                          <span className="price-text" style={{ fontSize: '11px', color: '#64748b' }}>
                            {(ing.mercadonaProduct?.price ?? ing.estimatedPrice ?? 0).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                      {dish.ingredients.length > 3 && (
                        <span style={{ fontSize: '10px', color: '#000000', fontWeight: '700', marginTop: '2px' }}>
                          + {dish.ingredients.length - 3} alimentos más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenEdit(dish)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '7px 10px', fontSize: '11px', justifyContent: 'center' }}
                  >
                    <Edit2 size={13} />
                    <span>Editar alimentos</span>
                  </button>
                  <button
                    onClick={() => deleteDish(dish.id)}
                    className="btn btn-ghost btn-icon"
                    style={{ width: '32px', height: '32px', color: '#dc2626' }}
                    title="Eliminar plato"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DishEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        dishToEdit={editingDish}
      />
    </div>
  );
}
