'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  Store,
  RefreshCw,
  Smartphone,
  Share2,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Check
} from 'lucide-react';

const POPULAR_POSTAL_CODES = [
  { city: 'Valencia', code: '46001' },
  { city: 'Madrid', code: '28001' },
  { city: 'Barcelona', code: '08001' },
  { city: 'Sevilla', code: '41001' },
  { city: 'Málaga', code: '29001' },
  { city: 'Alicante', code: '03001' },
  { city: 'Zaragoza', code: '50001' },
  { city: 'Bilbao', code: '48001' },
];

export default function SettingsView() {
  const {
    settings,
    updateSettings,
    syncStatus,
    syncErrorMsg,
    lastSyncTime,
    syncToCloud,
    loadFromCloud,
  } = useApp();

  const [inputPostalCode, setInputPostalCode] = useState(settings.postalCode);
  const [connectCodeInput, setConnectCodeInput] = useState('');
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleSavePostalCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPostalCode.trim()) return;
    updateSettings({ postalCode: inputPostalCode.trim() });
  };

  const handleSelectPopularCode = (code: string) => {
    setInputPostalCode(code);
    updateSettings({ postalCode: code });
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(settings.syncCode);
      setCopiedSyncCode(true);
      setTimeout(() => setCopiedSyncCode(false), 2000);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}?sync=${settings.syncCode}`;
      navigator.clipboard.writeText(url);
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 2000);
    }
  };

  const handleConnectRemoteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectCodeInput.trim()) return;
    const ok = await loadFromCloud(connectCodeInput.trim());
    if (ok) {
      setConnectSuccess(true);
      setTimeout(() => setConnectSuccess(false), 3000);
      setConnectCodeInput('');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 16px 40px 16px' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="badge badge-green" style={{ fontSize: '11px' }}>
            <Settings size={12} /> Configuración
          </span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>
          Ajustes & Sincronización
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Gestiona los precios de tu tienda local y conecta tu iPhone y PC al instante sin contraseñas.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. SECCIÓN MERCADONA */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-green-subtle)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Store size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Tienda Mercadona y Precios</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Configura tu código postal para consultar el stock y precios de tu supermercado local
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePostalCode} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input
              type="text"
              maxLength={5}
              value={inputPostalCode}
              onChange={(e) => setInputPostalCode(e.target.value)}
              placeholder="Ej: 46001, 28001..."
              className="input-field"
              style={{ width: '160px', fontWeight: '700', fontSize: '15px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '0 18px' }}>
              Guardar CP
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Almacén asignado:</span>
              <span className="badge badge-green" style={{ fontSize: '11px' }}>
                {settings.warehouse || 'Automático'}
              </span>
            </div>
          </form>

          {/* Quick city selectors */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Ciudades frecuentes:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {POPULAR_POSTAL_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectPopularCode(c.code)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    background: settings.postalCode === c.code ? 'var(--accent-green)' : 'var(--bg-secondary)',
                    color: settings.postalCode === c.code ? '#070a12' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: settings.postalCode === c.code ? '700' : '500'
                  }}
                >
                  {c.city} ({c.code})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. SECCIÓN SINCRONIZACIÓN EN LA NUBE SIN LOGIN */}
        <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-green-subtle)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Sincronización en la Nube (Sin Login)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Comparte tus menús y lista entre el PC y el iPhone en tiempo real
              </p>
            </div>
          </div>

          {/* Current Code Box */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Tu Código de Hogar
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span className="price-text" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green-light)', letterSpacing: '0.05em' }}>
                  {settings.syncCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-ghost btn-icon"
                  style={{ width: '30px', height: '30px' }}
                  title="Copiar código"
                >
                  {copiedSyncCode ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => syncToCloud()}
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                <RefreshCw size={14} className={syncStatus === 'syncing' ? 'spin-anim' : ''} />
                <span>{syncStatus === 'syncing' ? 'Subiendo...' : 'Subir a la nube'}</span>
              </button>
              <button
                onClick={handleCopyShareLink}
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 14px' }}
                title="Copiar enlace de sincronización automática"
              >
                {copiedShareUrl ? (
                  <>
                    <Check size={14} color="var(--accent-green)" />
                    <span style={{ color: 'var(--accent-green)' }}>Enlace copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    <span>Compartir link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Status Feedback */}
          {syncStatus === 'synced' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '12px', marginBottom: '12px' }}>
              <CheckCircle2 size={16} />
              <span>Sincronizado correctamente con la nube ({lastSyncTime?.toLocaleTimeString() || 'Reciente'})</span>
            </div>
          )}

          {syncStatus === 'error' && syncErrorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '12px' }}>
              <AlertCircle size={16} />
              <span>{syncErrorMsg}</span>
            </div>
          )}

          {/* Link another device */}
          <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
              ¿Quieres unirte a un código existente de tu otro dispositivo?
            </label>
            <form onSubmit={handleConnectRemoteCode} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={connectCodeInput}
                onChange={(e) => setConnectCodeInput(e.target.value.toUpperCase())}
                placeholder="Introduce el código (ej: CASA-7782)"
                className="input-field"
                style={{ maxWidth: '300px', fontSize: '13px' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: '13px', padding: '0 16px' }}>
                Conectar y cargar
              </button>
            </form>
            {connectSuccess && (
              <span style={{ fontSize: '12px', color: 'var(--accent-green)', display: 'block', marginTop: '6px' }}>
                ✓ Datos cargados y vinculados correctamente.
              </span>
            )}
          </div>
        </div>

        {/* 3. SECCIÓN INSTALACIÓN PWA IPHONE */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Smartphone size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Instalación PWA en iPhone</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Convierte esta web en una app nativa en tu pantalla de inicio
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <strong>Abre la web en Safari:</strong> Abre este enlace desde el navegador Safari de tu iPhone.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <strong>Pulsa en Compartir:</strong> Toca el icono de compartir en la barra inferior de Safari (el cuadrado con flecha hacia arriba <Share2 size={13} style={{ display: 'inline' }} />).
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <strong>&quot;Añadir a la pantalla de inicio&quot;:</strong> Desliza hacia abajo en el menú y selecciona <em>Añadir a pantalla de inicio</em>.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent-green-subtle)',
                color: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <strong>¡App lista!:</strong> Se creará el icono de alta resolución con el logo de Mercadona en tu iPhone. Se abrirá a pantalla completa sin barras de navegador.
              </div>
            </div>
          </div>
        </div>

        {/* 4. SECCIÓN BASE DE DATOS SUPABASE (OPCIONAL) */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Base de Datos Personal (Supabase / Postgres)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Opcional: Si tienes tu propia base de datos Supabase, puedes configurarla aquí
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>
                Supabase Project URL
              </label>
              <input
                type="text"
                value={settings.supabaseUrl || ''}
                onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
                placeholder="https://xyzcompany.supabase.co"
                className="input-field"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>
                Supabase Anon Key
              </label>
              <input
                type="password"
                value={settings.supabaseAnonKey || ''}
                onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                className="input-field"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <ShieldCheck size={16} color="var(--accent-green)" />
              <span>Por defecto, la app ya incluye sincronización cloud automática con tu código de hogar sin necesidad de Supabase.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
