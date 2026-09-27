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
  UtensilsCrossed
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

  const handleUpdateIngredientPrice = (id: string, price: number) => {
    setIngredients(prev => prev.map(i => {
      if (i.id !== id) return i;
      return { ...i, estimatedPrice: Math.max(0, price) };
    }));
  };

  const totalCost = ingredients.reduce((acc, ing) => {
    const p = ing.estimatedPrice !== undefined ? ing.estimatedPrice : (ing.mercadonaProduct?.price ?? 0);
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
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {dishToEdit ? 'Editar plato y alimentos' : 'Nuevo plato'}
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b' }}>
                  Añade ingredientes de Mercadona Logroño para calcular costes
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 24px 18px' }}>
            {/* Dish Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Nombre del plato *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Lentejas con verduras, Solomillo al ajillo..."
                className="input-field"
                style={{ fontWeight: '600' }}
              />
            </div>

            {/* Meal Type */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Momento
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setType('comida')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: type === 'comida' ? '1px solid #000000' : '1px solid #cbd5e1',
                    background: type === 'comida' ? '#000000' : '#ffffff',
                    color: type === 'comida' ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ☀️ Comida
                </button>
                <button
                  type="button"
                  onClick={() => setType('cena')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: type === 'cena' ? '1px solid #000000' : '1px solid #cbd5e1',
                    background: type === 'cena' ? '#000000' : '#ffffff',
                    color: type === 'cena' ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🌙 Cena
                </button>
                <button
                  type="button"
                  onClick={() => setType('ambas')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: type === 'ambas' ? '1px solid #000000' : '1px solid #cbd5e1',
                    background: type === 'ambas' ? '#000000' : '#ffffff',
                    color: type === 'ambas' ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✨ Ambas
                </button>
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Etiquetas
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                {COMMON_TAGS.map(tag => {
                  const isChecked = tags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: isChecked ? '#000000' : '#f8fafc',
                        color: isChecked ? '#ffffff' : '#475569',
                        border: isChecked ? '1px solid #000000' : '1px solid #e2e8f0',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Otra etiqueta..."
                  className="input-field"
                  style={{ height: '34px', fontSize: '12px' }}
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
                  style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Ingredients Section */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Store size={15} />
                    Alimentos e Ingredientes ({ingredients.length})
                  </h4>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>
                    Se usarán para generar la lista de la compra automáticamente
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
                    Total plato
                  </span>
                  <span className="price-text" style={{ fontSize: '15px', fontWeight: '800', color: '#000000' }}>
                    {totalCost.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Action: Open Mercadona search */}
              <button
                type="button"
                onClick={() => setIsMercadonaModalOpen(true)}
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '10px', padding: '9px 12px' }}
              >
                <Plus size={16} />
                <span>Buscar en catálogo de Mercadona</span>
              </button>

              {/* Ingredients list */}
              {ingredients.length === 0 ? (
                <div style={{
                  padding: '14px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '6px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '12px'
                }}>
                  No has añadido alimentos todavía. Pulsa el botón de arriba para buscar en Mercadona.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        background: '#ffffff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      {ing.mercadonaProduct?.thumbnail && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          background: '#ffffff',
                          flexShrink: 0,
                          border: '1px solid #e2e8f0'
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
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ing.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                          <span>{ing.mercadonaProduct ? 'Mercadona' : 'Manual'}</span>
                          <span>• {ing.unit}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#ffffff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ing.estimatedPrice !== undefined ? ing.estimatedPrice : (ing.mercadonaProduct?.price || 0)}
                              onChange={(e) => handleUpdateIngredientPrice(ing.id, parseFloat(e.target.value) || 0)}
                              title="Haz clic para ajustar el precio (ej: 5.30 si tu pieza pesa más)"
                              style={{
                                width: '50px',
                                border: 'none',
                                background: 'transparent',
                                textAlign: 'right',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#0f172a',
                                outline: 'none',
                                padding: 0
                              }}
                            />
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>€</span>
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateIngredientQty(ing.id, -1)}
                          style={{
                            width: '24px',
                            height: '24px',
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
                        <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '16px', textAlign: 'center' }}>
                          {ing.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateIngredientQty(ing.id, 1)}
                          style={{
                            width: '24px',
                            height: '24px',
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

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual ingredient adder */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  O añadir ingrediente genérico a mano:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    value={manualIngName}
                    onChange={(e) => setManualIngName(e.target.value)}
                    placeholder="Ej: Sal, Agua, Ajo, Pizca de pimienta..."
                    className="input-field"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      min="1"
                      value={manualIngQty}
                      onChange={(e) => setManualIngQty(parseInt(e.target.value) || 1)}
                      placeholder="Cant."
                      className="input-field"
                      style={{ flex: 1, height: '36px', fontSize: '13px' }}
                    />
                    <input
                      type="text"
                      value={manualIngUnit}
                      onChange={(e) => setManualIngUnit(e.target.value)}
                      placeholder="ud / g / ml"
                      className="input-field"
                      style={{ flex: 1, height: '36px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddManualIngredient}
                      className="btn btn-secondary"
                      style={{ height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: '700' }}
                    >
                      + Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                Notas de preparación (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones o notas..."
                rows={2}
                className="input-field"
                style={{ resize: 'vertical', fontSize: '12px' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '10px' }}
              >
                {dishToEdit ? 'Guardar Cambios' : 'Guardar en Banco de Platos'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <MercadonaSearchModal
        isOpen={isMercadonaModalOpen}
        onClose={() => setIsMercadonaModalOpen(false)}
        onSelectProduct={handleAddMercadonaProduct}
        title="Añadir alimento de Mercadona"
      />
    </>
  );
}
