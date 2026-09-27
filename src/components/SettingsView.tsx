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
  Trash2,
  Check
} from 'lucide-react';

const POPULAR_POSTAL_CODES = [
  { city: 'Logroño (Por defecto)', code: '26001' },
  { city: 'Zaragoza', code: '50001' },
  { city: 'Pamplona', code: '31001' },
  { city: 'Madrid', code: '28001' },
  { city: 'Barcelona', code: '08001' },
  { city: 'Bilbao', code: '48001' },
];

export default function SettingsView() {
  const {
    settings,
    updateSettings,
    resetAllData,
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

  const handleConfirmReset = () => {
    resetAllData();
    setShowResetConfirm(false);
  };

  return (
    <div className="view-container">
      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
            Preferencias
          </span>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Ajustes & Sincronización
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Configuración de Mercadona Logroño y sincronización instantánea entre tu móvil y PC.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. SECCIÓN MERCADONA */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Tienda Mercadona Logroño</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Código postal asignado para el catálogo y precios
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePostalCode} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            <input
              type="text"
              maxLength={5}
              value={inputPostalCode}
              onChange={(e) => setInputPostalCode(e.target.value)}
              placeholder="26001"
              className="input-field"
              style={{ width: '130px', fontWeight: '700', fontSize: '14px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ fontSize: '12px', padding: '9px 16px' }}>
              Guardar CP
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Almacén:</span>
              <span style={{ fontSize: '11px', fontWeight: '700', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                {settings.warehouse || 'zgz1'}
              </span>
            </div>
          </form>

          {/* Quick city selectors */}
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Ubicaciones:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {POPULAR_POSTAL_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectPopularCode(c.code)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    background: settings.postalCode === c.code ? '#000000' : '#f8fafc',
                    color: settings.postalCode === c.code ? '#ffffff' : '#475569',
                    border: settings.postalCode === c.code ? '1px solid #000000' : '1px solid #e2e8f0',
                    fontWeight: settings.postalCode === c.code ? '700' : '500'
                  }}
                >
                  {c.city}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. SECCIÓN SINCRONIZACIÓN EN LA NUBE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Sincronización Móvil y PC</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Conecta tus dispositivos para compartir el menú y la lista en tiempo real
              </p>
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                Tu Código de Hogar
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className="price-text" style={{ fontSize: '20px', fontWeight: '900', color: '#000000' }}>
                  {settings.syncCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-ghost btn-icon"
                  style={{ width: '28px', height: '28px' }}
                  title="Copiar código"
                >
                  {copiedSyncCode ? <Check size={14} color="#000000" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => syncToCloud()}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '7px 14px' }}
              >
                <RefreshCw size={13} className={syncStatus === 'syncing' ? 'spin-anim' : ''} />
                <span>{syncStatus === 'syncing' ? 'Subiendo...' : 'Subir a la nube'}</span>
              </button>
              <button
                onClick={handleCopyShareLink}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '7px 12px' }}
                title="Copiar enlace"
              >
                {copiedShareUrl ? (
                  <>
                    <Check size={13} color="#000000" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                    <span>Compartir link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Status Feedback */}
          {syncStatus === 'synced' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000000', fontSize: '12px', marginBottom: '10px' }}>
              <CheckCircle2 size={15} color="#000000" />
              <span>Sincronizado correctamente con la nube ({lastSyncTime?.toLocaleTimeString() || 'Reciente'})</span>
            </div>
          )}

          {/* Link another device */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
              Cargar datos desde otro dispositivo con su código:
            </label>
            <form onSubmit={handleConnectRemoteCode} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={connectCodeInput}
                onChange={(e) => setConnectCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej: LOGRO-101"
                className="input-field"
                style={{ maxWidth: '240px', fontSize: '13px' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: '12px', padding: '0 14px' }}>
                Conectar
              </button>
            </form>
            {connectSuccess && (
              <span style={{ fontSize: '12px', color: '#000000', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                ✓ Datos vinculados correctamente.
              </span>
            )}
          </div>
        </div>

        {/* 3. SECCIÓN INSTALACIÓN PWA IPHONE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Smartphone size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Instalar en iPhone como App (PWA)</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Pasos sencillos para guardarla en la pantalla de inicio
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                1
              </span>
              <span>Abre el enlace en el navegador <strong>Safari</strong> de tu iPhone.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                2
              </span>
              <span>Toca el botón <strong>Compartir</strong> (icono del cuadrado con flecha hacia arriba <Share2 size={12} style={{ display: 'inline' }} />).</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                3
              </span>
              <span>Selecciona <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.</span>
            </div>
          </div>
        </div>

        {/* 4. SECCIÓN RESTABLECER DATOS */}
        <div style={{ background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#b91c1c' }}>
                Restablecer y vaciar todos los datos
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Borra todos los platos, el menú semanal y la lista para empezar desde cero
              </p>
            </div>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="btn btn-danger"
                style={{ fontSize: '12px', padding: '7px 14px' }}
              >
                <Trash2 size={14} />
                <span>Vaciar todo</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="btn btn-danger"
                  style={{ fontSize: '12px', padding: '7px 12px', background: '#dc2626', color: '#fff' }}
                >
                  Confirmar borrado
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 10px' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
