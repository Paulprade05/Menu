'use client';

import React, { Fragment, useEffect, useId, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Share,
  ShoppingCart,
  Sun,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUI } from '@/components/ui/UIProvider';
import Sheet, { useSheet } from '@/components/ui/Sheet';
import { HeaderButton, PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Thumb } from '@/components/ui/controls';
import { formatEuro, pluralize, roundMoney } from '@/lib/format';
import { lineTotal, normalizeText, shareOrCopy, unitPrice } from '@/lib/utils';
import type { MercadonaProduct, ShoppingListItem } from '@/types';
import MercadonaSearchModal from './MercadonaSearchModal';
import ShoppingItemSheet from './ShoppingItemSheet';
import styles from './ShoppingListView.module.css';

/*
 * Lista de la compra — pensada para usarla dentro del súper con una mano:
 * tocar un producto lo mete en el carro. Se queda un momento en su sitio
 * (por si ha sido sin querer) y luego baja a «En el carro».
 */

/** How long a just-ticked item stays in place before moving to the cart */
const LINGER_MS = 1100;
/** Sheet close animation (220 ms) plus a small margin */
const AFTER_SHEET_MS = 240;
/** These go at the end, after the Mercadona categories */
const LAST_CATEGORIES = ['Despensa y frescos', 'Otros'];

interface CategoryGroup {
  category: string;
  items: ShoppingListItem[];
  /** Unchecked items in the group */
  pendingCount: number;
  pendingCost: number;
}

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function categoryOf(item: ShoppingListItem): string {
  return item.category?.trim() || 'Otros';
}

function compareCategories(a: string, b: string): number {
  const rankA = LAST_CATEGORIES.indexOf(a);
  const rankB = LAST_CATEGORIES.indexOf(b);
  if (rankA !== rankB) return rankA - rankB;
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

function compareNames(a: ShoppingListItem, b: ShoppingListItem): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

function groupByCategory(items: ShoppingListItem[]): CategoryGroup[] {
  const map = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const category = categoryOf(item);
    const list = map.get(category);
    if (list) list.push(item);
    else map.set(category, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => compareCategories(a, b))
    .map(([category, list]) => {
      const pending = list.filter((i) => !i.checked);
      return {
        category,
        items: [...list].sort(compareNames),
        pendingCount: pending.length,
        pendingCost: roundMoney(pending.reduce((acc, i) => acc + lineTotal(i), 0)),
      };
    });
}

function buildShareText(items: ShoppingListItem[], store: string, total: number): string {
  const lines = [`🛒 Lista de la compra · ${store}`];
  for (const group of groupByCategory(items)) {
    lines.push('', group.category);
    for (const item of group.items) {
      const quantity = item.quantity > 1 ? `${item.quantity} × ` : '';
      const price = lineTotal(item);
      lines.push(`• ${quantity}${item.name}${price > 0 ? ` — ${formatEuro(price)}` : ''}`);
    }
  }
  if (total > 0) lines.push('', `Total estimado: ${formatEuro(total)}`);
  return lines.join('\n');
}

/** Black & white confetti when the last product goes into the cart */
function celebrate() {
  try {
    void confetti({
      particleCount: 90,
      spread: 80,
      startVelocity: 38,
      origin: { y: 0.72 },
      colors: ['#0a0a0a', '#475569', '#cbd5e1'],
      disableForReducedMotion: true,
      zIndex: 150,
    });
  } catch {
    // purely decorative
  }
}

// ---------------------------------------------------------------------------
// Keep the screen on while shopping (Screen Wake Lock API)
// ---------------------------------------------------------------------------

interface WakeLockControl {
  supported: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const WAKE_LOCK_KEY = 'menu_wake_lock_on';

function useScreenWakeLock(): WakeLockControl {
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  // Remembered for the session: switching to another tab and back keeps it on
  const [enabled, setEnabledState] = useState(() => {
    try {
      return sessionStorage.getItem(WAKE_LOCK_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    try {
      if (value) sessionStorage.setItem(WAKE_LOCK_KEY, '1');
      else sessionStorage.removeItem(WAKE_LOCK_KEY);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!supported || !enabled) return;
    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;
    let disposed = false;

    const acquire = async () => {
      if (requesting || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (disposed) {
          lock.release().catch(() => {});
        } else {
          sentinel = lock;
        }
      } catch {
        // Not allowed right now (e.g. Low Power Mode): ignore
      } finally {
        requesting = false;
      }
    };

    // The system releases the lock when the app goes to the background
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel && !sentinel.released) sentinel.release().catch(() => {});
      sentinel = null;
    };
  }, [supported, enabled]);

  return { supported, enabled, setEnabled };
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function ShoppingListView() {
  const {
    shoppingList,
    toggleShoppingItem,
    clearCheckedShoppingItems,
    clearAllShoppingItems,
    uncheckAllShoppingItems,
    addShoppingItem,
    generateShoppingListFromMenu,
    plannedMealsCount,
    shoppingTotalCost,
    shoppingPendingCost,
    shoppingCheckedCost,
    checkedItemsCount,
    pendingItemsCount,
    totalItemsCount,
    storeLabel,
    setActiveTab,
  } = useApp();
  const { showToast, confirm } = useUI();

  const [addOpen, setAddOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  /** Items just ticked that stay in place for a moment */
  const [lingering, setLingering] = useState<string[]>([]);
  const lingerTimers = useRef(new Map<string, number>());
  const wakeLock = useScreenWakeLock();

  useEffect(() => {
    const timers = lingerTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // ---- Derived data --------------------------------------------------------
  const isEmpty = totalItemsCount === 0;
  const allDone = !isEmpty && pendingItemsCount === 0;
  const progress = isEmpty ? 0 : Math.round((checkedItemsCount / totalItemsCount) * 100);
  const hasLeavingRows = shoppingList.some((i) => i.checked && lingering.includes(i.id));
  // Wait until the last ticked row has left: the card appears at the top and
  // would push that row away from the finger that may want to untick it.
  const showDone = allDone && !hasLeavingRows;

  const groups = groupByCategory(shoppingList.filter((i) => !i.checked || lingering.includes(i.id)));
  const cartItems = shoppingList
    .filter((i) => i.checked && !lingering.includes(i.id))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)); // last ticked first
  const cartCost = roundMoney(cartItems.reduce((acc, i) => acc + lineTotal(i), 0));

  // Products added by hand and still pending: "×2" badges in the search sheet
  const addedCounts: Record<string, number> = {};
  for (const item of shoppingList) {
    const productId = item.mercadonaProduct?.id;
    if (item.isManual && !item.checked && productId) {
      addedCounts[productId] = (addedCounts[productId] ?? 0) + item.quantity;
    }
  }

  const subtitle = isEmpty
    ? 'Vacía'
    : allDone
      ? 'Todo en el carro'
      : shoppingPendingCost > 0
        ? `${pendingItemsCount} por comprar · ${formatEuro(shoppingPendingCost)}`
        : `${pendingItemsCount} por comprar`;

  // ---- Actions -------------------------------------------------------------
  const stopLingering = (id: string) => {
    const timer = lingerTimers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      lingerTimers.current.delete(id);
    }
  };

  const handleToggle = (item: ShoppingListItem) => {
    toggleShoppingItem(item.id);
    stopLingering(item.id);

    if (item.checked) {
      // Back to the list (also undoes a tap made by mistake)
      setLingering((prev) => prev.filter((id) => id !== item.id));
      return;
    }

    setLingering((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    lingerTimers.current.set(
      item.id,
      window.setTimeout(() => {
        lingerTimers.current.delete(item.id);
        setLingering((prev) => prev.filter((id) => id !== item.id));
      }, LINGER_MS),
    );
    if (pendingItemsCount === 1) celebrate();
  };

  const handleAddProduct = (product: MercadonaProduct) => {
    addShoppingItem({ name: product.displayName, product });
  };

  // The search sheet shows its own "añadido" confirmation
  const handleAddCustom = (name: string) => {
    const clean = name.trim();
    if (clean) addShoppingItem({ name: clean });
  };

  const handleShare = async () => {
    const pending = shoppingList.filter((i) => !i.checked);
    if (pending.length === 0) return;
    const text = buildShareText(pending, storeLabel, shoppingPendingCost);
    const result = await shareOrCopy({ title: 'Lista de la compra', text });
    if (result === 'copied') {
      showToast('Lista copiada. Pégala en WhatsApp.', { tone: 'success' });
    } else if (result === 'failed') {
      showToast('No se ha podido compartir la lista', { tone: 'error' });
    }
  };

  const requestClearAll = async () => {
    const count = shoppingList.length;
    if (count === 0) return;
    const ok = await confirm({
      title: '¿Vaciar la lista?',
      message: count === 1 ? 'Se quitará el producto de la lista.' : `Se quitarán los ${count} productos.`,
      confirmLabel: 'Vaciar',
      destructive: true,
    });
    if (ok) clearAllShoppingItems();
  };

  // ---- Render --------------------------------------------------------------
  return (
    <>
      <PageHeader
        title="Lista de la compra"
        subtitle={subtitle}
        actions={
          <>
            <HeaderButton icon={<Plus size={20} strokeWidth={2.5} />} label="Añadir" variant="primary" showLabel onClick={() => setAddOpen(true)} />
            {/* Phones: the header has no room for it (the title gets cut), it lives in Opciones */}
            {pendingItemsCount > 0 && (
              <span className={`hide-mobile ${styles.headerSlot}`}>
                <HeaderButton icon={<Share size={19} />} label="Compartir" onClick={() => void handleShare()} />
              </span>
            )}
            <HeaderButton icon={<MoreHorizontal size={21} />} label="Opciones" onClick={() => setOptionsOpen(true)} />
          </>
        }
      >
        {!isEmpty && (
          <div className={styles.progressBox}>
            <div
              className={`progress ${styles.progress}`}
              role="progressbar"
              aria-label="Productos en el carro"
              aria-valuemin={0}
              aria-valuemax={totalItemsCount}
              aria-valuenow={checkedItemsCount}
              aria-valuetext={`${checkedItemsCount} de ${totalItemsCount}`}
            >
              <div className="progress__bar" style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressLine}>
              <span className="ellipsis">
                <strong>{checkedItemsCount}</strong> de {totalItemsCount} en el carro
              </span>
              {wakeLock.enabled && (
                <span className={styles.awake} title="Pantalla siempre encendida">
                  <Sun size={14} aria-hidden="true" />
                  <span className="sr-only">Pantalla siempre encendida</span>
                </span>
              )}
              {shoppingTotalCost > 0 && (
                <span className={styles.progressTotal}>
                  Total <strong>{formatEuro(shoppingTotalCost)}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </PageHeader>

      <div className="view">
        <div className={styles.content}>
          {isEmpty ? (
            <EmptyState
              icon={<ShoppingCart size={26} />}
              title="Tu lista está vacía"
              actions={
                <>
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => setActiveTab('menu')}>
                    <CalendarDays size={19} aria-hidden="true" />
                    Ir al menú semanal
                  </button>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => setAddOpen(true)}>
                    <Plus size={19} aria-hidden="true" />
                    Añadir producto
                  </button>
                </>
              }
            >
              Genera la lista desde tu menú semanal o añade productos sueltos.
            </EmptyState>
          ) : (
            <>
              {showDone && (
                <CompletionCard
                  count={totalItemsCount}
                  spent={shoppingCheckedCost}
                  onClearAll={() => void requestClearAll()}
                  onUncheckAll={uncheckAllShoppingItems}
                />
              )}

              {groups.map((group) => (
                <Fragment key={group.category}>
                  <h2 className="section-title">
                    <span className={`ellipsis ${styles.groupName}`}>{group.category}</span>
                    {group.pendingCount > 0 && (
                      <span className={`section-title__aside ${styles.groupAside}`}>
                        {group.pendingCount}
                        {group.pendingCost > 0 && ` · ${formatEuro(group.pendingCost)}`}
                      </span>
                    )}
                  </h2>
                  <div className="list">
                    {group.items.map((item) => (
                      <ShoppingRow
                        key={item.id}
                        item={item}
                        leaving={item.checked && lingering.includes(item.id)}
                        onToggle={handleToggle}
                        onEdit={setEditingItem}
                      />
                    ))}
                  </div>
                </Fragment>
              ))}

              {cartItems.length > 0 && (
                <CartSection
                  items={cartItems}
                  cost={cartCost}
                  open={cartOpen}
                  onOpenChange={setCartOpen}
                  onToggle={handleToggle}
                  onEdit={setEditingItem}
                />
              )}
            </>
          )}
        </div>
      </div>

      <MercadonaSearchModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Añadir a la lista"
        onAddProduct={handleAddProduct}
        onAddCustom={handleAddCustom}
        addedCounts={addedCounts}
      />

      <ShoppingItemSheet item={editingItem} onClose={() => setEditingItem(null)} />

      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Opciones" subtitle={storeLabel} width="sm">
        <OptionsList
          totalCount={totalItemsCount}
          pendingCount={pendingItemsCount}
          checkedCount={checkedItemsCount}
          canUpdateFromMenu={plannedMealsCount > 0}
          wakeLock={wakeLock}
          onShare={() => void handleShare()}
          onUpdateFromMenu={() => void generateShoppingListFromMenu()}
          onUncheckAll={uncheckAllShoppingItems}
          onClearChecked={clearCheckedShoppingItems}
          onClearAll={() => void requestClearAll()}
        />
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Row: [ check · photo · name / 2 × 1,35 € / Para: … · total ] [ edit ]
// ---------------------------------------------------------------------------

function ShoppingRow({
  item,
  leaving = false,
  onToggle,
  onEdit,
}: {
  item: ShoppingListItem;
  leaving?: boolean;
  onToggle: (item: ShoppingListItem) => void;
  onEdit: (item: ShoppingListItem) => void;
}) {
  const unit = unitPrice(item);
  const total = lineTotal(item);
  const image = item.mercadonaProduct?.thumbnail;
  // Skip the brand when the name already says it ("Tomate frito Hacendado")
  const rawBrand = item.mercadonaProduct?.brand?.trim();
  const brand = rawBrand && !normalizeText(item.name).includes(normalizeText(rawBrand)) ? rawBrand : '';
  const dishes = item.sourceDishNames?.length ? item.sourceDishNames.join(', ') : '';

  return (
    <div className={cx(styles.row, item.checked && styles.isChecked, leaving && styles.isLeaving)}>
      <button type="button" role="checkbox" aria-checked={item.checked} className={styles.toggle} onClick={() => onToggle(item)}>
        <span className={styles.check} aria-hidden="true">
          {item.checked && <Check size={17} strokeWidth={3.2} />}
        </span>
        {image && (
          <span className={styles.thumbSlot}>
            <Thumb src={image} alt="" size={44} fallback={<Package size={20} strokeWidth={1.75} />} />
          </span>
        )}
        <span className={styles.info}>
          <span className={`${styles.name} clamp-2`}>{item.name}</span>
          <span className={`${styles.meta} ellipsis`}>
            {unit > 0 ? (
              <>
                <span className={item.quantity > 1 ? styles.qty : undefined}>{item.quantity} ×</span> {formatEuro(unit)}
              </>
            ) : (
              <>
                <span className={item.quantity > 1 ? styles.qty : undefined}>{pluralize(item.quantity, 'ud', 'uds')}</span> · sin precio
              </>
            )}
            {brand && ` · ${brand}`}
          </span>
          {dishes && <span className={`${styles.dishes} ellipsis`}>Para: {dishes}</span>}
        </span>
        <span className={cx('price', styles.total, total <= 0 && styles.totalEmpty)}>
          {/* "sin precio" is already in the meta line */}
          {total > 0 ? formatEuro(total) : <span aria-hidden="true">—</span>}
        </span>
      </button>
      <button type="button" className={`icon-btn icon-btn--muted ${styles.edit}`} aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}>
        <Pencil size={17} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "En el carro" — collapsible section at the bottom
// ---------------------------------------------------------------------------

function CartSection({
  items,
  cost,
  open,
  onOpenChange,
  onToggle,
  onEdit,
}: {
  items: ShoppingListItem[];
  cost: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (item: ShoppingListItem) => void;
  onEdit: (item: ShoppingListItem) => void;
}) {
  const bodyId = useId();
  return (
    <section className={cx('list', styles.cart, open && styles.cartOpen)} aria-label="En el carro">
      <button
        type="button"
        className={styles.cartHeader}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <span className={styles.cartBadge} aria-hidden="true">
          <ShoppingCart size={16} strokeWidth={2.4} />
        </span>
        <span className={styles.cartTitles}>
          <span className={styles.cartTitle}>En el carro ({items.length})</span>
          <span className={styles.cartMeta}>{open ? 'Toca uno para devolverlo' : 'Lo que ya has cogido'}</span>
        </span>
        {cost > 0 && <span className={`price ${styles.cartCost}`}>{formatEuro(cost)}</span>}
        <ChevronDown size={20} className={styles.chevron} aria-hidden="true" />
      </button>
      {open && (
        <div id={bodyId} className={styles.cartBody}>
          {items.map((item) => (
            <ShoppingRow key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Everything ticked
// ---------------------------------------------------------------------------

function CompletionCard({
  count,
  spent,
  onClearAll,
  onUncheckAll,
}: {
  count: number;
  spent: number;
  onClearAll: () => void;
  onUncheckAll: () => void;
}) {
  return (
    <section className={`card ${styles.done}`} aria-live="polite">
      <span className={styles.doneIcon} aria-hidden="true">
        <Check size={30} strokeWidth={3} />
      </span>
      <h2 className={styles.doneTitle}>¡Compra completada!</h2>
      <p className={styles.doneMeta}>{pluralize(count, 'producto en el carro', 'productos en el carro')}</p>
      {spent > 0 && (
        <>
          <span className={styles.doneLabel}>Total gastado</span>
          <span className={`price ${styles.doneAmount}`}>{formatEuro(spent)}</span>
        </>
      )}
      <div className={styles.doneActions}>
        <button type="button" className="btn btn-primary btn-lg" onClick={onClearAll}>
          <Trash2 size={18} aria-hidden="true" />
          Vaciar lista
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={onUncheckAll}>
          <RotateCcw size={18} aria-hidden="true" />
          Desmarcar todo
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Options sheet
// ---------------------------------------------------------------------------

function OptionsList({
  totalCount,
  pendingCount,
  checkedCount,
  canUpdateFromMenu,
  wakeLock,
  onShare,
  onUpdateFromMenu,
  onUncheckAll,
  onClearChecked,
  onClearAll,
}: {
  totalCount: number;
  pendingCount: number;
  checkedCount: number;
  canUpdateFromMenu: boolean;
  wakeLock: WakeLockControl;
  onShare: () => void;
  onUpdateFromMenu: () => void;
  onUncheckAll: () => void;
  onClearChecked: () => void;
  onClearAll: () => void;
}) {
  const { close } = useSheet();

  /** Close the sheet first, then act (the undo toast then shows in its usual place) */
  const run = (action: () => void) => () => {
    close();
    window.setTimeout(action, AFTER_SHEET_MS);
  };

  return (
    <>
      <div className="list">
        {pendingCount > 0 && (
          // Only on phones: tablets and desktop have it in the header.
          // Called right away: the share sheet needs the tap's user activation.
          <OptionRow
            className="hide-desktop"
            icon={<Share size={18} />}
            title="Compartir lista"
            meta="Envía lo que falta por comprar"
            onClick={() => {
              close();
              onShare();
            }}
          />
        )}
        <OptionRow
          icon={<RefreshCw size={18} />}
          title="Actualizar desde el menú"
          meta={canUpdateFromMenu ? 'Añade lo que pide tu menú semanal' : 'Primero planifica tu menú semanal'}
          disabled={!canUpdateFromMenu}
          onClick={run(onUpdateFromMenu)}
        />
        <OptionRow
          icon={<RotateCcw size={18} />}
          title="Desmarcar todo"
          meta="Vuelve a poner todo como pendiente"
          disabled={checkedCount === 0}
          onClick={run(onUncheckAll)}
        />
        <OptionRow
          icon={<CheckCircle2 size={18} />}
          title={checkedCount > 0 ? `Borrar comprados (${checkedCount})` : 'Borrar comprados'}
          meta="Quita de la lista lo que ya está en el carro"
          disabled={checkedCount === 0}
          onClick={run(onClearChecked)}
        />
        <OptionRow
          icon={<Trash2 size={18} />}
          title="Vaciar lista"
          meta="Quita todos los productos"
          danger
          disabled={totalCount === 0}
          onClick={run(onClearAll)}
        />
      </div>

      {wakeLock.supported && (
        <div className={`list ${styles.optionsGroup}`}>
          <button
            type="button"
            role="switch"
            aria-checked={wakeLock.enabled}
            className={`list-row ${styles.option}`}
            onClick={() => wakeLock.setEnabled(!wakeLock.enabled)}
          >
            <span className={styles.optionIcon} aria-hidden="true">
              <Sun size={18} />
            </span>
            <span className="list-row__main">
              <span className="list-row__title">Mantener la pantalla encendida</span>
              <span className="list-row__meta">Útil mientras compras</span>
            </span>
            <span className={cx(styles.switch, wakeLock.enabled && styles.switchOn)} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

function OptionRow({
  icon,
  title,
  meta,
  onClick,
  disabled = false,
  danger = false,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx('list-row', styles.option, danger && styles.optionDanger, className)}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.optionIcon} aria-hidden="true">
        {icon}
      </span>
      <span className="list-row__main">
        <span className="list-row__title">{title}</span>
        {meta && <span className="list-row__meta">{meta}</span>}
      </span>
    </button>
  );
}
