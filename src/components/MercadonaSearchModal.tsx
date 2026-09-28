'use client';

import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, Check, CheckCircle2, History, Plus, RotateCcw, Search, SearchX, Store, X } from 'lucide-react';
import Sheet, { SheetButton } from '@/components/ui/Sheet';
import { Chip, ChipRow, EmptyState, Thumb } from '@/components/ui/controls';
import { useApp } from '@/context/AppContext';
import { formatEuro, pluralize } from '@/lib/format';
import { normalizeText } from '@/lib/utils';
import type { MercadonaProduct } from '@/types';
import styles from './MercadonaSearchModal.module.css';

export interface MercadonaSearchModalProps {
  open: boolean;
  onClose: () => void;
  /** Called for every product the user adds. The sheet STAYS OPEN so several products can be added in a row. */
  onAddProduct: (product: MercadonaProduct) => void;
  /** Optional: offer adding the typed text as a free item without Mercadona product, e.g. "Papel de cocina" */
  onAddCustom?: (name: string) => void;
  /** default 'Buscar en Mercadona' */
  title?: string;
  initialQuery?: string;
  /** productId -> how many are already in the target (dish or list), to show "×2" badges */
  addedCounts?: Record<string, number>;
}

const QUICK_SEARCHES = [
  'Huevos',
  'Pollo',
  'Salmón',
  'Patatas',
  'Tomate',
  'Cebolla',
  'Arroz',
  'Pasta',
  'Leche',
  'Queso',
  'Aguacate',
  'Aceite',
  'Pan',
  'Yogur',
  'Plátano',
  'Café',
];

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const SKELETON_ROWS = 5;
const RECENT_KEY = 'menu_recent_searches';
const MAX_RECENT = 8;
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX_ENTRIES = 60;
const FLASH_MS = 2600;
/** Length of the "×N" pop animation (keep in sync with .pop in the CSS) */
const POP_MS = 420;

interface SearchResponse {
  hits?: MercadonaProduct[];
  totalCatalogSize?: number;
}

type Status = 'idle' | 'loading' | 'error' | 'empty' | 'results';

// ---------------------------------------------------------------------------
// Module-level memory shared between openings: going back to a search you
// already did (or reopening the sheet) is instant.
// ---------------------------------------------------------------------------

const resultCache = new Map<string, { hits: MercadonaProduct[]; at: number }>();
const catalogInfo: { size: number | null } = { size: null };

/** Fresh cached results (older than the TTL are dropped: prices change) */
function freshCacheSnapshot(): Map<string, MercadonaProduct[]> {
  const now = Date.now();
  const snapshot = new Map<string, MercadonaProduct[]>();
  for (const [key, entry] of resultCache) {
    if (now - entry.at > CACHE_TTL_MS) resultCache.delete(key);
    else snapshot.set(key, entry.hits);
  }
  return snapshot;
}

function storeInCache(key: string, hits: MercadonaProduct[]) {
  resultCache.delete(key);
  resultCache.set(key, { hits, at: Date.now() });
  while (resultCache.size > CACHE_MAX_ENTRIES) {
    const oldest = resultCache.keys().next().value;
    if (oldest === undefined) break;
    resultCache.delete(oldest);
  }
}

function rememberCatalogSize(size: number | undefined): number | null {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) catalogInfo.size = size;
  return catalogInfo.size;
}

function readKnownCatalogSize(): number | null {
  return catalogInfo.size;
}

// ---------------------------------------------------------------------------
// Recent searches (localStorage)
// ---------------------------------------------------------------------------

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string' || !item.trim()) continue;
      // Duplicates would also break the React keys of the chips
      const itemKey = searchKey(item);
      if (seen.has(itemKey)) continue;
      seen.add(itemKey);
      list.push(item.trim());
    }
    return list.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecentSearches(list: string[]) {
  try {
    if (list.length) window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    else window.localStorage.removeItem(RECENT_KEY);
  } catch {
    // Private mode or storage full: recents are only a convenience
  }
}

/**
 * Puts a query first in the recent searches and saves them. Reads the stored
 * list again (not React state) so it is safe to call from async callbacks.
 * Returns the new list, or null when the text is too short to be worth saving.
 */
function pushRecentSearch(text: string): string[] | null {
  const clean = tidyName(text);
  const cleanKey = searchKey(clean);
  if (cleanKey.length < MIN_QUERY_LENGTH) return null;
  const next = [clean, ...readRecentSearches().filter((item) => searchKey(item) !== cleanKey)].slice(0, MAX_RECENT);
  writeRecentSearches(next);
  return next;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "  Salmón  AHUMADO " -> "salmon ahumado" (cache key, chip matching) */
function searchKey(text: string): string {
  return normalizeText(text).replace(/\s+/g, ' ');
}

/** "papel de  cocina " -> "Papel de cocina" */
function tidyName(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** The live + catalogue merge could repeat a product: duplicate ids would break the rows (React keys, counts) */
function uniqueById(products: MercadonaProduct[]): MercadonaProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (!product || !product.id || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

class HttpError extends Error {}

function friendlyError(error: unknown): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Estás sin conexión. Revisa tu internet y vuelve a intentarlo.';
  }
  if (error instanceof HttpError) {
    return 'Mercadona no responde ahora mismo. Vuelve a intentarlo en un momento.';
  }
  return 'No se ha podido buscar. Vuelve a intentarlo.';
}

function referenceLabel(product: MercadonaProduct): string | null {
  if (typeof product.referencePrice !== 'number' || !(product.referencePrice > 0)) return null;
  return `${formatEuro(product.referencePrice)}/${product.referenceFormat || 'kg'}`;
}

function priceLabel(product: MercadonaProduct): string {
  return product.price > 0 ? formatEuro(product.price) : '—';
}

// ---------------------------------------------------------------------------
// On-screen keyboard detection (visual viewport). On iPhone a programmatic
// focus does not open the keyboard, so input focus alone is not enough.
// ---------------------------------------------------------------------------

function subscribeViewport(callback: () => void) {
  const vv = window.visualViewport;
  window.addEventListener('resize', callback);
  vv?.addEventListener('resize', callback);
  return () => {
    window.removeEventListener('resize', callback);
    vv?.removeEventListener('resize', callback);
  };
}

function keyboardSnapshot(): boolean {
  const vv = window.visualViewport;
  if (!vv || vv.scale > 1.05) return false;
  return window.innerHeight - vv.height > 120;
}

function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribeViewport, keyboardSnapshot, () => false);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MercadonaSearchModal(props: MercadonaSearchModalProps) {
  // Everything that belongs to one visit (query, results, adds) lives in
  // SearchSession, which mounts on every open, so it always starts clean.
  if (!props.open) return null;
  return <SearchSession {...props} />;
}

function SearchSession({
  onClose,
  onAddProduct,
  onAddCustom,
  title = 'Buscar en Mercadona',
  initialQuery = '',
  addedCounts,
}: MercadonaSearchModalProps) {
  const { settings, storeLabel } = useApp();
  const { postalCode, warehouse } = settings;
  const baseId = useId();

  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  /** Query that must be searched without waiting for the debounce (chips, recents, retry, Enter) */
  const instantKeyRef = useRef<string>(searchKey(initialQuery));
  /** Key whose request is already on its way (the debounce is over) */
  const sentKeyRef = useRef<string | null>(null);
  /** Enter was pressed while this key was loading: save it as a recent search when it has results */
  const rememberKeyRef = useRef<string | null>(null);

  const [query, setQuery] = useState(initialQuery);
  /** Bumped by Enter to skip what is left of the debounce */
  const [searchNow, setSearchNow] = useState(0);
  const [cache, setCache] = useState(freshCacheSnapshot);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [catalogSize, setCatalogSize] = useState<number | null>(readKnownCatalogSize);
  /** What the target already had when the sheet opened (the parent may update its counts live) */
  const [initialCounts] = useState<Record<string, number>>(() => ({ ...addedCounts }));
  const [adds, setAdds] = useState<Record<string, number>>({});
  /** Product that was just added: only its "×N" badge pops (not every added row when a list mounts again) */
  const [popped, setPopped] = useState<{ id: string; n: number } | null>(null);
  const [customAdds, setCustomAdds] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecentSearches);
  const [inputFocused, setInputFocused] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  /** Typing with the on-screen keyboard: it covers half the sheet, so we make room for the results */
  const typing = inputFocused && keyboardOpen;
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null);
  const [addAnnouncement, setAddAnnouncement] = useState('');

  const trimmed = query.trim();
  const normalized = searchKey(query);
  const canSearch = normalized.length >= MIN_QUERY_LENGTH;
  const key = `${postalCode}|${warehouse}|${normalized}`;
  const hits = canSearch ? cache.get(key) : undefined;
  const error = canSearch && !hits && failure?.key === key ? failure.message : null;
  const needsFetch = canSearch && !hits && !error;

  let status: Status = 'idle';
  if (canSearch) {
    if (hits) status = hits.length > 0 ? 'results' : 'empty';
    else status = error ? 'error' : 'loading';
  }

  // Debounced search. Old requests are aborted and results are stored per
  // query, so the results of an old query are never shown.
  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    const delay = instantKeyRef.current === normalized ? 0 : DEBOUNCE_MS;
    const timer = window.setTimeout(async () => {
      sentKeyRef.current = key;
      try {
        const params = new URLSearchParams({ q: trimmed, postalCode, warehouse });
        const response = await fetch(`/api/mercadona/search?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new HttpError(`HTTP ${response.status}`);
        const data = (await response.json()) as SearchResponse;
        const found = uniqueById(Array.isArray(data.hits) ? data.hits : []);
        const size = rememberCatalogSize(data.totalCatalogSize);
        if (size !== null) setCatalogSize(size);
        storeInCache(key, found);
        setCache((prev) => new Map(prev).set(key, found));
        if (rememberKeyRef.current === key) {
          rememberKeyRef.current = null;
          const nextRecent = found.length > 0 ? pushRecentSearch(trimmed) : null;
          if (nextRecent) setRecent(nextRecent);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setFailure({ key, message: friendlyError(err) });
      }
    }, delay);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (sentKeyRef.current === key) sentKeyRef.current = null;
    };
  }, [needsFetch, key, normalized, trimmed, postalCode, warehouse, searchNow]);

  // Catalogue size for the subtitle, even before the first search
  useEffect(() => {
    if (catalogSize !== null) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: '', postalCode, warehouse });
    fetch(`/api/mercadona/search?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<SearchResponse>) : null))
      .then((data) => {
        const size = rememberCatalogSize(data?.totalCatalogSize);
        if (size !== null) setCatalogSize(size);
      })
      .catch(() => {
        // Only decorative: the subtitle simply shows the store name
      });
    return () => controller.abort();
  }, [catalogSize, postalCode, warehouse]);

  // Hide the "added" confirmation after a moment
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  // The badge pops once, right after the add
  useEffect(() => {
    if (!popped) return;
    const timer = window.setTimeout(() => setPopped(null), POP_MS);
    return () => window.clearTimeout(timer);
  }, [popped]);

  // ---- Handlers -----------------------------------------------------------

  const scrollResultsToTop = () => {
    const scroller = bodyRef.current?.closest('.sheet-body');
    if (scroller) scroller.scrollTop = 0;
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setFailure(null);
    rememberKeyRef.current = null;
    scrollResultsToTop();
  };

  const dismissKeyboard = () => {
    const input = inputRef.current;
    if (input && document.activeElement === input) input.blur();
  };

  /** Chips, recents: search right away and get the keyboard out of the way */
  const runSearch = (text: string) => {
    instantKeyRef.current = searchKey(text);
    changeQuery(text);
    dismissKeyboard();
  };

  const clearQuery = () => {
    changeQuery('');
    inputRef.current?.focus({ preventScroll: true });
  };

  const retry = () => {
    instantKeyRef.current = normalized;
    setFailure(null);
  };

  const rememberSearch = (text: string) => {
    const next = pushRecentSearch(text);
    if (next) setRecent(next);
  };

  const clearRecent = () => {
    setRecent([]);
    writeRecentSearches([]);
  };

  const countFor = (productId: string) => (initialCounts[productId] ?? 0) + (adds[productId] ?? 0);

  const addProduct = (product: MercadonaProduct) => {
    onAddProduct(product);
    const count = countFor(product.id) + 1;
    setAdds((prev) => ({ ...prev, [product.id]: (prev[product.id] ?? 0) + 1 }));
    setPopped({ id: product.id, n: count });
    setAddAnnouncement(`Añadido: ${product.displayName}${count > 1 ? ` (×${count})` : ''}`);
    if (trimmed) rememberSearch(trimmed);
  };

  const addCustom = () => {
    if (!onAddCustom) return;
    const name = tidyName(trimmed);
    if (!name) return;
    onAddCustom(name);
    const nextCount = customAdds + 1;
    setCustomAdds(nextCount);
    setFlash({ id: nextCount, text: `«${name}» añadido sin precio` });
    setAddAnnouncement(`Añadido: ${name}`);
    changeQuery('');
    // Ready for the next one
    inputRef.current?.focus({ preventScroll: true });
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Desktop: Escape first clears the text; with the box empty it closes the sheet as usual
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      changeQuery('');
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (status === 'results') {
      rememberSearch(trimmed);
    } else if (status === 'loading') {
      // Save it once the results arrive, and do not wait for the rest of the debounce
      rememberKeyRef.current = key;
      if (sentKeyRef.current !== key) {
        instantKeyRef.current = normalized;
        setSearchNow((n) => n + 1);
      }
    }
    // iPhone: the "Buscar" key hides the keyboard so the results are visible
    if (typing) event.currentTarget.blur();
  };

  // ---- Derived UI ---------------------------------------------------------

  const totalAdded = Object.values(adds).reduce((sum, n) => sum + n, 0) + customAdds;
  const showQuickChips = !typing || trimmed === '';
  const activeChipKey = normalized;

  // Keep the highlighted quick search in view (typing "café" lights up the last chip, off screen)
  useEffect(() => {
    if (!showQuickChips) return;
    const row = toolbarRef.current?.querySelector<HTMLElement>('.chip-row');
    const chip = row?.querySelector<HTMLElement>('.chip.is-active');
    if (!row || !chip) return;
    const rowBox = row.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    if (chipBox.left >= rowBox.left && chipBox.right <= rowBox.right) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollTo({
      left: row.scrollLeft + chipBox.left - rowBox.left - (rowBox.width - chipBox.width) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeChipKey, showQuickChips]);

  const subtitle = catalogSize ? `${storeLabel} · ${catalogSize.toLocaleString('es-ES')} productos` : storeLabel;

  let statusAnnouncement = '';
  if (status === 'results' && hits) statusAnnouncement = pluralize(hits.length, 'producto', 'productos');
  else if (status === 'empty') statusAnnouncement = `No hay resultados para «${trimmed}»`;
  else if (status === 'error' && error) statusAnnouncement = error;

  const customLabel = `«${trimmed}»`;

  const toolbar = (
    <div ref={toolbarRef} className={styles.toolbar}>
      <div className="search-field">
        <Search size={18} className="search-field__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className={`input ${styles.searchInput}`}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          placeholder="Leche, pollo, tomate…"
          aria-label="Buscar productos"
          // With a prefilled search the results matter more than the keyboard
          data-autofocus={initialQuery ? undefined : true}
        />
        {query && (
          <button
            type="button"
            className="icon-btn icon-btn--muted search-field__clear"
            onClick={clearQuery}
            aria-label="Borrar búsqueda"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {showQuickChips && (
        <ChipRow>
          {QUICK_SEARCHES.map((chip) => (
            <Chip key={chip} active={searchKey(chip) === activeChipKey} onClick={() => runSearch(chip)}>
              {chip}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );

  const footer = (
    <SheetButton className="btn btn-primary btn-lg btn-block">
      {totalAdded > 0 ? `Listo · ${pluralize(totalAdded, 'añadido', 'añadidos')}` : 'Listo'}
    </SheetButton>
  );

  const customAddButton = onAddCustom ? (
    <button type="button" className={styles.customAdd} onClick={addCustom}>
      <span className={styles.customIcon} aria-hidden="true">
        <Plus size={18} strokeWidth={2.5} />
      </span>
      <span className={styles.customText}>
        <span className={styles.customLabel}>Añadir {customLabel} sin precio</span>
        <span className={styles.customHint}>Como producto libre, sin foto ni precio de Mercadona</span>
      </span>
    </button>
  ) : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="full"
      width="md"
      toolbar={toolbar}
      // While typing on a phone the keyboard takes half the screen: give the space to the results
      footer={typing ? undefined : footer}
    >
      <div ref={bodyRef} className={styles.body} onTouchMove={dismissKeyboard}>
        <p className="sr-only" role="status" aria-live="polite">
          {statusAnnouncement}
        </p>
        <p className="sr-only" aria-live="polite">
          {addAnnouncement}
        </p>

        {flash && (
          <div key={flash.id} className={styles.flash}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span className={styles.flashText}>{flash.text}</span>
          </div>
        )}

        {status === 'idle' && (
          <>
            {trimmed === '' && recent.length > 0 && (
              <section className={styles.recent} aria-labelledby={`${baseId}-recent`}>
                <div className={styles.recentHeader}>
                  <h3 id={`${baseId}-recent`} className={styles.recentTitle}>
                    Búsquedas recientes
                  </h3>
                  <button type="button" className={`text-btn text-btn--muted ${styles.recentClear}`} onClick={clearRecent}>
                    Borrar
                  </button>
                </div>
                <ChipRow wrap>
                  {recent.map((item) => (
                    <Chip key={item} icon={<History size={15} aria-hidden="true" />} onClick={() => runSearch(item)}>
                      {item}
                    </Chip>
                  ))}
                </ChipRow>
              </section>
            )}
            <EmptyState
              compact
              icon={<Store size={26} />}
              title={trimmed === '' ? 'Busca cualquier producto para ver su precio y foto' : 'Escribe al menos 2 letras'}
            >
              Toca un producto para añadirlo. Puedes añadir varios seguidos.
            </EmptyState>
          </>
        )}

        {status === 'loading' && (
          <>
            <p className={styles.countLine}>
              <span className="ellipsis">Buscando «{trimmed}»…</span>
            </p>
            <SkeletonList />
          </>
        )}

        {status === 'error' && error && (
          <>
            <div className={`notice notice--danger ${styles.errorBox}`}>
              <AlertCircle size={18} className={styles.errorIcon} aria-hidden="true" />
              <div className="grow">
                <p>{error}</p>
                <button type="button" className={`btn btn-secondary ${styles.retry}`} onClick={retry}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            </div>
            {customAddButton}
          </>
        )}

        {status === 'empty' && (
          <EmptyState
            compact
            icon={typing ? undefined : <SearchX size={26} />}
            title={`No hay resultados para «${trimmed}»`}
            actions={
              onAddCustom ? (
                <button type="button" className={`btn btn-primary btn-block ${styles.wrapBtn}`} onClick={addCustom}>
                  <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
                  <span>Añadir {customLabel} sin precio</span>
                </button>
              ) : undefined
            }
          >
            Prueba con una palabra más corta o más general, como «leche» o «queso».
          </EmptyState>
        )}

        {status === 'results' && hits && (
          <>
            <p className={styles.countLine}>
              <span>{pluralize(hits.length, 'producto', 'productos')}</span>
              <span className={styles.countHint}>Toca para añadir</span>
            </p>
            <div className={styles.results}>
              {hits.map((product, index) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  count={countFor(product.id)}
                  pop={popped?.id === product.id}
                  detailsId={`${baseId}-p${index}`}
                  onAdd={addProduct}
                />
              ))}
            </div>
            {customAddButton}
          </>
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function ProductRow({
  product,
  count,
  pop,
  detailsId,
  onAdd,
}: {
  product: MercadonaProduct;
  count: number;
  /** Just added: animate the badge once */
  pop: boolean;
  detailsId: string;
  onAdd: (product: MercadonaProduct) => void;
}) {
  const reference = referenceLabel(product);
  const price = priceLabel(product);
  const details = [product.brand, product.packaging, price, reference, count > 0 ? `ya añadido ×${count}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.item}>
      <button
        type="button"
        className={styles.itemButton}
        onClick={() => onAdd(product)}
        aria-label={`Añadir ${product.displayName}`}
        aria-describedby={detailsId}
      >
        <Thumb src={product.thumbnail || undefined} alt="" size={56} fit="contain" fallback={<Store size={22} />} />

        <span className={styles.info}>
          {(product.brand || product.packaging) && (
            <span className={styles.metaLine}>
              {product.brand && <span className={`tag ${styles.brand}`}>{product.brand}</span>}
              {product.packaging && <span className={`ellipsis ${styles.packaging}`}>{product.packaging}</span>}
            </span>
          )}
          <span className={`clamp-2 ${styles.name}`}>{product.displayName}</span>
          {reference && <span className={styles.reference}>{reference}</span>}
        </span>

        <span className={styles.side}>
          <span className={`price ${styles.price}`}>{price}</span>
          {count > 0 ? (
            <span key={count} className={`${styles.addedPill}${pop ? ` ${styles.pop}` : ''}`} aria-hidden="true">
              <Check size={16} strokeWidth={3} />×{count}
            </span>
          ) : (
            <span className={styles.addIcon} aria-hidden="true">
              <Plus size={20} strokeWidth={2.5} />
            </span>
          )}
        </span>

        <span id={detailsId} className="sr-only">
          {details}
        </span>
      </button>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className={styles.results} aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          <span className={`${styles.bone} ${styles.boneThumb}`} />
          <span className={styles.skeletonText}>
            <span className={`${styles.bone} ${styles.boneTag}`} />
            <span className={`${styles.bone} ${styles.boneLine}`} />
            <span className={`${styles.bone} ${styles.boneLineShort}`} />
          </span>
          <span className={styles.skeletonSide}>
            <span className={`${styles.bone} ${styles.bonePrice}`} />
            <span className={`${styles.bone} ${styles.boneButton}`} />
          </span>
        </div>
      ))}
    </div>
  );
}
