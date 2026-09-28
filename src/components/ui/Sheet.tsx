'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/*
 * Bottom sheet on phones (slides up, swipe down to dismiss, follows the iOS
 * keyboard), centered dialog on tablets/desktop.
 *
 *   <Sheet open={open} onClose={() => setOpen(false)} title="Título">…</Sheet>
 *
 * Inside the sheet, call `useSheet().close()` to dismiss it with the animation
 * (e.g. after picking an option).
 */

interface SheetContextValue {
  /** Animated close. `force` skips the onRequestClose guard (e.g. right after saving) */
  close: (force?: boolean) => void;
}

const SheetContext = createContext<SheetContextValue>({ close: () => {} });

export function useSheet(): SheetContextValue {
  return useContext(SheetContext);
}

type SheetButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  /** Runs first; return false to keep the sheet open */
  onClick?: () => boolean | void | Promise<boolean | void>;
  /** Skip the onRequestClose guard (use after saving) */
  force?: boolean;
};

/**
 * Button for `footer`, `leading` or `trailing` (which are rendered outside your
 * component's tree): runs `onClick` and then closes the sheet with the animation.
 */
export function SheetButton({ onClick, force = false, type = 'button', ...props }: SheetButtonProps) {
  const { close } = useSheet();
  return (
    <button
      type={type}
      {...props}
      onClick={async () => {
        const result = await onClick?.();
        if (result !== false) close(force);
      }}
    />
  );
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Replaces the left side of the header (e.g. a "Cancelar" text button) */
  leading?: React.ReactNode;
  /** Replaces the default close (X) button on the right of the header */
  trailing?: React.ReactNode;
  hideCloseButton?: boolean;
  /** Sticky footer (buttons). Safe-area padding is added automatically */
  footer?: React.ReactNode;
  /** Content fixed between the header and the scrollable body (search box, filters…) */
  toolbar?: React.ReactNode;
  /** Height on phones: auto (fits content), large (≥ 70%), full (almost full screen) */
  size?: 'auto' | 'large' | 'full';
  /** Max width on tablet/desktop */
  width?: 'sm' | 'md' | 'lg';
  /** Return false (or a promise of false) to keep the sheet open, e.g. unsaved changes */
  onRequestClose?: () => boolean | Promise<boolean>;
  /** Extra class for the scrollable body */
  bodyClassName?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

export default function Sheet(props: SheetProps) {
  if (!props.open || typeof document === 'undefined') return null;
  return createPortal(<SheetInner {...props} />, document.body);
}

// ---------------------------------------------------------------------------

const CLOSE_ANIMATION_MS = 220;

/** Stack of open sheets: only the top one reacts to Escape */
const openSheets: string[] = [];
let scrollLocks = 0;

function lockScroll() {
  scrollLocks += 1;
  if (scrollLocks === 1) document.documentElement.classList.add('sheet-open');
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.documentElement.classList.remove('sheet-open');
}

function subscribeViewport(callback: () => void) {
  const vv = window.visualViewport;
  window.addEventListener('resize', callback);
  vv?.addEventListener('resize', callback);
  vv?.addEventListener('scroll', callback);
  return () => {
    window.removeEventListener('resize', callback);
    vv?.removeEventListener('resize', callback);
    vv?.removeEventListener('scroll', callback);
  };
}

/** "visibleHeight|keyboardInset" in px, from the visual viewport (iOS keyboard aware) */
function viewportSnapshot(): string {
  const vv = window.visualViewport;
  if (!vv) return `${window.innerHeight}|0`;
  const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  return `${Math.round(vv.height)}|${inset}`;
}

function useVisualViewport(): { height: number; keyboard: number } {
  const snapshot = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => '0|0');
  const [height, keyboard] = snapshot.split('|').map(Number);
  return { height, keyboard };
}

function SheetInner({
  onClose,
  title,
  subtitle,
  leading,
  trailing,
  hideCloseButton,
  footer,
  toolbar,
  size = 'auto',
  width = 'md',
  onRequestClose,
  bodyClassName,
  ariaLabel,
  children,
}: SheetProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onRequestCloseRef = useRef(onRequestClose);
  const drag = useRef<{ startY: number; startTime: number; dy: number; pointerId: number } | null>(null);
  const scrollLocked = useRef(false);
  const viewport = useVisualViewport();

  useEffect(() => {
    onCloseRef.current = onClose;
    onRequestCloseRef.current = onRequestClose;
  }, [onClose, onRequestClose]);

  const releaseScroll = useCallback(() => {
    if (!scrollLocked.current) return;
    scrollLocked.current = false;
    unlockScroll();
  }, []);

  const close = useCallback(
    async (force = false) => {
      if (closingRef.current) return;
      if (!force && onRequestCloseRef.current) {
        const allowed = await onRequestCloseRef.current();
        if (!allowed) {
          const panel = panelRef.current;
          if (panel) panel.style.setProperty('--drag-y', '0px');
          return;
        }
      }
      closingRef.current = true;
      setClosing(true);
      // Release right away (not after the animation) so toasts shown on close
      // are placed for the screen underneath and don't jump.
      releaseScroll();
      window.setTimeout(() => onCloseRef.current(), CLOSE_ANIMATION_MS);
    },
    [releaseScroll],
  );

  // Scroll lock, Escape key, focus management
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openSheets.push(id);
    lockScroll();
    scrollLocked.current = true;

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const autoFocus = panel.querySelector<HTMLElement>('[data-autofocus]');
      (autoFocus ?? panel).focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openSheets[openSheets.length - 1] === id) {
        event.preventDefault();
        void close();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openSheets.lastIndexOf(id);
      if (index >= 0) openSheets.splice(index, 1);
      releaseScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [id, close, releaseScroll]);

  // Swipe down on the handle/header to dismiss (touch and pen only)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    drag.current = { startY: event.clientY, startTime: event.timeStamp, dy: 0, pointerId: event.pointerId };
    panelRef.current?.classList.add('is-dragging');
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dy = Math.max(0, event.clientY - state.startY);
    state.dy = dy;
    panelRef.current?.style.setProperty('--drag-y', `${dy}px`);
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    const panel = panelRef.current;
    panel?.classList.remove('is-dragging');
    const elapsed = Math.max(1, event.timeStamp - state.startTime);
    const velocity = state.dy / elapsed; // px per ms
    if (state.dy > 110 || (state.dy > 40 && velocity > 0.6)) {
      void close();
    } else {
      panel?.style.setProperty('--drag-y', '0px');
    }
  };

  const hasHeader = Boolean(title || subtitle || leading || trailing || !hideCloseButton);

  const style = {
    '--vvh': viewport.height ? `${viewport.height}px` : undefined,
    '--kb': `${viewport.keyboard}px`,
  } as React.CSSProperties;

  return (
    <SheetContext.Provider value={{ close: (force?: boolean) => void close(force) }}>
      <div
        className={`sheet-root${closing ? ' is-closing' : ''}`}
        style={style}
        data-keyboard={viewport.keyboard > 80 ? 'open' : undefined}
      >
        <div className="sheet-backdrop" onClick={() => void close()} aria-hidden="true" />
        <div
          ref={panelRef}
          className={`sheet-panel sheet-panel--${size} sheet-panel--w-${width}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          tabIndex={-1}
        >
          <div
            className="sheet-grab-zone"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <div className="sheet-handle" aria-hidden="true" />
            {hasHeader && (
              <div className="sheet-header">
                {leading && <div className="sheet-header__leading">{leading}</div>}
                <div className="sheet-header__titles">
                  {title && (
                    <h2 id={titleId} className="sheet-title">
                      {title}
                    </h2>
                  )}
                  {subtitle && <p className="sheet-subtitle">{subtitle}</p>}
                </div>
                <div className="sheet-header__trailing">
                  {trailing ??
                    (!hideCloseButton && (
                      <button type="button" className="icon-btn icon-btn--muted" onClick={() => void close()} aria-label="Cerrar">
                        <X size={20} />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {toolbar && <div className="sheet-toolbar">{toolbar}</div>}

          <div className={`sheet-body${footer ? '' : ' sheet-body--last'}${bodyClassName ? ` ${bodyClassName}` : ''}`}>
            {children}
          </div>

          {footer && <div className="sheet-footer">{footer}</div>}
        </div>
      </div>
    </SheetContext.Provider>
  );
}
