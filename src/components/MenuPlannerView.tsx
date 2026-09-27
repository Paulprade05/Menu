'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DayKey, Dish } from '@/types';
import DishPickerModal from './DishPickerModal';
import DishEditorModal from './DishEditorModal';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  UtensilsCrossed,
  Sparkles,
  RotateCcw,
  BookmarkPlus,
  FolderOpen,
  Trash2,
  Plus,
  ShoppingCart,
  CheckCircle2,
  ChevronRight,
  Sun,
  Moon,
  ExternalLink
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

  // Dish editor modal
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
    // Trigger confetti effect
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#ffffff']
      });
    } catch (e) {
      // Ignore if confetti not supported
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 40px 16px' }}>
      {/* Top Banner & Title Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-green" style={{ fontSize: '11px' }}>
                <Sparkles size={12} /> Planificador Inteligente
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {plannedCount} de {maxPossible} comidas asignadas
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>
              Menú Semanal
            </h2>
          </div>

          {/* Days count toggle (Lunes a Sábado vs Lunes a Domingo) */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => setActiveDaysCount(6)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: weekMenu.activeDaysCount === 6 ? 'var(--accent-green)' : 'transparent',
                color: weekMenu.activeDaysCount === 6 ? '#070a12' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              Lunes a Sábado (6d)
            </button>
            <button
              onClick={() => setActiveDaysCount(7)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: weekMenu.activeDaysCount === 7 ? 'var(--accent-green)' : 'transparent',
                color: weekMenu.activeDaysCount === 7 ? '#070a12' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              Semana Completa (7d)
            </button>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={randomizeMenu}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px' }}
            title="Asignar platos aleatorios del banco"
          >
            <Sparkles size={16} color="var(--accent-gold)" />
            <span>Aleatorio</span>
          </button>

          <button
            onClick={() => setTemplateModalOpen(true)}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px' }}
            title="Guardar o cargar menús completos"
          >
            <BookmarkPlus size={16} />
            <span>Plantillas ({savedMenus.length})</span>
          </button>

          <button
            onClick={clearWeekMenu}
            className="btn btn-ghost"
            style={{ fontSize: '13px', padding: '8px 12px', color: 'var(--text-dim)' }}
            title="Vaciar las comidas asignadas"
          >
            <RotateCcw size={15} />
            <span>Vaciar</span>
          </button>

          {/* Cost Indicator Badge */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Coste estimado:</span>
            <span className="price-text" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-green-light)' }}>
              {menuTotalCost.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Primary Floating / Sticky CTA to Generate Shopping List */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '3px' }}>
            ¿Listo para comprar en Mercadona?
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Consolida todos los ingredientes del menú y calcula el total exacto con 1 clic.
          </p>
        </div>

        <button
          onClick={handleGenerateShopping}
          className="btn btn-primary"
          style={{ padding: '12px 22px', fontSize: '15px', fontWeight: '700' }}
        >
          <ShoppingCart size={18} />
          <span>Generar Lista de la Compra</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Days Grid Layout (Responsive: 1 col on mobile, 2 col on tablet, 3-4 col on desktop) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
      }}>
        {activeDays.map((day) => {
          const comidaDish = getDishById(day.comidaDishId);
          const cenaDish = getDishById(day.cenaDishId);

          return (
            <div
              key={day.dayKey}
              className="glass-card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                  }}>
                    {day.dayLabel}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {comidaDish || cenaDish ? (
                    <span className="price-text" style={{ color: 'var(--accent-green-light)', fontWeight: '600' }}>
                      {((comidaDish?.estimatedCost || 0) + (cenaDish?.estimatedCost || 0)).toFixed(2)} €
                    </span>
                  ) : (
                    <span>Sin asignar</span>
                  )}
                </div>
              </div>

              {/* Meal 1: Comida (Almuerzo) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sun size={13} /> Comida
                  </span>
                  {comidaDish && (
                    <span className="price-text" style={{ fontSize: '12px', color: 'var(--accent-green-light)' }}>
                      {comidaDish.estimatedCost.toFixed(2)} €
                    </span>
                  )}
                </div>

                {comidaDish ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {comidaDish.imageUrl && (
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={comidaDish.imageUrl}
                          alt={comidaDish.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'comida', day.comidaDishId, day.comidaCustomName)}
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {comidaDish.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {comidaDish.ingredients.length} alimentos de Mercadona
                      </div>
                    </div>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'comida')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '28px', height: '28px', color: 'var(--text-dim)' }}
                      title="Quitar plato"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : day.comidaCustomName ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'comida', null, day.comidaCustomName)}
                      style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {day.comidaCustomName}
                    </span>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'comida')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '28px', height: '28px', color: 'var(--text-dim)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'comida', null)}
                    className="btn btn-ghost"
                    style={{
                      width: '100%',
                      padding: '8px',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'var(--text-dim)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: '8px',
                    }}
                  >
                    <Plus size={14} />
                    <span>Añadir comida</span>
                  </button>
                )}
              </div>

              {/* Meal 2: Cena */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Moon size={13} /> Cena
                  </span>
                  {cenaDish && (
                    <span className="price-text" style={{ fontSize: '12px', color: 'var(--accent-green-light)' }}>
                      {cenaDish.estimatedCost.toFixed(2)} €
                    </span>
                  )}
                </div>

                {cenaDish ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {cenaDish.imageUrl && (
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cenaDish.imageUrl}
                          alt={cenaDish.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'cena', day.cenaDishId, day.cenaCustomName)}
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cenaDish.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {cenaDish.ingredients.length} alimentos de Mercadona
                      </div>
                    </div>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'cena')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '28px', height: '28px', color: 'var(--text-dim)' }}
                      title="Quitar cena"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : day.cenaCustomName ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'cena', null, day.cenaCustomName)}
                      style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {day.cenaCustomName}
                    </span>
                    <button
                      onClick={() => clearSlot(day.dayKey, 'cena')}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '28px', height: '28px', color: 'var(--text-dim)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPicker(day.dayKey, day.dayLabel, 'cena', null)}
                    className="btn btn-ghost"
                    style={{
                      width: '100%',
                      padding: '8px',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'var(--text-dim)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: '8px',
                    }}
                  >
                    <Plus size={14} />
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

      {/* Dish Editor Modal (if user wants to create dish directly) */}
      <DishEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />

      {/* Saved Menus / Templates Modal */}
      {templateModalOpen && (
        <div className="modal-overlay" onClick={() => setTemplateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Banco de Menús Semanales</h3>
              <button onClick={() => setTemplateModalOpen(false)} className="btn btn-ghost btn-icon">
                <Trash2 size={0} style={{ display: 'none' }} />
                <span>✕</span>
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              {/* Save current menu form */}
              <form onSubmit={handleSaveTemplate} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Guardar esta semana como plantilla
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Ej: Menú Rápido, Menú Ligero..."
                    className="input-field"
                    style={{ fontSize: '14px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', fontSize: '13px' }}>
                    Guardar
                  </button>
                </div>
              </form>

              {/* List of saved templates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>
                  Plantillas guardadas ({savedMenus.length})
                </span>
                {savedMenus.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {tmpl.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {tmpl.description || `${tmpl.activeDaysCount || 6} días configurados`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          loadSavedMenuTemplate(tmpl.id);
                          setTemplateModalOpen(false);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => deleteSavedMenuTemplate(tmpl.id)}
                        className="btn btn-ghost btn-icon"
                        style={{ width: '32px', height: '32px', color: 'var(--accent-rose)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
