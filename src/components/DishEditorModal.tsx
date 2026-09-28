'use client';

import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Moon, Package, Pencil, Plus, Search, ShoppingCart, Sun, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUI } from '@/components/ui/UIProvider';
import Sheet, { SheetButton } from '@/components/ui/Sheet';
import { Chip, ChipRow, PriceInput, SegmentedControl, Stepper, Thumb, type SegmentOption } from '@/components/ui/controls';
import { formatEuro, parseDecimal, pluralize } from '@/lib/format';
import { ingredientsCost, lineTotal, newId, normalizeText, unitPrice } from '@/lib/utils';
import type { Dish, DishInput, Ingredient, MealType, MercadonaProduct } from '@/types';
import MercadonaSearchModal from './MercadonaSearchModal';
import styles from './DishEditorModal.module.css';

export interface DishEditorModalProps {
  open: boolean;
  onClose: () => void;
  /** null/undefined = create a new dish */
  dishToEdit?: Dish | null;
  /** Called after saving with the saved dish (new or updated) */
  onSaved?: (dish: Dish) => void;
  /** Prefill when creating (e.g. text typed in the dish picker) */
  initialName?: string;
  /** Preselect the meal type when creating from a menu slot */
  initialType?: MealType;
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

const MEAL_OPTIONS: SegmentOption<MealType>[] = [
  { value: 'comida', label: 'Comida', icon: <Sun size={16} strokeWidth={2.5} aria-hidden="true" /> },
  { value: 'cena', label: 'Cena', icon: <Moon size={16} strokeWidth={2.5} aria-hidden="true" /> },
  { value: 'ambas', label: 'Las dos' },
];

const MAX_QUANTITY = 999;

interface ManualDraft {
  name: string;
  quantity: number;
  unit: string;
  priceText: string;
}

const EMPTY_MANUAL: ManualDraft = { name: '', quantity: 1, unit: '', priceText: '' };

interface Draft {
  name: string;
  type: MealType;
  tags: string[];
  ingredients: Ingredient[];
  notes: string;
  imageUrl: string;
  manual: ManualDraft;
  tagText: string;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1) : value;
}

/** "  #sin gluten " -> "Sin gluten" */
function cleanTag(raw: string): string {
  return capitalizeFirst(raw.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 24));
}

function hasTag(tags: string[], tag: string): boolean {
  const key = normalizeText(tag);
  return tags.some((t) => normalizeText(t) === key);
}

/** Drops empty tags and repeated ones ("Rápido" + "rapido") from old or synced data */
function uniqueTags(tags: string[]): string[] {
  const result: string[] = [];
  for (const tag of tags) {
    const clean = typeof tag === 'string' ? tag.trim() : '';
    if (clean && !hasTag(result, clean)) result.push(clean);
  }
  return result;
}

/** Row keys and edits go by id: make sure every ingredient has its own (old data could repeat them) */
function withUniqueIds(ingredients: Ingredient[]): Ingredient[] {
  const seen = new Set<string>();
  return ingredients.map((ingredient, index) => {
    let id = ingredient.id || `ing-${index}`;
    while (seen.has(id)) id = `${id}-${index}`;
    seen.add(id);
    return id === ingredient.id ? ingredient : { ...ingredient, id };
  });
}

/** Adds the tag typed but not confirmed yet */
function withPendingTag(tags: string[], tagText: string): string[] {
  const tag = cleanTag(tagText);
  return tag && !hasTag(tags, tag) ? [...tags, tag] : tags;
}

function manualToIngredient(manual: ManualDraft): Ingredient | null {
  const name = manual.name.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  return {
    id: newId('ing'),
    name: capitalizeFirst(name),
    quantity: Math.min(MAX_QUANTITY, Math.max(1, manual.quantity || 1)),
    unit: manual.unit.trim() || 'ud',
    estimatedPrice: Math.max(0, parseDecimal(manual.priceText) ?? 0),
  };
}

function draftSignature(draft: Pick<Draft, 'name' | 'type' | 'tags' | 'ingredients' | 'notes' | 'imageUrl'>): string {
  return JSON.stringify([
    draft.name.trim(),
    draft.type,
    [...draft.tags].sort(),
    draft.ingredients.map((i) => [i.id, i.name, i.quantity, i.unit, unitPrice(i)]),
    draft.notes.trim(),
    draft.imageUrl.trim(),
  ]);
}

/** ["lunes", "martes", "jueves"] -> "lunes, martes y jueves" */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/**
 * What the user pastes in "Foto (enlace)": "www.web.com/foto.jpg" -> "https://www.web.com/foto.jpg".
 * Returns '' when the text is not a usable link (it would never load in the card).
 */
function normalizeImageUrl(raw: string): string {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return '';
  if (/^https?:\/\/\S+$/i.test(value) || /^data:image\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/.test(value)) return `https://${value}`;
  return '';
}

/**
 * PriceInput keeps what you type until it loses focus. Before saving or closing,
 * blur the focused field and wait a tick so its value reaches our state.
 */
async function commitFocusedField(): Promise<void> {
  const element = typeof document !== 'undefined' ? document.activeElement : null;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.blur();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export default function DishEditorModal({ open, ...props }: DishEditorModalProps) {
  if (!open) return null;
  // Mounted only while open: every time it opens the draft starts again from the props
  return <DishEditorSheet key={props.dishToEdit?.id ?? 'new'} {...props} />;
}

function DishEditorSheet({ onClose, dishToEdit, onSaved, initialName, initialType }: Omit<DishEditorModalProps, 'open'>) {
  const { addDish, updateDish, deleteDish, getDishById, dishes, activeDays } = useApp();
  const { confirm, showToast } = useUI();
  const isNew = !dishToEdit;
  const uid = useId();

  const [initial] = useState(() => ({
    name: dishToEdit?.name ?? capitalizeFirst((initialName ?? '').trim()),
    type: dishToEdit?.type ?? initialType ?? 'comida',
    tags: uniqueTags(dishToEdit?.tags ?? []),
    ingredients: withUniqueIds(dishToEdit?.ingredients ?? []),
    notes: dishToEdit?.notes ?? '',
    imageUrl: dishToEdit?.imageUrl ?? '',
  }));

  const [name, setName] = useState(initial.name);
  const [nameError, setNameError] = useState(false);
  const [type, setType] = useState<MealType>(initial.type);
  const [tags, setTags] = useState<string[]>(initial.tags);
  /** Tags typed in this visit: they keep their chip even after being unselected */
  const [typedTags, setTypedTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>(initial.ingredients);
  const [notes, setNotes] = useState(initial.notes);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [photoChecked, setPhotoChecked] = useState(false);
  const [manual, setManual] = useState<ManualDraft>(EMPTY_MANUAL);
  const [manualOpen, setManualOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const manualNameRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  /** Save/delete already running: a second quick tap must not save (or delete) twice while the sheet closes */
  const busyRef = useRef(false);

  const draft: Draft = { name, type, tags, ingredients, notes, imageUrl, manual, tagText };
  const dirty =
    draftSignature(draft) !== draftSignature(initial) || manual.name.trim() !== '' || tagText.trim() !== '';

  // Latest values for the async save/close handlers (they run after a tick)
  const latest = useRef({ draft, dirty });
  useLayoutEffect(() => {
    latest.current = { draft, dirty };
  });

  const total = ingredientsCost(ingredients);

  const addedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ingredient of ingredients) {
      const productId = ingredient.mercadonaProduct?.id;
      if (productId) counts[productId] = (counts[productId] ?? 0) + (ingredient.quantity || 1);
    }
    return counts;
  }, [ingredients]);

  // Common tags + tags used in any dish + tags of this draft (no duplicates, accent-insensitive)
  const tagOptions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const push = (tag: string) => {
      const key = normalizeText(tag);
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push(tag);
    };
    COMMON_TAGS.forEach(push);
    initial.tags.forEach(push);
    dishes.forEach((dish) => (dish.tags ?? []).forEach(push));
    typedTags.forEach(push);
    tags.forEach(push);
    return list;
  }, [dishes, initial.tags, typedTags, tags]);

  // ---- Ingredients --------------------------------------------------------

  const updateIngredient = (id: string, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((ingredient) => (ingredient.id === id ? { ...ingredient, ...patch } : ingredient)));
  };

  const removeIngredient = (ingredient: Ingredient) => {
    const index = ingredients.findIndex((i) => i.id === ingredient.id);
    setIngredients((prev) => prev.filter((i) => i.id !== ingredient.id));
    showToast(`«${ingredient.name}» quitado`, {
      actionLabel: 'Deshacer',
      onAction: () =>
        setIngredients((prev) =>
          prev.some((i) => i.id === ingredient.id) ? prev : [...prev.slice(0, index), ingredient, ...prev.slice(index)],
        ),
    });
  };

  const addProduct = (product: MercadonaProduct) => {
    const id = newId('ing');
    setIngredients((prev) => {
      const existing = prev.find((i) => i.mercadonaProduct?.id === product.id);
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: Math.min(MAX_QUANTITY, (i.quantity || 1) + 1) } : i));
      }
      return [
        ...prev,
        {
          id,
          name: product.displayName,
          quantity: 1,
          unit: product.packaging || 'ud',
          estimatedPrice: product.price || 0,
          mercadonaProduct: product,
        },
      ];
    });
  };

  const addCustom = (rawName: string) => {
    const ingredient = manualToIngredient({ ...EMPTY_MANUAL, name: rawName });
    if (!ingredient) return;
    setIngredients((prev) => {
      const key = normalizeText(ingredient.name);
      const existing = prev.find((i) => !i.mercadonaProduct && normalizeText(i.name) === key);
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: Math.min(MAX_QUANTITY, (i.quantity || 1) + 1) } : i));
      }
      return [...prev, ingredient];
    });
  };

  const addManual = () => {
    const ingredient = manualToIngredient(manual);
    if (ingredient) {
      setIngredients((prev) => [...prev, ingredient]);
      setManual(EMPTY_MANUAL);
    }
    manualNameRef.current?.focus();
  };

  // ---- Tags ---------------------------------------------------------------

  const toggleTag = (tag: string) => {
    setTags((prev) => (hasTag(prev, tag) ? prev.filter((t) => normalizeText(t) !== normalizeText(tag)) : [...prev, tag]));
  };

  const addTypedTag = () => {
    const tag = cleanTag(tagText);
    if (tag) {
      // Reuse the existing spelling when the tag already exists ("rapido" -> "Rápido")
      const known = tagOptions.find((t) => normalizeText(t) === normalizeText(tag)) ?? tag;
      setTags((prev) => (hasTag(prev, known) ? prev : [...prev, known]));
      setTypedTags((prev) => (hasTag(prev, known) ? prev : [...prev, known]));
    }
    setTagText('');
    tagInputRef.current?.focus();
  };

  // ---- Save / delete / close ---------------------------------------------

  const handleSave = async (): Promise<boolean> => {
    // The sheet takes a moment to close: a second tap would create the dish twice
    if (busyRef.current) return false;
    if (!name.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      return false;
    }
    busyRef.current = true;

    await commitFocusedField();
    const { draft: d, dirty: changed } = latest.current;

    // Nothing changed: just close (no toast, no needless sync of the dish)
    const stored = dishToEdit ? getDishById(dishToEdit.id) : undefined;
    if (stored && !changed) {
      onSaved?.(stored);
      return true;
    }

    const pendingIngredient = manualToIngredient(d.manual);

    const input: DishInput = {
      name: capitalizeFirst(d.name.replace(/\s+/g, ' ').trim()),
      type: d.type,
      tags: withPendingTag(d.tags, d.tagText),
      ingredients: pendingIngredient ? [...d.ingredients, pendingIngredient] : d.ingredients,
      notes: d.notes.trim() || undefined,
      imageUrl: normalizeImageUrl(d.imageUrl) || undefined,
    };

    // If the dish was deleted meanwhile (e.g. from another device), save it as a new one
    const updated = dishToEdit ? updateDish(dishToEdit.id, input) : undefined;
    const saved = updated ?? addDish(input);

    showToast(updated ? 'Cambios guardados' : `«${saved.name}» añadido a tus platos`, { tone: 'success' });
    onSaved?.(saved);
    return true;
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!dishToEdit || busyRef.current) return false;
    busyRef.current = true;
    const plannedDays = activeDays
      .filter((day) => day.comidaDishId === dishToEdit.id || day.cenaDishId === dishToEdit.id)
      .map((day) => day.dayLabel.toLowerCase());

    const ok = await confirm({
      title: `¿Eliminar «${dishToEdit.name}»?`,
      message:
        plannedDays.length > 0
          ? `Lo tienes en el menú de esta semana (${joinList(plannedDays)}), así que también se quitará de ahí. Podrás deshacerlo justo después.`
          : 'Podrás deshacerlo justo después.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) {
      busyRef.current = false;
      return false;
    }
    deleteDish(dishToEdit.id);
    return true;
  };

  const handleRequestClose = async (): Promise<boolean> => {
    // Saving or deleting: that action closes the sheet itself
    if (busyRef.current) return false;
    await commitFocusedField();
    if (!latest.current.dirty) return true;
    return confirm({
      title: '¿Descartar los cambios?',
      message: isNew ? 'Este plato todavía no se ha guardado.' : 'Los cambios que has hecho en este plato se perderán.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
      destructive: true,
    });
  };

  const nameId = `${uid}-name`;
  const nameErrorId = `${uid}-name-error`;
  const manualId = `${uid}-manual`;
  const notesId = `${uid}-notes`;
  const photoId = `${uid}-photo`;
  const photoHintId = `${uid}-photo-hint`;
  const photoUrl = normalizeImageUrl(imageUrl);
  // Only complain once the field is left, not while the link is being typed
  const photoInvalid = photoChecked && imageUrl.trim() !== '' && !photoUrl;

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={isNew ? 'Nuevo plato' : 'Editar plato'}
        size="full"
        width="lg"
        onRequestClose={handleRequestClose}
        footer={
          <SheetButton force className="btn btn-primary btn-lg btn-block" onClick={handleSave}>
            <Check size={20} strokeWidth={2.5} />
            Guardar plato
          </SheetButton>
        }
      >
        {/* Name */}
        <div className="field">
          <label className="field-label" htmlFor={nameId}>
            Nombre
          </label>
          <input
            ref={nameRef}
            id={nameId}
            className={`input ${styles.nameInput}`}
            type="text"
            placeholder="Ej: Lentejas con verduras"
            autoCapitalize="sentences"
            autoComplete="off"
            enterKeyHint="next"
            maxLength={80}
            value={name}
            aria-invalid={nameError || undefined}
            aria-describedby={nameError ? nameErrorId : undefined}
            data-autofocus={isNew ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError && event.target.value.trim()) setNameError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
          {nameError && (
            <p id={nameErrorId} className="field-error" role="alert">
              Ponle un nombre al plato para poder guardarlo.
            </p>
          )}
        </div>

        {/* Meal type */}
        <div className="field">
          <span className="field-label">Momento</span>
          <SegmentedControl options={MEAL_OPTIONS} value={type} onChange={setType} ariaLabel="Momento del día" />
        </div>

        {/* Ingredients */}
        <h3 className="section-title">
          Ingredientes{ingredients.length > 0 && ` (${ingredients.length})`}
          <span className="section-title__aside">
            Total <span className={`price ${styles.total}`}>{formatEuro(total)}</span>
          </span>
        </h3>

        {ingredients.length === 0 ? (
          <div className={styles.ingEmpty}>
            <ShoppingCart size={22} aria-hidden="true" />
            <p>
              <strong>Aún no hay ingredientes</strong>
              Añádelos de Mercadona o a mano. Se usan para calcular el precio y hacer tu lista de la compra.
            </p>
          </div>
        ) : (
          <div className="list">
            {ingredients.map((ingredient) => (
              <IngredientRow
                key={ingredient.id}
                ingredient={ingredient}
                onChange={(patch) => updateIngredient(ingredient.id, patch)}
                onRemove={() => removeIngredient(ingredient)}
              />
            ))}
          </div>
        )}

        <div className={styles.addActions}>
          <button type="button" className="btn btn-primary" onClick={() => setSearchOpen(true)}>
            <Search size={18} strokeWidth={2.5} />
            Añadir de Mercadona
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${manualOpen ? styles.toggleOpen : ''}`}
            aria-expanded={manualOpen}
            aria-controls={manualId}
            onClick={() => {
              // Closing the form discards what was typed in it
              if (manualOpen) setManual(EMPTY_MANUAL);
              setManualOpen(!manualOpen);
            }}
          >
            <Pencil size={17} />
            Añadir a mano
            <ChevronDown size={18} className={styles.toggleIcon} aria-hidden="true" />
          </button>
        </div>

        {manualOpen && (
          <ManualIngredientForm
            id={manualId}
            value={manual}
            onChange={setManual}
            onAdd={addManual}
            inputRef={manualNameRef}
          />
        )}

        {/* Tags */}
        <h3 className="section-title">
          Etiquetas
          {tags.length > 0 && <span className="section-title__aside">{pluralize(tags.length, 'elegida', 'elegidas')}</span>}
        </h3>
        <ChipRow wrap className={styles.tagChips}>
          {tagOptions.map((tag) => (
            <Chip key={tag} active={hasTag(tags, tag)} onClick={() => toggleTag(tag)}>
              {tag}
            </Chip>
          ))}
        </ChipRow>
        <div className={`input-row ${styles.tagInputRow}`}>
          <input
            ref={tagInputRef}
            className={`input ${styles.compactInput}`}
            type="text"
            placeholder="Otra etiqueta"
            aria-label="Nueva etiqueta"
            autoCapitalize="sentences"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={24}
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTypedTag();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addTypedTag} disabled={!cleanTag(tagText)}>
            <Plus size={18} strokeWidth={2.5} />
            Añadir
          </button>
        </div>

        {/* Notes & photo */}
        <h3 className="section-title">Más detalles</h3>
        <div className="field">
          <label className="field-label" htmlFor={notesId}>
            Notas o pasos de preparación <span className={styles.optional}>(opcional)</span>
          </label>
          <textarea
            id={notesId}
            className="input"
            rows={4}
            placeholder="Ej: Sofríe la verdura, añade las lentejas y deja cocer 30 minutos."
            autoCapitalize="sentences"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={photoId}>
            Foto (enlace) <span className={styles.optional}>(opcional)</span>
          </label>
          <input
            id={photoId}
            className={`input ${styles.urlInput}`}
            type="url"
            inputMode="url"
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-describedby={photoHintId}
            aria-invalid={photoInvalid || undefined}
            value={imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value);
              setPhotoChecked(false);
            }}
            onBlur={() => setPhotoChecked(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
          {photoInvalid ? (
            <p id={photoHintId} className="field-error" role="alert">
              Eso no parece un enlace. Copia la dirección de la imagen (empieza por https://).
            </p>
          ) : (
            <p id={photoHintId} className="field-hint">
              Pega el enlace de una imagen para verla en la tarjeta del plato.
            </p>
          )}
          {photoUrl && (photoChecked || photoUrl === imageUrl.trim()) && (
            <PhotoPreview key={photoUrl} src={photoUrl} onRemove={() => setImageUrl('')} />
          )}
        </div>

        {dishToEdit && (
          <div className={styles.dangerZone}>
            <SheetButton force className="btn btn-danger btn-block" onClick={handleDelete}>
              <Trash2 size={18} />
              Eliminar plato
            </SheetButton>
          </div>
        )}
      </Sheet>

      <MercadonaSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddProduct={addProduct}
        onAddCustom={addCustom}
        addedCounts={addedCounts}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function IngredientRow({
  ingredient,
  onChange,
  onRemove,
}: {
  ingredient: Ingredient;
  onChange: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
}) {
  const product = ingredient.mercadonaProduct;
  const unit = ingredient.unit && ingredient.unit !== 'ud' ? ingredient.unit : '';
  const meta = product
    ? [product.brand, product.packaging].filter(Boolean).join(' · ') || 'Mercadona'
    : ['Añadido a mano', unit].filter(Boolean).join(' · ');

  return (
    <div className={`list-row ${styles.ingRow}`}>
      <span className={styles.ingThumb}>
        <Thumb
          src={product?.thumbnail}
          alt=""
          size={44}
          fallback={product ? <Package size={20} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
        />
      </span>

      <div className={styles.ingMain}>
        <div className={`list-row__title clamp-2 ${styles.ingName}`}>{ingredient.name}</div>
        <div className="list-row__meta ellipsis">{meta}</div>
      </div>

      <div className={styles.ingControls}>
        <Stepper
          size="sm"
          value={ingredient.quantity || 1}
          max={MAX_QUANTITY}
          onChange={(quantity) => onChange({ quantity })}
          label={`Cantidad de ${ingredient.name}`}
        />
        <span className={styles.op} aria-hidden="true">
          ×
        </span>
        <PriceInput
          size="sm"
          value={unitPrice(ingredient)}
          onChange={(price) => onChange({ estimatedPrice: Math.max(0, price) })}
          ariaLabel={`Precio de ${ingredient.name}`}
        />
        <span className={styles.op} aria-hidden="true">
          =
        </span>
        <span className={`price ${styles.lineTotal}`}>{formatEuro(lineTotal(ingredient))}</span>
      </div>

      <button
        type="button"
        className={`icon-btn icon-btn--sm icon-btn--danger ${styles.ingRemove}`}
        onClick={onRemove}
        aria-label={`Quitar ${ingredient.name}`}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function ManualIngredientForm({
  id,
  value,
  onChange,
  onAdd,
  inputRef,
}: {
  id: string;
  value: ManualDraft;
  onChange: (value: ManualDraft) => void;
  onAdd: () => void;
  inputRef: React.Ref<HTMLInputElement>;
}) {
  const set = (patch: Partial<ManualDraft>) => onChange({ ...value, ...patch });

  // Enter adds the ingredient (it never saves or closes the dish)
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAdd();
    }
  };

  return (
    <div id={id} className={styles.manual} role="group" aria-label="Añadir ingrediente a mano">
      <label className={styles.miniLabel} htmlFor={`${id}-name`}>
        Ingrediente
      </label>
      <input
        ref={inputRef}
        id={`${id}-name`}
        className={`input ${styles.compactInput}`}
        type="text"
        placeholder="Ej: Sal, ajo, pimienta…"
        autoCapitalize="sentences"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={80}
        autoFocus
        value={value.name}
        onChange={(event) => set({ name: event.target.value })}
        onKeyDown={onEnter}
      />

      <div className={styles.manualGrid}>
        <div className={styles.manualCell}>
          <span className={styles.miniLabel} aria-hidden="true">
            Cantidad
          </span>
          <Stepper value={value.quantity} max={MAX_QUANTITY} onChange={(quantity) => set({ quantity })} label="Cantidad" />
        </div>

        <div className={styles.manualCell}>
          <label className={styles.miniLabel} htmlFor={`${id}-unit`}>
            Unidad
          </label>
          <input
            id={`${id}-unit`}
            className={`input ${styles.compactInput}`}
            type="text"
            placeholder="ud, g, kg…"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={16}
            value={value.unit}
            onChange={(event) => set({ unit: event.target.value })}
            onKeyDown={onEnter}
          />
        </div>

        <div className={styles.manualCell}>
          <span className={styles.miniLabel} aria-hidden="true">
            Precio/ud
          </span>
          <label className={`price-input ${styles.manualPrice}`}>
            <input
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              aria-label="Precio por unidad"
              placeholder="0,00"
              value={value.priceText}
              onChange={(event) => set({ priceText: event.target.value.replace(/[^\d.,]/g, '').slice(0, 9) })}
              onKeyDown={onEnter}
            />
            <span className="price-input__suffix" aria-hidden="true">
              €
            </span>
          </label>
        </div>

        <div className={`${styles.manualCell} ${styles.manualAddCell}`}>
          <button type="button" className="btn btn-primary btn-block" onClick={onAdd} disabled={!value.name.trim()}>
            <Plus size={18} strokeWidth={2.5} />
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoPreview({ src, onRemove }: { src: string; onRemove: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.photoPreview}>
      {failed ? (
        <p className={styles.photoError}>No se puede cargar la imagen de ese enlace.</p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Vista previa de la foto" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
      <button type="button" className="text-btn text-btn--danger" onClick={onRemove}>
        <Trash2 size={16} />
        Quitar foto
      </button>
    </div>
  );
}
