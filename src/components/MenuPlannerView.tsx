'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DayKey } from '@/types';
import DishPickerModal from './DishPickerModal';
import DishEditorModal from './DishEditorModal';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RotateCcw,
  BookmarkPlus,
  Trash2,
  Plus,
  ShoppingCart,
  ChevronRight,
  Sun,
  Moon,
  UtensilsCrossed,
  Store
} from 'lucide-react';

export default function MenuPlannerView() {
  const {
    weekMenu,
    setSlotDish,
    clearSlot,
    setActiveDaysCount,
    randomizeMenu,
    clearWeekMenu,
    savedMenus,
    saveCurrentWeekAsTemplate,
    loadSavedMenuTemplate,
    deleteSavedMenuTemplate,
    generateShoppingListFromMenu,
    getDishById,
    menuTotalCost,
    dishes,
    setActiveTab,
  } = useApp();

  // Picker modal state
  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    dayKey: DayKey;
    dayLabel: string;
    slot: 'comida' | 'cena';
    currentDishId: string | null;
    currentCustomName?: string;
  }>({
    isOpen: false,
    dayKey: 'lunes',
    dayLabel: 'Lunes',
    slot: 'comida',
    currentDishId: null,
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const activeDays = weekMenu.days.slice(0, weekMenu.activeDaysCount);

  // Count planned meals
  const plannedCount = activeDays.reduce((acc, d) => {
    return acc + (d.comidaDishId || d.comidaCustomName ? 1 : 0) + (d.cenaDishId || d.cenaCustomName ? 1 : 0);
  }, 0);
  const maxPossible = activeDays.length * 2;

  const handleOpenPicker = (dayKey: DayKey, dayLabel: string, slot: 'comida' | 'cena', currentDishId: string | null, currentCustomName?: string) => {
    setPickerState({
      isOpen: true,
      dayKey,
      dayLabel,
      slot,
      currentDishId,
      currentCustomName,
    });
  };

  const handleGenerateShopping = () => {
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#000000', '#475569', '#cbd5e1']
      });
    } catch (e) {
      // Ignore
    }
    generateShoppingListFromMenu();
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    saveCurrentWeekAsTemplate(newTemplateName.trim());
    setNewTemplateName('');
    setTemplateModalOpen(false);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 36px 16px' }}>
      {/* Top Banner & Title Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Planificador Semanal
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {plannedCount} de {maxPossible} comidas asignadas
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Menú Semanal
            </h2>
          </div>

          {/* Days count toggle: Lunes a Sábado vs Completa (Classic White & Black) */}
          <div style={{
            display: 'flex',
            background: '#ffffff',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
          }}>
            <button
              onClick={() => setActiveDaysCount(6)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: weekMenu.activeDaysCount === 6 ? '#000000' : 'transparent',
                color: weekMenu.activeDaysCount === 6 ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              Lunes a Sábado (6d)
            </button>
            <button
              onClick={() => setActiveDaysCount(7)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: weekMenu.activeDaysCount === 7 ? '#000000' : 'transparent',
                color: weekMenu.activeDaysCount === 7 ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              Semana Completa (7d)
            </button>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {dishes.length > 0 && (
            <button
              onClick={randomizeMenu}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '7px 12px' }}
              title="Asignar platos aleatorios del banco"
            >
              <Sparkles size={14} />
              <span>Aleatorio</span>
            </button>
          )}

          <button
            onClick={() => setTemplateModalOpen(true)}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '7px 12px' }}
            title="Guardar o cargar menús completos"
          >
            <BookmarkPlus size={14} />
            <span>Plantillas ({savedMenus.length})</span>
          </button>

          {plannedCount > 0 && (
            <button
              onClick={clearWeekMenu}
              className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '7px 10px', color: '#64748b' }}
              title="Vaciar las comidas asignadas"
            >
              <RotateCcw size={14} />
              <span>Vaciar</span>
            </button>
          )}

          {/* Cost Indicator Badge */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Coste menú:</span>
            <span className="price-text" style={{ fontSize: '15px', fontWeight: '800', color: '#000000' }}>
              {menuTotalCost.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Primary CTA: Generate Shopping List */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #0f172a',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
      }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            Lista de la compra de Mercadona
          </h3>
          <p style={{ fontSize: '12px', color: '#475569' }}>
            {plannedCount > 0
              ? 'Pulsa para extraer y sumar automáticamente los ingredientes de tu menú.'
              : 'Asigna comidas a tu semana o genera la lista para ver los productos.'}
          </p>
        </div>

        <button
          onClick={handleGenerateShopping}
          className="btn btn-primary"
          style={{ padding: '11px 20px', fontSize: '13px', fontWeight: '700' }}
        >
          <ShoppingCart size={16} />
          <span>Generar Lista de la Compra</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* If Banco de platos is completely empty, guide the user */}
      {dishes.length === 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px 20px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <UtensilsCrossed size={36} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Tu banco de platos está listo para empezar
          </h3>
          <p style={{ fontSize: '13px', color: '#475569', maxWidth: '440px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            Añade tus comidas y cenas favoritas. Puedes vincular los ingredientes directamente con los precios oficiales de Mercadona Logroño.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsEditorOpen(true)}
              className="btn btn-primary"
              style={{ padding: '9px 16px', fontSize: '13px' }}
            >
              <Plus size={16} />
              <span>Crear mi primer plato</span>
            </button>
            <button
              onClick={() => setActiveTab('dishes')}
              className="btn btn-secondary"
              style={{ padding: '9px 16px', fontSize: '13px' }}
            >
              <span>Ver Banco de Platos</span>
            </button>
          </div>
        </div>
      )}

      {/* Days Grid Layout (Mobile friendly single col, tablet/desktop multi-col) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '14px',
      }}>
        {activeDays.map((day) => {
          const comidaDish = getDishById(day.comidaDishId);
          const cenaDish = getDishById(day.cenaDishId);
          const dayCost = (comidaDish?.estimatedCost || 0) + (cenaDish?.estimatedCost || 0);

          return (
            <div
              key={day.dayKey}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {day.dayLabel}
                </span>
                <span className="price-text" style={{ fontSize: '12px', color: '#64748b' }}>
                  {dayCost > 0 ? `${dayCost.toFixed(2)} €` : '0.00 €'}
                </span>
              </div>

              {/* Meal 1: Comida (Almuerzo) */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '9px 11px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sun size={12} /> Comida
                  </span>
                  {comidaDish && (
                    <span className="price-text" style={{ fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>
                      {comidaDish.estimatedCost.toFixed(2)} €
                    </span>
                  )}
                </div>

                {comidaDish ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div
                      onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'comida', day.comidaDishId, day.comidaCustomName)}
                      style={{
                        flex: 1,
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#0f172a',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {comidaDish.name}
                    </div>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'comida')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '26px', height: '26px', color: '#94a3b8' }}
                      title="Quitar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : day.comidaCustomName ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'comida', null, day.comidaCustomName)}
                      style={{ fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                    >
                      {day.comidaCustomName}
                    </span>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'comida')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '26px', height: '26px', color: '#94a3b8' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'comida', null)}
                    className="btn btn-ghost"
                    style={{
                      width: '100%',
                      padding: '7px',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#64748b',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      background: '#ffffff',
                    }}
                  >
                    <Plus size={13} />
                    <span>Añadir comida</span>
                  </button>
                )}
              </div>

              {/* Meal 2: Cena */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '9px 11px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Moon size={12} /> Cena
                  </span>
                  {cenaDish && (
                    <span className="price-text" style={{ fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>
                      {cenaDish.estimatedCost.toFixed(2)} €
                    </span>
                  )}
                </div>

                {cenaDish ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div
                      onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'cena', day.cenaDishId, day.cenaCustomName)}
                      style={{
                        flex: 1,
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#0f172a',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cenaDish.name}
                    </div>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'cena')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '26px', height: '26px', color: '#94a3b8' }}
                      title="Quitar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : day.cenaCustomName ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'cena', null, day.cenaCustomName)}
                      style={{ fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                    >
                      {day.cenaCustomName}
                    </span>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'cena')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '26px', height: '26px', color: '#94a3b8' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'cena', null)}
                    className="btn btn-ghost"
                    style={{
                      width: '100%',
                      padding: '7px',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#64748b',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      background: '#ffffff',
                    }}
                  >
                    <Plus size={13} />
                    <span>Añadir cena</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dish Picker Modal */}
      <DishPickerModal
        isOpen={pickerState.isOpen}
        onClose={() => setPickerState(prev => ({ ...prev, isOpen: false }))}
        dayLabel={pickerState.dayLabel}
        slotType={pickerState.slot}
        currentDishId={pickerState.currentDishId}
        currentCustomName={pickerState.currentCustomName}
        onSelectDish={(dishId, customName) => {
          setSlotDish(pickerState.dayKey, pickerState.slot, dishId, customName);
        }}
        onCreateNewDish={() => setIsEditorOpen(true)}
      />

      {/* Dish Editor Modal */}
      <DishEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />

      {/* Saved Menus / Templates Modal */}
      {templateModalOpen && (
        <div className="modal-overlay" onClick={() => setTemplateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Plantillas de Menú Semanal</h3>
              <button onClick={() => setTemplateModalOpen(false)} className="btn btn-ghost btn-icon">
                ✕
              </button>
            </div>
            <div style={{ padding: '18px', overflowY: 'auto' }}>
              <form onSubmit={handleSaveTemplate} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  Guardar semana actual como plantilla
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Ej: Menú Rápido, Menú de Verano..."
                    className="input-field"
                    style={{ fontSize: '13px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 14px', fontSize: '12px' }}>
                    Guardar
                  </button>
                </div>
              </form>

              {savedMenus.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                  No tienes plantillas guardadas todavía.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {savedMenus.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                        {tmpl.name}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            loadSavedMenuTemplate(tmpl.id);
                            setTemplateModalOpen(false);
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => deleteSavedMenuTemplate(tmpl.id)}
                          className="btn btn-ghost btn-icon"
                          style={{ width: '28px', height: '28px', color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
