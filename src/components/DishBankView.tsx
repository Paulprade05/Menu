'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Moon, Plus, Search, Sun, UtensilsCrossed, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { HeaderButton, PageHeader } from '@/components/ui/PageHeader';
import { Chip, ChipRow, EmptyState } from '@/components/ui/controls';
import { formatEuro, pluralize } from '@/lib/format';
import { ingredientsCost, normalizeText } from '@/lib/utils';
import type { DayKey, Dish, MealType } from '@/types';
import DishEditorModal from './DishEditorModal';
import styles from './DishBankView.module.css';

type TypeFilter = 'todos' | 'comida' | 'cena';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'comida', label: 'Comidas' },
  { value: 'cena', label: 'Cenas' },
];

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  comida: 'Comida',
  cena: 'Cena',
  ambas: 'Comida y cena',
};

const SHORT_DAY: Record<DayKey, string> = {
  lunes: 'lun',
  martes: 'mar',
  miercoles: 'mié',
  jueves: 'jue',
  viernes: 'vie',
  sabado: 'sáb',
  domingo: 'dom',
};

/** "pollo #rapido" -> ["pollo", "rapido"] (accent-insensitive) */
function searchTokens(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .map((token) => token.replace(/^#+/, ''))
    .filter(Boolean);
}

function dishHaystack(dish: Dish): string {
  return normalizeText(
    [dish.name, ...(dish.tags ?? []), ...(dish.ingredients ?? []).map((ingredient) => ingredient.name)].join('\n'),
  );
}

/** The dish's tags without empty or repeated ones ("Rápido" and "rapido" count once) */
function uniqueTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags ?? []) {
    const clean = typeof tag === 'string' ? tag.trim() : '';
    const key = normalizeText(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

interface TagOption {
  /** normalizeText(tag): "rápido" and "Rápido" are the same filter */
  key: string;
  /** The spelling used by most dishes */
  label: string;
}

interface EditorState {
  open: boolean;
  dish: Dish | null;
}

export default function DishBankView() {
  const { dishes, activeDays } = useApp();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  /** Normalized tag keys */
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editor, setEditor] = useState<EditorState>({ open: false, dish: null });

  const allTags = useMemo<TagOption[]>(() => {
    const spellings = new Map<string, Map<string, number>>();
    for (const dish of dishes) {
      for (const tag of uniqueTags(dish.tags)) {
        const key = normalizeText(tag);
        const counts = spellings.get(key) ?? new Map<string, number>();
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
        spellings.set(key, counts);
      }
    }
    const options: TagOption[] = [];
    for (const [key, counts] of spellings) {
      let label = '';
      let best = 0;
      for (const [spelling, count] of counts) {
        if (count > best) {
          best = count;
          label = spelling;
        }
      }
      options.push({ key, label });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [dishes]);

  // Ignore selected tags that no longer exist (e.g. the last dish with it was deleted)
  const activeTags = selectedTags.filter((key) => allTags.some((tag) => tag.key === key));

  /** dishId -> short day names where it is planned this week ("lun", "mié") */
  const plannedDays = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const day of activeDays) {
      const ids = new Set([day.comidaDishId, day.cenaDishId].filter((id): id is string => Boolean(id)));
      for (const id of ids) {
        const label = SHORT_DAY[day.dayKey] ?? day.dayLabel.slice(0, 3).toLowerCase();
        map.set(id, [...(map.get(id) ?? []), label]);
      }
    }
    return map;
  }, [activeDays]);

  const tokens = searchTokens(query);
  const filtersActive = tokens.length > 0 || typeFilter !== 'todos' || activeTags.length > 0;

  const filteredDishes = dishes.filter((dish) => {
    if (typeFilter !== 'todos' && dish.type !== 'ambas' && dish.type !== typeFilter) return false;
    if (activeTags.length > 0) {
      const dishTags = (dish.tags ?? []).map((tag) => normalizeText(tag));
      if (!activeTags.every((key) => dishTags.includes(key))) return false;
    }
    if (tokens.length > 0) {
      const haystack = dishHaystack(dish);
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setQuery('');
    setTypeFilter('todos');
    setSelectedTags([]);
  };

  const toggleTag = (key: string) => {
    setSelectedTags(activeTags.includes(key) ? activeTags.filter((k) => k !== key) : [...activeTags, key]);
  };

  const openCreate = () => setEditor({ open: true, dish: null });
  const openEdit = (dish: Dish) => setEditor({ open: true, dish });
  const closeEditor = () => setEditor((current) => ({ ...current, open: false }));

  const trimmedQuery = query.trim();

  return (
    <>
      <PageHeader
        title="Mis platos"
        subtitle={dishes.length > 0 ? pluralize(dishes.length, 'plato', 'platos') : 'Tu recetario'}
        actions={
          <HeaderButton icon={<Plus size={20} strokeWidth={2.5} />} label="Nuevo" variant="primary" showLabel onClick={openCreate} />
        }
      />

      <div className="view">
        {dishes.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed size={26} />}
            title="Aún no tienes platos"
            actions={
              <button type="button" className="btn btn-primary btn-lg" onClick={openCreate}>
                <Plus size={20} strokeWidth={2.5} />
                Crear mi primer plato
              </button>
            }
          >
            Guarda aquí tus comidas y cenas con sus ingredientes de Mercadona. Luego podrás planificar la semana y
            hacer la lista de la compra en un momento.
          </EmptyState>
        ) : (
          <>
            <div className={styles.filters}>
              <div className={`search-field ${styles.search}${query ? ` ${styles.hasQuery}` : ''}`}>
                <Search size={18} className="search-field__icon" aria-hidden="true" />
                <input
                  className="input"
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Buscar plato, ingrediente o etiqueta"
                  aria-label="Buscar platos"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    } else if (event.key === 'Escape' && query) {
                      event.preventDefault();
                      setQuery('');
                    }
                  }}
                />
                {query && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--muted search-field__clear"
                    aria-label="Borrar búsqueda"
                    onClick={() => setQuery('')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <ChipRow className={styles.chips}>
                {TYPE_FILTERS.map((filter) => (
                  <Chip key={filter.value} active={typeFilter === filter.value} onClick={() => setTypeFilter(filter.value)}>
                    {filter.label}
                  </Chip>
                ))}
                {allTags.length > 0 && <span className={styles.chipDivider} aria-hidden="true" />}
                {allTags.map((tag) => (
                  <Chip
                    key={tag.key}
                    active={activeTags.includes(tag.key)}
                    onClick={() => toggleTag(tag.key)}
                    ariaLabel={`Etiqueta ${tag.label}`}
                  >
                    #{tag.label}
                  </Chip>
                ))}
              </ChipRow>
            </div>

            {filtersActive && filteredDishes.length > 0 && (
              <div className={styles.results}>
                <span role="status">{pluralize(filteredDishes.length, 'resultado', 'resultados')}</span>
                <button type="button" className="text-btn text-btn--muted" onClick={clearFilters}>
                  Borrar filtros
                </button>
              </div>
            )}

            {filteredDishes.length === 0 ? (
              <EmptyState
                compact
                icon={<Search size={24} />}
                title="Sin resultados"
                actions={
                  <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                    Borrar filtros
                  </button>
                }
              >
                {trimmedQuery
                  ? `No hay platos que coincidan con «${trimmedQuery}».`
                  : 'Ningún plato cumple estos filtros.'}
              </EmptyState>
            ) : (
              <div className={`grid-cards ${styles.grid}`}>
                {filteredDishes.map((dish) => (
                  <DishCard key={dish.id} dish={dish} plannedDays={plannedDays.get(dish.id)} onOpen={() => openEdit(dish)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DishEditorModal open={editor.open} onClose={closeEditor} dishToEdit={editor.dish} />
    </>
  );
}

// ---------------------------------------------------------------------------

function MealTypeIcon({ type }: { type: MealType }) {
  if (type === 'comida') return <Sun size={13} strokeWidth={2.5} aria-hidden="true" />;
  if (type === 'cena') return <Moon size={13} strokeWidth={2.5} aria-hidden="true" />;
  return (
    <>
      <Sun size={13} strokeWidth={2.5} aria-hidden="true" />
      <Moon size={13} strokeWidth={2.5} aria-hidden="true" />
    </>
  );
}

function DishPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span className={styles.photo}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

const MAX_CARD_TAGS = 4;

function DishCard({ dish, plannedDays, onOpen }: { dish: Dish; plannedDays?: string[]; onOpen: () => void }) {
  const ingredients = dish.ingredients ?? [];
  const tags = uniqueTags(dish.tags);
  const cost = ingredientsCost(ingredients);
  const preview = ingredients
    .slice(0, 3)
    .map((ingredient) => ingredient.name)
    .join(' · ');
  const moreIngredients = ingredients.length - 3;
  const type: MealType = MEAL_TYPE_LABEL[dish.type] ? dish.type : 'comida';

  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      {dish.imageUrl && <DishPhoto key={dish.imageUrl} src={dish.imageUrl} />}

      <span className={styles.body}>
        <span className={styles.top}>
          <span className={`tag ${styles.typeTag}`}>
            <MealTypeIcon type={type} />
            {MEAL_TYPE_LABEL[type]}
          </span>
          {cost > 0 && <span className={`price ${styles.cost}`}>{formatEuro(cost)}</span>}
        </span>

        <span className={`${styles.name} clamp-2`}>{dish.name}</span>

        {tags.length > 0 && (
          <span className={styles.tags}>
            {tags.slice(0, MAX_CARD_TAGS).map((tag) => (
              <span key={tag} className="tag tag--outline">
                #{tag}
              </span>
            ))}
            {tags.length > MAX_CARD_TAGS && <span className="tag">+{tags.length - MAX_CARD_TAGS}</span>}
          </span>
        )}

        {ingredients.length > 0 && (
          <span className={`${styles.preview} clamp-2`}>
            {preview}
            {moreIngredients > 0 && <strong className={styles.more}> +{moreIngredients} más</strong>}
          </span>
        )}

        <span className={styles.footer}>
          <span className={styles.footerInfo}>
            <span>
              {ingredients.length > 0
                ? pluralize(ingredients.length, 'ingrediente', 'ingredientes')
                : 'Sin ingredientes: toca para añadirlos'}
            </span>
            {plannedDays && plannedDays.length > 0 && (
              <span className={`tag tag--ink ${styles.planned}`}>
                <CalendarDays size={13} strokeWidth={2.5} aria-hidden="true" />
                En el menú: {plannedDays.join(', ')}
              </span>
            )}
          </span>
          <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
