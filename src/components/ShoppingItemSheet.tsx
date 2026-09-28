'use client';

import React, { useEffect } from 'react';
import { ExternalLink, Package, UtensilsCrossed } from 'lucide-react';
import Sheet, { SheetButton, useSheet } from '@/components/ui/Sheet';
import { PriceInput, Stepper, Thumb } from '@/components/ui/controls';
import { useApp } from '@/context/AppContext';
import { formatEuro, pluralize } from '@/lib/format';
import { lineTotal, unitPrice } from '@/lib/utils';
import type { ShoppingListItem } from '@/types';
import styles from './ShoppingItemSheet.module.css';

/*
 * Detail / edit sheet for one product of the shopping list:
 * quantity, price per unit, dishes it is for, link to Mercadona and "Quitar".
 * Values are read live from the list, so every change shows up at once.
 */

export interface ShoppingItemSheetProps {
  /** Item to show (a snapshot taken when opening it). `null` = closed */
  item: ShoppingListItem | null;
  onClose: () => void;
}

export default function ShoppingItemSheet({ item, onClose }: ShoppingItemSheetProps) {
  const { shoppingList, removeShoppingItem } = useApp();

  // Live version of the item. The snapshot keeps the title while the sheet
  // closes after the item disappears (removed here or from another device).
  const live = item ? shoppingList.find((i) => i.id === item.id) : undefined;
  const shown = live ?? item;
  const product = shown?.mercadonaProduct;
  const packaging = product?.packaging || (shown?.unit && shown.unit !== 'ud' ? shown.unit : '');
  const subtitle = [product?.brand, packaging].filter(Boolean).join(' · ');

  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={shown ? <span className={styles.title}>{shown.name}</span> : undefined}
      subtitle={subtitle || undefined}
      width="sm"
      onRequestClose={commitFocusedField}
      footer={
        shown ? (
          <div className={styles.footer}>
            <SheetButton className={`btn btn-lg btn-danger ${styles.remove}`} force disabled={!live} onClick={() => removeShoppingItem(shown.id)}>
              Quitar de la lista
            </SheetButton>
            <SheetButton className={`btn btn-lg btn-primary ${styles.done}`}>Hecho</SheetButton>
          </div>
        ) : undefined
      }
    >
      {shown && <ItemDetails item={shown} missing={!live} />}
    </Sheet>
  );
}

/**
 * The price field saves on blur. On iPhone, tapping a button does not always
 * blur the focused input, so blur it before any (non forced) close.
 */
function commitFocusedField(): boolean {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  return true;
}

function ItemDetails({ item, missing }: { item: ShoppingListItem; missing: boolean }) {
  const { close } = useSheet();
  const { setShoppingItemQuantity, updateShoppingItemPrice } = useApp();

  // The item was removed (here or from another device): close the sheet
  useEffect(() => {
    if (missing) close(true);
  }, [missing, close]);

  const unit = unitPrice(item);
  const total = lineTotal(item);
  const product = item.mercadonaProduct;
  const marketPrice = product && product.price > 0 ? product.price : null;
  const priceDiffers = marketPrice !== null && Math.abs(marketPrice - unit) >= 0.005;
  const dishes = item.sourceDishNames ?? [];

  return (
    <>
      <div className={styles.summary}>
        <Thumb src={product?.thumbnail} alt="" size={96} fallback={<Package size={36} strokeWidth={1.75} />} />
        <div className={styles.summaryText}>
          <span className={styles.totalLabel}>Total</span>
          <span className={`price ${styles.totalValue}`}>{total > 0 ? formatEuro(total) : '—'}</span>
          <span className={styles.totalMeta}>
            {unit > 0 ? `${item.quantity} × ${formatEuro(unit)}` : `${pluralize(item.quantity, 'ud', 'uds')} · sin precio`}
          </span>
          {item.checked && <span className={`tag tag--ink ${styles.status}`}>En el carro</span>}
        </div>
      </div>

      <div className={styles.fields}>
        <div className="field">
          <span className="field-label">Cantidad</span>
          <Stepper value={item.quantity} onChange={(quantity) => setShoppingItemQuantity(item.id, quantity)} size="lg" label="Cantidad" />
        </div>

        <div className="field">
          <span className="field-label">Precio por unidad</span>
          <PriceInput value={unit} onChange={(price) => updateShoppingItemPrice(item.id, price)} ariaLabel="Precio por unidad" size="lg" />
          {marketPrice !== null && (
            <p className={`field-hint ${styles.hint}`}>
              <span>Precio de Mercadona: {formatEuro(marketPrice)}</span>
              {priceDiffers && (
                <button
                  type="button"
                  className={`text-btn ${styles.useBtn}`}
                  onClick={() => {
                    // A price being typed is saved on blur: do it first so it does not overwrite this one
                    commitFocusedField();
                    updateShoppingItemPrice(item.id, marketPrice);
                  }}
                >
                  Usar este
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      {dishes.length > 0 && (
        <p className={styles.dishes}>
          <UtensilsCrossed size={16} aria-hidden="true" className={styles.dishesIcon} />
          <span>
            <strong>Para:</strong> {dishes.join(', ')}
          </span>
        </p>
      )}

      {product?.shareUrl && (
        <a className={`btn btn-secondary btn-block ${styles.link}`} href={product.shareUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={18} aria-hidden="true" />
          Ver en la web de Mercadona
        </a>
      )}
    </>
  );
}
