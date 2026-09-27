'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Share2, X } from 'lucide-react';

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

    // 2. Auto load sync code from URL if present (?sync=LOGRO-XXX)
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
      bottom: '76px',
      left: '12px',
      right: '12px',
      zIndex: 45,
      background: '#000000',
      color: '#ffffff',
      border: '1px solid #1e293b',
      borderRadius: '10px',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
    }}>
      <div style={{
        width: '30px',
        height: '30px',
        borderRadius: '6px',
        background: '#ffffff',
        color: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Share2 size={16} />
      </div>

      <div style={{ flex: 1, minWidth: 0, fontSize: '12px', color: '#f8fafc', lineHeight: 1.35 }}>
        <strong>Instalar en tu iPhone:</strong> Pulsa <Share2 size={11} style={{ display: 'inline' }} /> y selecciona <em>&quot;Añadir a pantalla de inicio&quot;</em>.
      </div>

      <button
        onClick={() => {
          setShowIosPrompt(false);
          sessionStorage.setItem('ios_pwa_dismissed', 'true');
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
