'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Check, Moon, Package, Pizza, Plus, Search, Sparkles, StickyNote, Sun, UtensilsCrossed, X } from 'lucide-react';
import Sheet, { SheetButton, useSheet } from '@/components/ui/Sheet';
import { Chip, ChipRow, EmptyState, Thumb } from '@/components/ui/controls';
import { useApp } from '@/context/AppContext';
import { formatEuro, pluralize } from '@/lib/format';
import { normalizeText } from '@/lib/utils';
import type { Dish, MealSlot } from '@/types';
import styles from './DishPickerModal.module.css';

// ---------------------------------------------------------------------------
// "Sin cocinar" quick options (shared with MenuPlannerView)
// ---------------------------------------------------------------------------

export type CustomMealKind = 'out' | 'leftovers' | 'free' | 'note';

interface QuickMealOption {
  kind: Exclude<CustomMealKind, 'note'>;
  label: string;
  /** Label saved by the first version of the app */
  legacyLabel: string;
}

export const QUICK_MEAL_OPTIONS: QuickMealOption[] = [
  { kind: 'out', label: 'Comer fuera', legacyLabel: 'Comer fuera / Restaurante 🍕' },
  { kind: 'leftovers', label: 'Sobras', legacyLabel: 'Sobras de ayer / Batch cooking 🥡' },
  { kind: 'free', label: 'Comida libre', legacyLabel: 'Comida libre / Improvisada ✨' },
];

/**
 * "Comer fuera", "Comer fuera / Restaurante 🍕" (old label) or "Sobras de ayer" match an option;
 * "Sobrasada con pan" does not (the label must end at a word boundary).
 */
function findQuickOption(customName: string | null | undefined): QuickMealOption | undefined {
  if (!customName) return undefined;
  const value = normalizeText(customName);
  return QUICK_MEAL_OPTIONS.find((option) => {
    const label = normalizeText(option.label);
    // normalizeText() leaves lowercase letters without accents (ñ becomes n)
    return value.startsWith(label) && !/[a-z0-9]/.test(value.charAt(label.length));
  });
}

/** Text + icon for a meal without dish ("Comer fuera", "Cumple de Ana"…). Cleans up the old long labels. */
export function describeCustomMeal(customName: string): { kind: CustomMealKind; label: string } {
  const option = findQuickOption(customName);
  if (!option) return { kind: 'note', label: customName };
  return { kind: option.kind, label: customName.trim() === option.legacyLabel ? option.label : customName };
}

export function CustomMealIcon({ kind, size = 18 }: { kind: CustomMealKind; size?: number }) {
  switch (kind) {
    case 'out':
      return <Pizza size={size} aria-hidden="true" />;
    case 'leftovers':
      return <Package size={size} aria-hidden="true" />;
    case 'free':
      return <Sparkles size={size} aria-hidden="true" />;
    default:
      return <StickyNote size={size} aria-hidden="true" />;
  }
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

export interface DishPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** "Lunes" */
  dayLabel: string;
  slot: MealSlot;
  currentDishId: string | null;
  currentCustomName?: string;
  onSelectDish: (dishId: string) => void;
  /** A meal without dish: "Comer fuera", "Sobras" or a free note */
  onSelectCustom: (name: string) => void;
  /** Empties the meal (only offered when it has something) */
  onClear: () => void;
  /** The picker closes itself first; open the dish editor prefilled with this name ('' = blank) */
  onCreateNewDish: (prefillName: string) => void;
}

type Filter = MealSlot | 'todos';

interface IndexedDish {
  dish: Dish;
  /** Normalized name + tags + ingredients, for accent-insensitive search */
  text: string;
  name: string;
}

export default function DishPickerModal(props: DishPickerModalProps) {
  // Mounted only while open, so the search and the filter start fresh every time
  if (!props.open) return null;
  return <PickerSheet {...props} />;
}

function PickerSheet({
  onClose,
  dayLabel,
  slot,
  currentDishId,
  currentCustomName,
  onSelectDish,
  onSelectCustom,
  onClear,
  onCreateNewDish,
}: DishPickerModalProps) {
  const { dishes, activeDays, getDishById } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(slot);
  const searchRef = useRef<HTMLInputElement>(null);

  const day = dayLabel.toLowerCase();
  const slotLabel = slot === 'comida' ? 'Comida' : 'Cena';

  const index = useMemo<IndexedDish[]>(
    () =>
      dishes
        .map((dish) => ({
          dish,
          name: normalizeText(dish.name),
          text: normalizeText(
            [
              dish.name,
              ...(dish.tags ?? []),
              ...(dish.ingredients ?? []).map((ing) => `${ing.name} ${ing.mercadonaProduct?.displayName ?? ''}`),
            ].join(' '),
          ),
        }))
        .sort((a, b) => a.dish.name.localeCompare(b.dish.name, 'es', { sensitivity: 'base' })),
    [dishes],
  );

  // How many times each dish is already in this week's menu
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of activeDays) {
      for (const id of [d.comidaDishId, d.cenaDishId]) {
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeDays]);

  const trimmed = query.trim();
  const normalizedQuery = normalizeText(trimmed);
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  const searching = words.length > 0;

  const queryMatches = searching ? index.filter((entry) => words.every((word) => entry.text.includes(word))) : index;
  const fitsFilter = (dish: Dish, value: Filter) => value === 'todos' || dish.type === value || dish.type === 'ambas';
  const counts: Record<Filter, number> = {
    comida: queryMatches.filter((entry) => fitsFilter(entry.dish, 'comida')).length,
    cena: queryMatches.filter((entry) => fitsFilter(entry.dish, 'cena')).length,
    todos: queryMatches.length,
  };
  const visible = queryMatches.filter((entry) => fitsFilter(entry.dish, filter));
  const hiddenByFilter = counts.todos - visible.length;
  const exactMatch = searching && index.some((entry) => entry.name === normalizedQuery);

  const currentDish = getDishById(currentDishId);
  const hasCurrent = Boolean(currentDishId || currentCustomName);
  const currentCustom = !currentDishId && currentCustomName ? describeCustomMeal(currentCustomName) : null;
  const currentQuick = currentDishId ? undefined : findQuickOption(currentCustomName);

  const filterChip = (value: Filter, label: string) => (
    <Chip active={filter === value} onClick={() => setFilter(value)} className={styles.filterChip}>
      {label} <span className={styles.chipCount}>{counts[value]}</span>
    </Chip>
  );

  const toolbar = (
    <div className={styles.toolbar}>
      <div className="search-field">
        <Search size={18} className="search-field__icon" aria-hidden="true" />
        <input
          ref={searchRef}
          className="input"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Buscar plato o ingrediente"
          aria-label="Buscar plato o ingrediente"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Hide the iPhone keyboard to see the results
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="icon-btn icon-btn--sm icon-btn--muted search-field__clear"
            onClick={() => {
              setQuery('');
              searchRef.current?.focus();
            }}
            aria-label="Borrar búsqueda"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {dishes.length > 0 && (
        <ChipRow className={styles.filters}>
          {filterChip('comida', 'Para comida')}
          {filterChip('cena', 'Para cena')}
          {filterChip('todos', 'Todos')}
        </ChipRow>
      )}
    </div>
  );

  // While searching, "Crear plato «…»" is already in the list: more room for results above the keyboard
  const footer =
    dishes.length > 0 && !searching ? (
      <SheetButton className="btn btn-secondary btn-block" onClick={() => onCreateNewDish('')}>
        <Plus size={18} />
        Crear plato nuevo
      </SheetButton>
    ) : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${slotLabel} del ${day}`}
      subtitle={hasCurrent ? undefined : slot === 'comida' ? 'Elige qué vas a comer' : 'Elige qué vas a cenar'}
      size="large"
      toolbar={toolbar}
      footer={footer}
    >
      <WithSheetClose>
        {(close) => {
          const pick = (action: () => void) => {
            action();
            close();
          };

          const createActions = searching && !exactMatch && (
            <div className="list">
              <button type="button" className={`list-row ${styles.actionRow}`} onClick={() => pick(() => onCreateNewDish(trimmed))}>
                <span className={`${styles.actionIcon} ${styles.actionIconInk}`} aria-hidden="true">
                  <Plus size={20} />
                </span>
                <span className={`list-row__main ${styles.stack}`}>
                  <span className="list-row__title clamp-2">Crear plato «{trimmed}»</span>
                  <span className="list-row__meta">Con sus ingredientes y precio</span>
                </span>
              </button>
              <button type="button" className={`list-row ${styles.actionRow}`} onClick={() => pick(() => onSelectCustom(trimmed))}>
                <span className={styles.actionIcon} aria-hidden="true">
                  <StickyNote size={19} />
                </span>
                <span className={`list-row__main ${styles.stack}`}>
                  <span className="list-row__title clamp-2">Usar «{trimmed}» como nota</span>
                  <span className="list-row__meta">Sin ingredientes, solo para recordarlo</span>
                </span>
              </button>
            </div>
          );

          const showAllButton = hiddenByFilter > 0 && (
            <button type="button" className={`btn btn-ghost btn-sm ${styles.showAll}`} onClick={() => setFilter('todos')}>
              Ver {pluralize(hiddenByFilter, 'plato más', 'platos más')} en «Todos»
            </button>
          );

          return (
            <>
              {!searching && hasCurrent && (
                <div className={styles.current}>
                  <span className={styles.currentIcon} aria-hidden="true">
                    {currentCustom ? (
                      <CustomMealIcon kind={currentCustom.kind} size={18} />
                    ) : slot === 'comida' ? (
                      <Sun size={18} />
                    ) : (
                      <Moon size={18} />
                    )}
                  </span>
                  <span className={styles.currentText}>
                    <span className={styles.currentLabel}>Ahora</span>
                    <span className={`${styles.currentName} ellipsis`}>
                      {currentDish?.name ?? currentCustom?.label ?? 'Plato no disponible'}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => pick(onClear)}
                    aria-label={`Quitar del ${day}`}
                  >
                    <X size={16} />
                    Quitar
                  </button>
                </div>
              )}

              {!searching && (
                <section className={styles.section} aria-labelledby="picker-quick-title">
                  <h3 id="picker-quick-title" className="section-title">
                    Sin cocinar
                  </h3>
                  <div className={styles.quick}>
                    {QUICK_MEAL_OPTIONS.map((option) => {
                      const active = currentQuick?.kind === option.kind;
                      return (
                        <button
                          key={option.kind}
                          type="button"
                          className={`${styles.quickBtn}${active ? ` ${styles.quickBtnActive}` : ''}`}
                          aria-pressed={active}
                          onClick={() => pick(() => onSelectCustom(option.label))}
                        >
                          <CustomMealIcon kind={option.kind} size={20} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {searching && visible.length === 0 && (
                <div className={styles.section}>
                  <p className={styles.noResults}>
                    {dishes.length === 0
                      ? 'Aún no tienes platos.'
                      : hiddenByFilter > 0
                        ? `Ningún plato para ${filter === 'cena' ? 'cena' : 'comida'} coincide con «${trimmed}».`
                        : `Ningún plato coincide con «${trimmed}».`}
                  </p>
                  {showAllButton}
                  {createActions}
                </div>
              )}

              {dishes.length === 0 && !searching && (
                <EmptyState
                  compact
                  icon={<UtensilsCrossed size={26} />}
                  title="Aún no tienes platos"
                  actions={
                    <button type="button" className="btn btn-primary" onClick={() => pick(() => onCreateNewDish(''))}>
                      <Plus size={18} />
                      Crear plato
                    </button>
                  }
                >
                  Crea tu primer plato con sus ingredientes y podrás elegirlo aquí.
                </EmptyState>
              )}

              {dishes.length > 0 && !searching && visible.length === 0 && (
                <EmptyState
                  compact
                  icon={slot === 'comida' ? <Sun size={26} /> : <Moon size={26} />}
                  title={filter === 'cena' ? 'No tienes platos para cena' : 'No tienes platos para comida'}
                  actions={
                    <>
                      <button type="button" className="btn btn-secondary" onClick={() => setFilter('todos')}>
                        Ver todos los platos
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => pick(() => onCreateNewDish(''))}>
                        <Plus size={18} />
                        Crear plato
                      </button>
                    </>
                  }
                >
                  Los platos marcados como «Comida y cena» salen en los dos.
                </EmptyState>
              )}

              {visible.length > 0 && (
                <section className={styles.section} aria-labelledby="picker-dishes-title">
                  <h3 id="picker-dishes-title" className="section-title">
                    {searching ? 'Resultados' : 'Tus platos'}
                    <span className="section-title__aside">{visible.length}</span>
                  </h3>
                  <div className="list">
                    {visible.map(({ dish }) => (
                      <DishRow
                        key={dish.id}
                        dish={dish}
                        selected={dish.id === currentDishId}
                        usedTimes={(usage.get(dish.id) ?? 0) - (dish.id === currentDishId ? 1 : 0)}
                        onPick={() => pick(() => onSelectDish(dish.id))}
                      />
                    ))}
                  </div>
                  {showAllButton}
                </section>
              )}

              {visible.length > 0 && createActions && (
                <section className={styles.section} aria-labelledby="picker-create-title">
                  <h3 id="picker-create-title" className="section-title">
                    ¿No es ninguno?
                  </h3>
                  {createActions}
                </section>
              )}
            </>
          );
        }}
      </WithSheetClose>
    </Sheet>
  );
}

/** Gives the body access to the animated close of the Sheet it lives in */
function WithSheetClose({ children }: { children: (close: () => void) => React.ReactNode }) {
  const { close } = useSheet();
  return <>{children(() => close())}</>;
}

function DishRow({ dish, selected, usedTimes, onPick }: { dish: Dish; selected: boolean; usedTimes: number; onPick: () => void }) {
  const ingredientsCount = dish.ingredients?.length ?? 0;
  const meta = [
    ingredientsCount > 0 ? pluralize(ingredientsCount, 'ingrediente', 'ingredientes') : 'Sin ingredientes',
    usedTimes > 0 ? `${usedTimes}× esta semana` : '',
    ...(dish.tags ?? []).slice(0, 2),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={`list-row ${styles.dishRow}${selected ? ` ${styles.dishRowSelected}` : ''}`}
      onClick={onPick}
      aria-current={selected ? 'true' : undefined}
    >
      <Thumb src={dish.imageUrl} alt="" size={44} fit="cover" fallback={<UtensilsCrossed size={20} aria-hidden="true" />} />
      <span className={`list-row__main ${styles.stack}`}>
        <span className="list-row__title clamp-2">{dish.name}</span>
        <span className="list-row__meta ellipsis">{meta}</span>
      </span>
      <span className={styles.dishEnd}>
        {dish.estimatedCost > 0 && <span className={`price ${styles.dishPrice}`}>{formatEuro(dish.estimatedCost)}</span>}
        {selected && (
          <span className={styles.check}>
            <Check size={14} strokeWidth={3} aria-hidden="true" />
            <span className="sr-only">(elegido)</span>
          </span>
        )}
      </span>
    </button>
  );
}
