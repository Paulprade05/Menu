'use client';

import React, { useRef, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { formatDecimal, parseDecimal } from '@/lib/format';

// ---------------------------------------------------------------------------
// SegmentedControl — iOS style switch between 2-4 options
// ---------------------------------------------------------------------------

export interface SegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`segmented segmented--${size} ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented__option${active ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chip — pill toggle / filter
// ---------------------------------------------------------------------------

export function Chip({
  active = false,
  onClick,
  children,
  icon,
  className = '',
  ariaLabel,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`chip${active ? ' is-active' : ''} ${className}`}
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/** Horizontal, scrollable row of chips (no wrapping on phones) */
export function ChipRow({ children, className = '', wrap = false }: { children: React.ReactNode; className?: string; wrap?: boolean }) {
  return <div className={`chip-row${wrap ? ' chip-row--wrap' : ''} ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Stepper — quantity − 2 +
// ---------------------------------------------------------------------------

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = 'md',
  label = 'Cantidad',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Quitar uno"
      >
        <Minus size={size === 'sm' ? 14 : 16} strokeWidth={2.5} />
      </button>
      <span className="stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Añadir uno"
      >
        <Plus size={size === 'sm' ? 14 : 16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PriceInput — accepts "1,50" or "1.50", shows the iPhone decimal keypad
// ---------------------------------------------------------------------------

export function PriceInput({
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className = '',
  placeholder = '0,00',
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  placeholder?: string;
}) {
  // null while not editing: the formatted value is shown
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const display = draft ?? (value ? formatDecimal(value) : '');

  const commit = () => {
    if (draft === null) return;
    if (cancelled.current) {
      cancelled.current = false;
    } else if (draft.trim() === '') {
      if (value !== 0) onChange(0);
    } else {
      const parsed = parseDecimal(draft);
      if (parsed !== null && parsed !== value) onChange(parsed);
    }
    setDraft(null);
  };

  return (
    <label className={`price-input price-input--${size} ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={display}
        onFocus={(event) => {
          const initial = value ? formatDecimal(value) : '';
          setDraft(initial);
          const input = event.currentTarget;
          // Select everything so typing replaces the price. Again on the next frame
          // (iOS moves the caret after focusing) — unless the user already typed.
          input.setSelectionRange(0, input.value.length);
          window.requestAnimationFrame(() => {
            if (document.activeElement === input && input.value === initial) {
              input.setSelectionRange(0, input.value.length);
            }
          });
        }}
        onMouseUp={(event) => {
          // Keep the selection made on focus (a mouse click would place the caret instead)
          if (draft !== null && event.currentTarget.value === display && event.currentTarget.selectionStart === 0) {
            event.preventDefault();
          }
        }}
        onChange={(event) => setDraft(event.target.value.replace(/[^\d.,]/g, '').slice(0, 9))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            cancelled.current = true;
            event.currentTarget.blur();
          }
        }}
      />
      <span className="price-input__suffix" aria-hidden="true">
        €
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  children,
  actions,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {children && <div className="empty-state__text">{children}</div>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  );
}

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`spin ${className}`} aria-hidden="true" />;
}

/** Product / dish thumbnail with a graceful fallback */
export function Thumb({
  src,
  alt,
  size = 44,
  fit = 'contain',
  fallback,
}: {
  src?: string;
  alt: string;
  size?: number;
  fit?: 'contain' | 'cover';
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" style={{ objectFit: fit }} onError={() => setFailed(true)} />
      ) : (
        fallback
      )}
    </span>
  );
}
