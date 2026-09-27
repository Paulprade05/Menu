'use client';

import React, { useState, useEffect } from 'react';
import { Dish, Ingredient, MealType, MercadonaProduct } from '@/types';
import { useApp } from '@/context/AppContext';
import MercadonaSearchModal from './MercadonaSearchModal';
import {
  X,
  Plus,
  Trash2,
  Store,
  Sparkles,
  UtensilsCrossed,
  Tag,
  DollarSign,
  Info
} from 'lucide-react';

interface DishEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishToEdit?: Dish | null;
}

const COMMON_TAGS = [
  'Rápido',
  'Saludable',
  'Económico',
  'Fácil',
  'Pasta',
  'Pescado',
  'Carne',
  'Legumbres',
  'Verdura',
  'Arroz',
  'Guiso',
  'Horno',
  'Keto',
  'Fitness',
];

export default function DishEditorModal({
  isOpen,
  onClose,
  dishToEdit,
}: DishEditorModalProps) {
  const { addDish, updateDish } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<MealType>('comida');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Manual ingredient add fields
  const [manualIngName, setManualIngName] = useState('');
  const [manualIngQty, setManualIngQty] = useState(1);
  const [manualIngUnit, setManualIngUnit] = useState('ud');
  const [manualIngPrice, setManualIngPrice] = useState('0');

  // Mercadona search modal trigger
  const [isMercadonaModalOpen, setIsMercadonaModalOpen] = useState(false);

  useEffect(() => {
    if (dishToEdit) {
      setName(dishToEdit.name);
      setType(dishToEdit.type);
      setTags(dishToEdit.tags || []);
      setNotes(dishToEdit.notes || '');
      setImageUrl(dishToEdit.imageUrl || '');
      setIngredients(dishToEdit.ingredients || []);
    } else {
      setName('');
      setType('comida');
      setTags(['Saludable']);
      setNotes('');
      setImageUrl('');
      setIngredients([]);
    }
  }, [dishToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleAddMercadonaProduct = (product: MercadonaProduct) => {
    const newIngredient: Ingredient = {
      id: 'ing-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: product.displayName,
      quantity: 1,
      unit: product.packaging || 'ud',
      estimatedPrice: product.price || 0,
      mercadonaProduct: product,
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const handleAddManualIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIngName.trim()) return;

    const priceNum = parseFloat(manualIngPrice) || 0;
    const newIngredient: Ingredient = {
      id: 'ing-man-' + Date.now(),
      name: manualIngName.trim(),
      quantity: manualIngQty || 1,
      unit: manualIngUnit,
      estimatedPrice: priceNum,
    };
    setIngredients(prev => [...prev, newIngredient]);
    setManualIngName('');
    setManualIngQty(1);
    setManualIngPrice('0');
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateIngredientQty = (id: string, delta: number) => {
    setIngredients(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = Math.max(1, (i.quantity || 1) + delta);
      return { ...i, quantity: newQty };
    }));
  };

  // Calculate live total cost
  const totalCost = ingredients.reduce((acc, ing) => {
    const p = ing.mercadonaProduct?.price ?? ing.estimatedPrice ?? 0;
    return acc + (p * (ing.quantity || 1));
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (dishToEdit) {
      updateDish(dishToEdit.id, {
        name: name.trim(),
        type,
        tags,
        notes,
        imageUrl: imageUrl.trim() || undefined,
        ingredients,
      });
    } else {
      addDish({
        name: name.trim(),
        type,
        tags,
        notes,
        imageUrl: imageUrl.trim() || undefined,
        ingredients,
      });
    }
    onClose();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
          <div className="sheet-handle" />

          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--accent-green-subtle)',
                color: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UtensilsCrossed size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
                  {dishToEdit ? 'Editar plato y alimentos' : 'Nuevo plato para el banco'}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Añade ingredientes de Mercadona para calcular el coste y la lista
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px 20px' }}>
            {/* Dish Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Nombre del plato *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Lentejas con verduras y chorizo, Merluza en salsa..."
                className="input-field"
                style={{ fontSize: '15px', fontWeight: '600' }}
              />
            </div>

            {/* Meal Type */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                ¿Para qué momento es ideal?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setType('comida')}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: type === 'comida' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    background: type === 'comida' ? 'var(--accent-gold-subtle)' : 'var(--bg-secondary)',
                    color: type === 'comida' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>☀️ Comida</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('cena')}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: type === 'cena' ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                    background: type === 'cena' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                    color: type === 'cena' ? '#a78bfa' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>🌙 Cena</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('ambas')}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: type === 'ambas' ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)',
                    background: type === 'ambas' ? 'var(--accent-green-subtle)' : 'var(--bg-secondary)',
                    color: type === 'ambas' ? 'var(--accent-green-light)' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>✨ Ambas</span>
                </button>
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Etiquetas / Categorías
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {COMMON_TAGS.map(tag => {
                  const isChecked = tags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        background: isChecked ? 'var(--accent-green-subtle)' : 'var(--bg-secondary)',
                        color: isChecked ? 'var(--accent-green-light)' : 'var(--text-dim)',
                        border: isChecked ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Añadir otra etiqueta..."
                  className="input-field"
                  style={{ height: '36px', fontSize: '13px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="btn btn-secondary"
                  style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
                >
                  Añadir
                </button>
              </div>
            </div>

            {/* Ingredients Section - HIGHLIGHTED FEATURE */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Store size={18} color="var(--accent-green)" />
                    Alimentos e Ingredientes necesarios ({ingredients.length})
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Al guardar, estos alimentos formarán tu lista de la compra automática
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase' }}>
                    Coste estimado
                  </span>
                  <span className="price-text" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-green-light)' }}>
                    {totalCost.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Action: Open Mercadona search */}
              <button
                type="button"
                onClick={() => setIsMercadonaModalOpen(true)}
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '12px', padding: '10px 14px' }}
              >
                <Plus size={18} />
                <span>Buscar y añadir producto de Mercadona</span>
              </button>

              {/* Ingredients list */}
              {ingredients.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-subtle)',
                  color: 'var(--text-dim)',
                  fontSize: '13px'
                }}>
                  No has añadido ingredientes todavía. Usa el botón superior para buscar en Mercadona o añade uno manual abajo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: 'var(--bg-card)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      {/* Product image if from Mercadona */}
                      {ing.mercadonaProduct?.thumbnail && (
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: '#ffffff',
                          flexShrink: 0
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ing.mercadonaProduct.thumbnail}
                            alt={ing.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ing.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {ing.mercadonaProduct ? (
                            <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>
                              Mercadona • {ing.mercadonaProduct.price.toFixed(2)} €/ud
                            </span>
                          ) : (
                            <span>{ing.estimatedPrice > 0 ? `${ing.estimatedPrice.toFixed(2)} €` : 'Sin precio'}</span>
                          )}
                          <span>• {ing.unit}</span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateIngredientQty(ing.id, -1)}
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
                            fontSize: '14px',
                            fontWeight: '700'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>
                          {ing.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateIngredientQty(ing.id, 1)}
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
                            fontSize: '14px',
                            fontWeight: '700'
                          }}
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-rose)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '4px'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional manual ingredient adder */}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  O añadir ingrediente genérico a mano:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '6px' }}>
                  <input
                    type="text"
                    value={manualIngName}
                    onChange={(e) => setManualIngName(e.target.value)}
                    placeholder="Ej: Sal, Agua, Ajo..."
                    className="input-field"
                    style={{ height: '34px', fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    min="1"
                    value={manualIngQty}
                    onChange={(e) => setManualIngQty(parseInt(e.target.value) || 1)}
                    placeholder="Cant."
                    className="input-field"
                    style={{ height: '34px', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    value={manualIngUnit}
                    onChange={(e) => setManualIngUnit(e.target.value)}
                    placeholder="Unidad (ud, g...)"
                    className="input-field"
                    style={{ height: '34px', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddManualIngredient}
                    className="btn btn-secondary"
                    style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Notes or Recipe Steps */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Notas de preparación o receta (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tiempo de cocción, trucos o enlace a la receta..."
                rows={3}
                className="input-field"
                style={{ resize: 'vertical', fontSize: '13px' }}
              />
            </div>

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '12px', fontSize: '15px' }}
              >
                {dishToEdit ? 'Guardar Cambios' : 'Guardar en Banco de Platos'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mercadona live search modal */}
      <MercadonaSearchModal
        isOpen={isMercadonaModalOpen}
        onClose={() => setIsMercadonaModalOpen(false)}
        onSelectProduct={handleAddMercadonaProduct}
        title="Añadir ingrediente de Mercadona"
      />
    </>
  );
}
