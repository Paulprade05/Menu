'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Share2, PlusSquare, X } from 'lucide-react';

export default function PwaRegister() {
  const { loadFromCloud } = useApp();
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // 1. Service Worker registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration failed: ', err);
        });
      });
    }

    // 2. Auto load sync code from URL if present (?sync=MERC-XXXX)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const syncCode = urlParams.get('sync');
      if (syncCode) {
        loadFromCloud(syncCode);
      }

      // 3. Detect iOS Safari not in standalone mode
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      const hasDismissed = sessionStorage.getItem('ios_pwa_dismissed');

      if (isIos && !isStandalone && !hasDismissed) {
        setShowIosPrompt(true);
      }
    }
  }, [loadFromCloud]);

  if (!showIosPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '84px',
      left: '12px',
      right: '12px',
      zIndex: 45,
      background: 'rgba(13, 19, 34, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(16, 185, 129, 0.4)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'var(--accent-green-subtle)',
        color: 'var(--accent-green)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Share2 size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0, fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.35 }}>
        <strong>Instalar en tu iPhone:</strong> Pulsa <Share2 size={12} style={{ display: 'inline' }} /> y luego <em>&quot;Añadir a pantalla de inicio&quot;</em> para usarla como App.
      </div>

      <button
        onClick={() => {
          setShowIosPrompt(false);
          sessionStorage.setItem('ios_pwa_dismissed', 'true');
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
