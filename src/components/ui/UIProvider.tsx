'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Sheet, { SheetButton } from './Sheet';

/*
 * App-wide feedback:
 *   const { showToast, confirm } = useUI();
 *   showToast('Plato eliminado', { actionLabel: 'Deshacer', onAction: undo });
 *   if (await confirm({ title: '¿Vaciar la lista?', confirmLabel: 'Vaciar', destructive: true })) …
 */

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** ms, default 3500 (5500 with an action) */
  duration?: number;
  tone?: 'default' | 'success' | 'error';
}

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface UIContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastCounter = useRef(0);
  const confirmResult = useRef(false);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    toastCounter.current += 1;
    setToast({ id: toastCounter.current, message, ...options });
  }, []);

  // Auto-hide
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration ?? (toast.onAction ? 5500 : 3500);
    const timer = window.setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResult.current = false;
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = () => {
    confirmState?.resolve(confirmResult.current);
    setConfirmState(null);
  };

  const value = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div key={toast.id} className={`toast toast--${toast.tone ?? 'default'}`} role="status">
            {toast.tone === 'error' && <AlertCircle size={18} className="toast__icon" />}
            {toast.tone === 'success' && <CheckCircle2 size={18} className="toast__icon" />}
            <span className="toast__message">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={Boolean(confirmState)}
        onClose={closeConfirm}
        title={confirmState?.title}
        hideCloseButton
        width="sm"
        bodyClassName="confirm-body"
        footer={
          <div className="confirm-actions">
            {/* Destructive questions focus the safe option, so Enter never deletes by accident */}
            <SheetButton className="btn btn-secondary btn-lg" data-autofocus={confirmState?.destructive ? true : undefined}>
              {confirmState?.cancelLabel ?? 'Cancelar'}
            </SheetButton>
            <SheetButton
              className={`btn btn-lg ${confirmState?.destructive ? 'btn-danger-solid' : 'btn-primary'}`}
              onClick={() => {
                confirmResult.current = true;
              }}
              data-autofocus={confirmState?.destructive ? undefined : true}
            >
              {confirmState?.confirmLabel ?? 'Aceptar'}
            </SheetButton>
          </div>
        }
      >
        {confirmState?.message && <div className="confirm-message">{confirmState.message}</div>}
      </Sheet>
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
}
