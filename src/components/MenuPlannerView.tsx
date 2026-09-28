'use client';

import React, { useRef, useState, useSyncExternalStore } from 'react';
import confetti from 'canvas-confetti';
import {
  BookMarked,
  BookmarkPlus,
  ChevronRight,
  Lightbulb,
  Moon,
  MoreHorizontal,
  Plus,
  ShoppingCart,
  Sparkles,
  Sun,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUI } from '@/components/ui/UIProvider';
import Sheet, { useSheet } from '@/components/ui/Sheet';
import { BottomBar, HeaderButton, PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, SegmentedControl } from '@/components/ui/controls';
import { formatEuro } from '@/lib/format';
import { todayDayKey } from '@/lib/utils';
import type { DayKey, DayPlan, Dish, MealSlot, MealType } from '@/types';
import DishPickerModal, { CustomMealIcon, describeCustomMeal } from './DishPickerModal';
import DishEditorModal from './DishEditorModal';
import MenuTemplatesSheet from './MenuTemplatesSheet';
import styles from './MenuPlannerView.module.css';

interface SlotTarget {
  dayKey: DayKey;
  dayLabel: string;
  slot: MealSlot;
}

/** Only one sheet of this view is open at a time */
type MenuSheet =
  | { kind: 'picker'; target: SlotTarget }
  | { kind: 'editor'; target: SlotTarget | null; initialName?: string; initialType?: MealType }
  | { kind: 'options' }
  | { kind: 'templates'; focusName: boolean };

const DAYS_OPTIONS = [
  { value: 6, label: 'Lun – Sáb' },
  { value: 7, label: 'Lun – Dom' },
];

export default function MenuPlannerView() {
  const {
    weekMenu,
    activeDays,
    dishes,
    getDishById,
    setSlotDish,
    clearSlot,
    setActiveDaysCount,
    randomizeMenu,
    clearWeekMenu,
    savedMenus,
    shoppingList,
    generateShoppingListFromMenu,
    setActiveTab,
    menuTotalCost,
    plannedMealsCount,
    maxMealsCount,
  } = useApp();
  const { showToast, confirm } = useUI();
  const today = useTodayKey();

  const [sheet, setSheet] = useState<MenuSheet | null>(null);
  /** Runs once the current sheet has finished closing (open the next sheet, actions with an undo toast…) */
  const afterClose = useRef<(() => void) | null>(null);

  const queueAfterClose = (action: () => void) => {
    afterClose.current = action;
  };

  const handleSheetClosed = () => {
    const action = afterClose.current;
    afterClose.current = null;
    setSheet(null);
    action?.();
  };

  const handleRandomize = async () => {
    if (randomizeMenu('empty') > 0) return;
    const redo = await confirm({
      title: '¿Rehacer toda la semana al azar?',
      message: 'Ya tienes todas las comidas planificadas. Las cambiaremos por platos al azar (podrás deshacerlo).',
      confirmLabel: 'Rehacer',
    });
    if (redo) randomizeMenu('all');
  };

  const handleGenerateList = () => {
    const result = generateShoppingListFromMenu();
    if (result.empty) return;
    if (result.added > 0) celebrate();
    setActiveTab('shopping');
  };

  const handleDishCreated = (dish: Dish, target: SlotTarget | null) => {
    if (!target) return;
    setSlotDish(target.dayKey, target.slot, dish.id);
    showToast(`«${dish.name}» añadido al ${target.dayLabel.toLowerCase()}`, { tone: 'success' });
  };

  const hasDishes = dishes.length > 0;
  // "8 de 12 comidas · 45,20 €" ("8/12 comidas" on 320px phones, so the price is not cut off)
  const subtitle = (
    <>
      {plannedMealsCount}
      <span className={styles.subtitleOf}> de </span>
      <span className={styles.subtitleSlash}>/</span>
      {maxMealsCount} comidas
      {menuTotalCost > 0 && ` · ${formatEuro(menuTotalCost)}`}
    </>
  );

  const pickerTarget = sheet?.kind === 'picker' ? sheet.target : null;
  const pickerDay = pickerTarget ? weekMenu.days.find((d) => d.dayKey === pickerTarget.dayKey) : undefined;

  return (
    <>
      <PageHeader
        title="Menú semanal"
        subtitle={subtitle}
        actions={
          <>
            {hasDishes && (
              // Icon only on very narrow phones, so "Menú semanal" is not cut off
              <span className={styles.randomAction}>
                <HeaderButton icon={<Sparkles size={18} />} label="Al azar" onClick={() => void handleRandomize()} showLabel />
              </span>
            )}
            <HeaderButton icon={<MoreHorizontal size={22} />} label="Opciones" onClick={() => setSheet({ kind: 'options' })} />
          </>
        }
      />

      <div className="view">
        {!hasDishes && (
          <div className={styles.onboarding}>
            <EmptyState
              icon={<UtensilsCrossed size={28} />}
              title="Primero, crea tus platos"
              actions={
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => setSheet({ kind: 'editor', target: null })}
                  >
                    <Plus size={20} />
                    Crear mi primer plato
                  </button>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => setActiveTab('dishes')}>
                    Ver mis platos
                  </button>
                </>
              }
            >
              Añade tus platos con ingredientes de Mercadona y la lista de la compra se hará sola, con precios.
            </EmptyState>
          </div>
        )}

        <div className={styles.controls}>
          <SegmentedControl
            ariaLabel="Días que planificas"
            options={DAYS_OPTIONS}
            value={weekMenu.activeDaysCount === 7 ? 7 : 6}
            onChange={setActiveDaysCount}
            className={styles.daysToggle}
          />
        </div>

        {hasDishes && plannedMealsCount === 0 && (
          <div className={`notice ${styles.hint}`}>
            <Lightbulb size={18} className={styles.hintIcon} aria-hidden="true" />
            <p>
              Toca una comida para elegir plato, o pulsa{' '}
              <strong>
                <Sparkles size={15} className="inline-icon" aria-hidden="true" /> Al azar
              </strong>{' '}
              y rellena la semana en un momento.
            </p>
          </div>
        )}

        <div className={styles.grid}>
          {activeDays.map((day) => (
            <DayCard
              key={day.dayKey}
              day={day}
              isToday={today === day.dayKey}
              comida={getDishById(day.comidaDishId)}
              cena={getDishById(day.cenaDishId)}
              onOpen={(slot) => setSheet({ kind: 'picker', target: { dayKey: day.dayKey, dayLabel: day.dayLabel, slot } })}
            />
          ))}
        </div>

        {plannedMealsCount > 0 && (
          <BottomBar>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleGenerateList}>
              <ShoppingCart size={20} />
              {shoppingList.length > 0 ? 'Actualizar lista de la compra' : 'Generar lista de la compra'}
            </button>
          </BottomBar>
        )}
      </div>

      {pickerTarget && (
        <DishPickerModal
          key={`${pickerTarget.dayKey}-${pickerTarget.slot}`}
          open
          onClose={handleSheetClosed}
          dayLabel={pickerTarget.dayLabel}
          slot={pickerTarget.slot}
          currentDishId={(pickerTarget.slot === 'comida' ? pickerDay?.comidaDishId : pickerDay?.cenaDishId) ?? null}
          currentCustomName={pickerTarget.slot === 'comida' ? pickerDay?.comidaCustomName : pickerDay?.cenaCustomName}
          onSelectDish={(dishId) => setSlotDish(pickerTarget.dayKey, pickerTarget.slot, dishId)}
          onSelectCustom={(name) => setSlotDish(pickerTarget.dayKey, pickerTarget.slot, null, name)}
          onClear={() => queueAfterClose(() => clearSlot(pickerTarget.dayKey, pickerTarget.slot))}
          onCreateNewDish={(name) =>
            queueAfterClose(() =>
              setSheet({ kind: 'editor', target: pickerTarget, initialName: name || undefined, initialType: pickerTarget.slot }),
            )
          }
        />
      )}

      {sheet?.kind === 'editor' && (
        <DishEditorModal
          open
          onClose={handleSheetClosed}
          initialName={sheet.initialName}
          initialType={sheet.initialType}
          onSaved={(dish) => handleDishCreated(dish, sheet.target)}
        />
      )}

      <Sheet open={sheet?.kind === 'options'} onClose={handleSheetClosed} title="Opciones del menú" width="sm">
        <MenuOptions
          plannedCount={plannedMealsCount}
          templatesCount={savedMenus.length}
          onSaveTemplate={() => queueAfterClose(() => setSheet({ kind: 'templates', focusName: true }))}
          onOpenTemplates={() => queueAfterClose(() => setSheet({ kind: 'templates', focusName: false }))}
          onClearWeek={() => queueAfterClose(clearWeekMenu)}
        />
      </Sheet>

      {sheet?.kind === 'templates' && (
        <MenuTemplatesSheet open onClose={handleSheetClosed} autoFocusName={sheet.focusName} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Day card
// ---------------------------------------------------------------------------

function DayCard({
  day,
  isToday,
  comida,
  cena,
  onOpen,
}: {
  day: DayPlan;
  isToday: boolean;
  comida: Dish | undefined;
  cena: Dish | undefined;
  onOpen: (slot: MealSlot) => void;
}) {
  const cost = (comida?.estimatedCost ?? 0) + (cena?.estimatedCost ?? 0);

  return (
    <article className={`${styles.day}${isToday ? ` ${styles.dayToday}` : ''}`} aria-label={isToday ? `${day.dayLabel} (hoy)` : day.dayLabel}>
      <header className={styles.dayHeader}>
        <h2 className={styles.dayName}>{day.dayLabel}</h2>
        {isToday && <span className={`tag tag--ink ${styles.todayTag}`}>Hoy</span>}
        {cost > 0 && <span className={styles.dayCost}>{formatEuro(cost)}</span>}
      </header>
      <MealRow
        slot="comida"
        dayLabel={day.dayLabel}
        dishId={day.comidaDishId}
        dish={comida}
        customName={day.comidaCustomName}
        onOpen={() => onOpen('comida')}
      />
      <MealRow
        slot="cena"
        dayLabel={day.dayLabel}
        dishId={day.cenaDishId}
        dish={cena}
        customName={day.cenaCustomName}
        onOpen={() => onOpen('cena')}
      />
    </article>
  );
}

function MealRow({
  slot,
  dayLabel,
  dishId,
  dish,
  customName,
  onOpen,
}: {
  slot: MealSlot;
  dayLabel: string;
  dishId: string | null;
  dish: Dish | undefined;
  customName: string | undefined;
  onOpen: () => void;
}) {
  const slotLabel = slot === 'comida' ? 'Comida' : 'Cena';
  const custom = !dishId && customName ? describeCustomMeal(customName) : null;
  const isEmpty = !dishId && !custom;

  let content: React.ReactNode;
  let description: string;
  if (dish) {
    content = <span className={`${styles.mealName} clamp-2`}>{dish.name}</span>;
    description = dish.estimatedCost > 0 ? `${dish.name}, ${formatEuro(dish.estimatedCost)}` : dish.name;
  } else if (dishId) {
    // The dish was deleted on another device
    content = <span className={styles.mealPlaceholder}>Plato no disponible</span>;
    description = 'plato no disponible';
  } else if (custom) {
    content = (
      <span className={styles.mealCustom}>
        <CustomMealIcon kind={custom.kind} size={16} />
        <span className="clamp-2">{custom.label}</span>
      </span>
    );
    description = custom.label;
  } else {
    content = (
      <span className={styles.mealPlaceholder}>
        <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
        {slot === 'comida' ? 'Añadir comida' : 'Añadir cena'}
      </span>
    );
    description = 'sin planificar';
  }

  return (
    <button
      type="button"
      className={`${styles.meal}${isEmpty ? ` ${styles.mealEmpty}` : ''}`}
      onClick={onOpen}
      aria-label={`${slotLabel} del ${dayLabel.toLowerCase()}: ${description}`}
    >
      <span className={styles.mealIcon} aria-hidden="true">
        {slot === 'comida' ? <Sun size={18} /> : <Moon size={17} />}
      </span>
      <span className={styles.mealBody}>
        <span className={styles.mealLabel}>{slotLabel}</span>
        {content}
      </span>
      {dish && dish.estimatedCost > 0 && <span className={`price ${styles.mealPrice}`}>{formatEuro(dish.estimatedCost)}</span>}
      <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Options sheet
// ---------------------------------------------------------------------------

function MenuOptions({
  plannedCount,
  templatesCount,
  onSaveTemplate,
  onOpenTemplates,
  onClearWeek,
}: {
  plannedCount: number;
  templatesCount: number;
  onSaveTemplate: () => void;
  onOpenTemplates: () => void;
  onClearWeek: () => void;
}) {
  const { close } = useSheet();
  const run = (action: () => void) => {
    action();
    close();
  };

  return (
    <div className="list">
      <button type="button" className={`list-row ${styles.option}`} onClick={() => run(onSaveTemplate)}>
        <span className={styles.optionIcon} aria-hidden="true">
          <BookmarkPlus size={19} />
        </span>
        <span className={`list-row__main ${styles.stack}`}>
          <span className="list-row__title">Guardar semana como plantilla</span>
          <span className="list-row__meta">
            {plannedCount === 0 ? 'Primero planifica alguna comida' : 'Para repetirla otra semana'}
          </span>
        </span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
      </button>

      <button type="button" className={`list-row ${styles.option}`} onClick={() => run(onOpenTemplates)}>
        <span className={styles.optionIcon} aria-hidden="true">
          <BookMarked size={19} />
        </span>
        <span className={`list-row__main ${styles.stack}`}>
          <span className="list-row__title">Plantillas guardadas ({templatesCount})</span>
          <span className="list-row__meta">
            {templatesCount === 0 ? 'Todavía no tienes ninguna' : 'Carga una semana que ya guardaste'}
          </span>
        </span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`list-row ${styles.option} ${styles.optionDanger}`}
        onClick={() => run(onClearWeek)}
        disabled={plannedCount === 0}
      >
        <span className={styles.optionIcon} aria-hidden="true">
          <Trash2 size={19} />
        </span>
        <span className={`list-row__main ${styles.stack}`}>
          <span className="list-row__title">Vaciar semana</span>
          <span className="list-row__meta">
            {plannedCount === 0
              ? 'No hay nada planificado'
              : plannedCount === 1
                ? 'Quita la comida planificada'
                : `Quita las ${plannedCount} comidas planificadas`}
          </span>
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Re-checks the day when the PWA comes back from the background (it can stay open for days on iPhone) */
function subscribeToClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

function useTodayKey(): DayKey | null {
  return useSyncExternalStore(subscribeToClock, () => todayDayKey(), () => null);
}

/** Small black & white confetti when the list gets new products */
function celebrate() {
  try {
    void confetti({
      particleCount: 70,
      spread: 70,
      startVelocity: 38,
      ticks: 160,
      scalar: 0.9,
      origin: { y: 0.82 },
      colors: ['#0a0a0a', '#334155', '#94a3b8', '#e2e8f0'],
      disableForReducedMotion: true,
    });
  } catch {
    // Decoration only
  }
}
