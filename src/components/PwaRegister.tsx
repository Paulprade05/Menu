'use client';

import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUI } from '@/components/ui/UIProvider';
import { isValidSyncCode, normalizeSyncCode } from '@/lib/sync';
import { isIos, isStandalone } from '@/lib/utils';

const INSTALL_DISMISSED_KEY = 'menu_install_hint_dismissed_at';
const INSTALL_HINT_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;

function shouldShowInstallHint(): boolean {
  if (!isIos() || isStandalone()) return false;
  try {
    const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
    return Date.now() - dismissedAt > INSTALL_HINT_COOLDOWN_MS;
  } catch {
    return true;
  }
}

/**
 * - Registers the service worker (production only)
 * - Handles invitation links (?sync=CODE): asks before joining the household
 * - Shows the "Añadir a pantalla de inicio" hint in Safari on iPhone
 */
export default function PwaRegister() {
  const { joinHousehold, settings } = useApp();
  const { confirm, showToast } = useUI();
  const [showInstallHint, setShowInstallHint] = useState(shouldShowInstallHint);

  // Service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      // A worker left over from a production build would serve stale files in development
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((err) => {
        console.warn('SW registration failed:', err);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  // Invitation link: /?sync=CASA-XXXX-XXXX-XXXX
  useEffect(() => {
    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('sync');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    };
    const raw = new URL(window.location.href).searchParams.get('sync');
    if (!raw) return;

    const code = normalizeSyncCode(raw);
    if (!isValidSyncCode(code) || code === settings.syncCode) {
      cleanUrl();
      return;
    }

    // In Safari on iPhone: the installed app keeps its own data, separate from Safari
    const inIosSafari = isIos() && !isStandalone();

    // The URL is cleaned inside the timer, so a remounted effect (dev StrictMode) still sees the code
    const timer = window.setTimeout(async () => {
      cleanUrl();
      const accepted = await confirm({
        title: '¿Unirte a este hogar?',
        message: (
          <>
            Vas a compartir el menú, los platos y la lista de la compra con el hogar <strong>{code}</strong>. Lo que ya
            tengas en este dispositivo se combinará con sus datos.
            {inIosSafari && (
              <>
                <br />
                <br />
                Si ya tienes la app en la pantalla de inicio, ábrela y en Ajustes → «Unirme con un código» escribe{' '}
                <strong>{code}</strong>: la app instalada guarda sus datos aparte de Safari.
              </>
            )}
          </>
        ),
        confirmLabel: 'Unirme',
      });
      if (!accepted) return;
      const result = await joinHousehold(code);
      showToast(result.ok ? 'Te has unido al hogar. Todo está sincronizado.' : result.message, {
        tone: result.ok ? 'success' : 'error',
      });
    }, 400);
    return () => window.clearTimeout(timer);
    // Only once, on start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showInstallHint) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Instalar la app">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/apple-touch-icon.png" alt="" className="install-banner__icon" width={40} height={40} />
      <div className="install-banner__text">
        <strong>Instálala en tu iPhone</strong>
        Pulsa <Share size={14} className="inline-icon" aria-label="Compartir" /> y luego «Añadir a pantalla de inicio».
      </div>
      <button
        type="button"
        className="icon-btn"
        aria-label="Cerrar aviso"
        onClick={() => {
          setShowInstallHint(false);
          try {
            localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
          } catch {
            // ignore
          }
        }}
      >
        <X size={20} />
      </button>
    </div>
  );
}
