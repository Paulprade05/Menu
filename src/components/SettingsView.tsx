'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Compass,
  Copy,
  Download,
  Ellipsis,
  Lightbulb,
  Link,
  MapPin,
  RefreshCw,
  Share,
  ShieldAlert,
  SquarePlus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUI } from '@/components/ui/UIProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chip, ChipRow, Spinner } from '@/components/ui/controls';
import { fetchSyncServerStatus } from '@/lib/syncClient';
import { isValidSyncCode, normalizeSyncCode } from '@/lib/sync';
import { formatRelativeTime } from '@/lib/format';
import { copyText, isIos, isStandalone, isValidPostalCode, shareOrCopy, storeLabel as buildStoreLabel } from '@/lib/utils';
import styles from './SettingsView.module.css';

const QUICK_STORES = [
  { city: 'Logroño', code: '26001' },
  { city: 'Zaragoza', code: '50001' },
  { city: 'Pamplona', code: '31001' },
  { city: 'Madrid', code: '28001' },
  { city: 'Barcelona', code: '08001' },
  { city: 'Bilbao', code: '48001' },
  { city: 'Valencia', code: '46001' },
  { city: 'Sevilla', code: '41001' },
];

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Accepts the bare code or a pasted invitation ("Únete… https://…/?sync=CASA-…"):
 * returns just the code in that case.
 */
function codeFromInput(raw: string): string {
  const match = raw.match(/[?&]sync=([^&#\s]+)/i);
  if (!match) return raw;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** "menu-compra-2026-09-28.json" (local date) */
function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `menu-compra-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Current time, refreshed every `intervalMs` (for "hace 2 min" labels) */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

type ServerState = 'checking' | 'ok' | 'unconfigured' | 'unknown';

/** Asks the server once whether household sync is set up */
function useSyncServerState(): ServerState {
  const [state, setState] = useState<ServerState>('checking');
  useEffect(() => {
    let alive = true;
    fetchSyncServerStatus().then((status) => {
      if (!alive) return;
      setState(status === null ? 'unknown' : status.configured ? 'ok' : 'unconfigured');
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function SettingsView() {
  const { storeLabel, sync } = useApp();

  return (
    <>
      <PageHeader title="Ajustes" subtitle={storeLabel} />
      <div className="view">
        <div className={styles.layout}>
          <div className={styles.column}>
            <StoreSection />
            <SyncSection />
          </div>
          <div className={styles.column}>
            <InstallSection />
            <BackupSection />
            <DangerSection />
          </div>
          <p className={styles.footer}>
            Menú &amp; Compra · v2.0 · Los datos se guardan en este dispositivo{sync.enabled ? ' y en tu hogar' : ''}
          </p>
        </div>
      </div>
    </>
  );
}

function Section({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className="section-title">
        {title}
      </h2>
      {children}
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}

/** Tappable row inside a .list: icon, title, optional subtitle and a trailing element */
function RowButton({
  icon,
  title,
  meta,
  trailing = <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />,
  onClick,
  busy = false,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button type="button" className={`list-row ${styles.rowButton}`} onClick={onClick} aria-busy={busy || undefined}>
      <span className={styles.rowIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={`list-row__main ${styles.rowMain}`}>
        <span className="list-row__title">{title}</span>
        {meta && <span className="list-row__meta">{meta}</span>}
      </span>
      {trailing}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 1. Tu supermercado
// ---------------------------------------------------------------------------

function StoreSection() {
  const { settings, storeLabel, updateSettings } = useApp();
  const { showToast } = useUI();
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // null = not editing: the saved postal code is shown
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const value = draft ?? settings.postalCode;
  const dirty = draft !== null && draft !== settings.postalCode;

  const applyPostalCode = (code: string) => {
    setDraft(null);
    setInvalid(false);
    if (code === settings.postalCode) return;
    updateSettings({ postalCode: code });
    showToast(`Tienda actualizada: ${buildStoreLabel(code)}`, { tone: 'success' });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = value.trim();
    if (!isValidPostalCode(code)) {
      setInvalid(true);
      return;
    }
    inputRef.current?.blur();
    applyPostalCode(code);
  };

  return (
    <Section title="Tu supermercado" note="Con tu código postal buscamos los productos y precios de tu Mercadona.">
      <div className="list">
        <div className="list-row">
          <span className={styles.rowIcon} aria-hidden="true">
            <MapPin size={18} />
          </span>
          <div className="list-row__main">
            <div className="list-row__title ellipsis">{storeLabel}</div>
            <div className="list-row__meta">
              CP {settings.postalCode || '—'} · almacén {settings.warehouse || '—'}
            </div>
          </div>
        </div>

        <div className={`list-row ${styles.blockRow}`}>
          <form className={styles.cpForm} onSubmit={handleSubmit} noValidate>
            <label className="field-label" htmlFor={inputId}>
              Código postal
            </label>
            <div className="input-row">
              <input
                ref={inputRef}
                id={inputId}
                className={`input ${styles.cpInput}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                autoComplete="postal-code"
                enterKeyHint="done"
                placeholder="26001"
                value={value}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                onChange={(event) => {
                  setDraft(event.target.value.replace(/\D/g, '').slice(0, 5));
                  setInvalid(false);
                }}
                onKeyDown={(event) => {
                  // Nothing to save: "Aceptar" just closes the keyboard
                  if (event.key === 'Enter' && !dirty) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
              <button type="submit" className="btn btn-primary" disabled={!dirty}>
                Guardar
              </button>
            </div>
            {invalid && (
              <p id={errorId} className="field-error" role="alert">
                Escribe un código postal español de 5 cifras
              </p>
            )}
          </form>
        </div>

        <div className={`list-row ${styles.blockRow}`}>
          <span className="field-label">O elige una ciudad</span>
          <ChipRow className={styles.chips}>
            {QUICK_STORES.map((store) => (
              <Chip
                key={store.code}
                active={settings.postalCode === store.code}
                onClick={() => applyPostalCode(store.code)}
                ariaLabel={`${store.city}, código postal ${store.code}`}
              >
                {store.city}
              </Chip>
            ))}
          </ChipRow>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 2. Compartir con tu hogar
// ---------------------------------------------------------------------------

function SyncSection() {
  const { sync } = useApp();
  const server = useSyncServerState();
  const unavailable = server === 'unconfigured' || sync.status === 'unconfigured';

  return (
    <Section title="Compartir con tu hogar">
      {sync.enabled ? (
        <>
          {unavailable && <UnavailableNotice className={styles.noticeBlock} />}
          <SyncEnabledPanel />
        </>
      ) : (
        <SyncDisabledPanel unavailable={unavailable} />
      )}
    </Section>
  );
}

function UnavailableNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`notice notice--warning ${className}`} role="status">
      <AlertCircle size={18} className={styles.noticeIcon} aria-hidden="true" />
      <div className="grow">
        <p className={styles.noticeTitle}>La sincronización no está disponible en este servidor.</p>
        <p className={styles.noticeText}>
          Si gestionas la app: en Vercel, Storage → Create Database → Upstash for Redis → conéctala al proyecto y vuelve a
          desplegar.
        </p>
      </div>
    </div>
  );
}

function SyncDisabledPanel({ unavailable }: { unavailable: boolean }) {
  const { sync, enableSync } = useApp();
  const { showToast } = useUI();
  const [busy, setBusy] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  // A failed activation that is not about the server setup (that one has its own notice)
  const lastError = sync.error && sync.status !== 'unconfigured' ? sync.error : null;

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await enableSync();
    setBusy(false);
    if (ok) {
      showToast('Sincronización activada', { tone: 'success' });
    } else {
      showToast(isOffline() ? 'Sin conexión: se sincronizará al volver internet' : 'No se pudo conectar con la nube', {
        tone: 'error',
      });
    }
  };

  return (
    <div className="card card--padded">
      <div className={styles.intro}>
        <span className={styles.introIcon} aria-hidden="true">
          <Users size={22} />
        </span>
        <p className={styles.introText}>
          Usa el mismo código en tu móvil, tu ordenador o el de tu pareja para compartir el menú, los platos y la lista al
          momento.
        </p>
      </div>

      {unavailable ? (
        <UnavailableNotice className={styles.noticeInCard} />
      ) : (
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-block" onClick={handleEnable} disabled={busy}>
            {busy ? <Spinner size={18} /> : <Cloud size={18} aria-hidden="true" />}
            {busy ? 'Activando…' : 'Activar sincronización'}
          </button>
          {!joinOpen && (
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setJoinOpen(true)}>
              <Link size={18} aria-hidden="true" />
              Unirme con un código
            </button>
          )}
          {lastError && !busy && (
            <p className={`field-error ${styles.inlineError}`} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              {lastError}
            </p>
          )}
        </div>
      )}

      {!unavailable && joinOpen && (
        <div className={styles.joinPanel}>
          <JoinForm onJoined={() => setJoinOpen(false)} onCancel={() => setJoinOpen(false)} />
        </div>
      )}
    </div>
  );
}

function SyncStatusRow({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const { sync } = useApp();
  const now = useNow(30_000);

  let icon: React.ReactNode = <Cloud size={18} />;
  let iconClass = styles.rowIcon;
  let title: string;
  let meta: string | null = 'Los cambios se comparten solos';
  let error = false;

  if (sync.status === 'syncing') {
    icon = <RefreshCw size={18} className="spin" />;
    iconClass = `${styles.rowIcon} ${styles.rowIconSoft}`;
    title = 'Sincronizando…';
    meta = 'Enviando y recibiendo cambios';
  } else if (sync.status === 'offline') {
    icon = <CloudOff size={18} />;
    iconClass = `${styles.rowIcon} ${styles.rowIconSoft}`;
    title = 'Sin conexión';
    meta = 'Se sincronizará al volver internet';
  } else if (sync.status === 'error' || sync.status === 'unconfigured') {
    icon = <AlertCircle size={18} />;
    iconClass = `${styles.rowIcon} ${styles.rowIconDanger}`;
    title = 'No se pudo sincronizar';
    meta = sync.error ?? 'Vuelve a intentarlo en un momento';
    error = true;
  } else if (sync.lastSyncAt) {
    title = `Sincronizado · ${formatRelativeTime(sync.lastSyncAt, Math.max(now, sync.lastSyncAt))}`;
  } else {
    title = 'Conectado a tu hogar';
    meta = 'Preparando la primera sincronización';
  }

  // No live region here: background pulls every 45 s would make VoiceOver repeat
  // "Sincronizando…" constantly. Manual actions already announce a toast.
  return (
    <div className={`list-row${error ? ` ${styles.statusRowError}` : ''}`}>
      <span className={iconClass} aria-hidden="true">
        {icon}
      </span>
      <div className="list-row__main">
        <div className="list-row__title">{title}</div>
        {meta && <div className={`list-row__meta ${styles.statusMeta}${error ? ` ${styles.statusError}` : ''}`}>{meta}</div>}
        {/* Below the message (not beside it): on a 320px iPhone the error text keeps the full width */}
        {error && (
          <button type="button" className={`btn btn-secondary btn-sm ${styles.retryBtn}`} onClick={onRetry} disabled={retrying}>
            {retrying ? <Spinner size={16} /> : <RefreshCw size={16} aria-hidden="true" />}
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

function SyncEnabledPanel() {
  const { sync, settings, syncNow, disableSync, regenerateSyncCode } = useApp();
  const { showToast, confirm } = useUI();
  const [joinOpen, setJoinOpen] = useState(false);
  const [manualSync, setManualSync] = useState(false);
  const code = settings.syncCode;
  const syncing = sync.status === 'syncing' || manualSync;

  const handleSyncNow = async () => {
    if (syncing) return;
    setManualSync(true);
    const ok = await syncNow();
    setManualSync(false);
    if (ok) {
      showToast('Todo sincronizado', { tone: 'success' });
    } else {
      showToast(isOffline() ? 'Sin conexión: se sincronizará al volver internet' : 'No se pudo sincronizar', { tone: 'error' });
    }
  };

  const handleCopy = async () => {
    const ok = await copyText(code);
    showToast(ok ? 'Código copiado' : 'No se pudo copiar. Mantén pulsado el código para seleccionarlo.', {
      tone: ok ? 'success' : 'error',
    });
  };

  const handleInvite = async () => {
    const result = await shareOrCopy({
      title: 'Menú & Compra',
      // On iPhone the link opens Safari, not the installed app: include the code to type in Ajustes
      text: `Únete a nuestro menú y lista de la compra. Si usas la app en la pantalla de inicio, ábrela y en Ajustes → «Unirme con un código» escribe ${code} (o pega este mensaje). También puedes abrir este enlace:`,
      url: `${window.location.origin}/?sync=${encodeURIComponent(code)}`,
    });
    if (result === 'copied') showToast('Enlace de invitación copiado', { tone: 'success' });
    else if (result === 'failed') showToast('No se pudo compartir. Copia el código y envíaselo.', { tone: 'error' });
  };

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: '¿Cambiar a un código seguro?',
      message:
        'Tus datos no cambian. Los demás dispositivos de tu hogar tendrán que escribir el nuevo código o abrir una nueva invitación.',
      confirmLabel: 'Cambiar código',
    });
    if (!ok) return;
    regenerateSyncCode();
    showToast('Código cambiado. Envía la nueva invitación a tu hogar.', { tone: 'success' });
  };

  const handleDisable = async () => {
    const ok = await confirm({
      title: '¿Desactivar la sincronización?',
      message:
        'Este dispositivo dejará de compartir cambios con tu hogar. Tus datos se quedan aquí y los demás dispositivos no pierden nada.',
      confirmLabel: 'Desactivar',
      destructive: true,
    });
    if (!ok) return;
    disableSync();
    showToast('Sincronización desactivada');
  };

  return (
    <>
      {sync.codeIsWeak && (
        <div className={`notice notice--warning ${styles.noticeBlock}`}>
          <ShieldAlert size={18} className={styles.noticeIcon} aria-hidden="true" />
          <div className="grow">
            <p className={styles.noticeTitle}>Tu código es corto y cualquiera podría adivinarlo.</p>
            <button type="button" className={`btn btn-secondary ${styles.noticeAction}`} onClick={handleRegenerate}>
              Cambiar a un código seguro
            </button>
          </div>
        </div>
      )}

      <div className="list">
        <SyncStatusRow onRetry={handleSyncNow} retrying={manualSync} />

        <div className={`list-row ${styles.blockRow}`}>
          <div className={styles.codeHead}>
            <span className={styles.codeLabel}>Código de tu hogar</span>
            <button type="button" className="text-btn" onClick={handleCopy}>
              <Copy size={17} aria-hidden="true" />
              Copiar
            </button>
          </div>
          <div className={styles.codeBox}>
            <span className={styles.code} translate="no">
              {code}
            </span>
          </div>
          <p className={styles.codeHint}>Escríbelo en tus otros dispositivos o envía una invitación.</p>
        </div>

        <RowButton
          icon={<Share size={18} />}
          title="Invitar a alguien"
          meta="Envía un enlace para unirse a tu hogar"
          onClick={handleInvite}
        />
        <RowButton
          icon={<RefreshCw size={18} className={syncing ? 'spin' : undefined} />}
          title={syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          meta="Normalmente se hace solo"
          trailing={null}
          busy={syncing}
          onClick={handleSyncNow}
        />
        {joinOpen ? (
          <div className={`list-row ${styles.blockRow}`}>
            <JoinForm onJoined={() => setJoinOpen(false)} onCancel={() => setJoinOpen(false)} />
          </div>
        ) : (
          <RowButton
            icon={<Link size={18} />}
            title="Unirme a otro hogar"
            meta="Si te han pasado otro código"
            onClick={() => setJoinOpen(true)}
          />
        )}
      </div>
      <p className={styles.note}>
        Los cambios se comparten solos en unos segundos. Solo quien tenga el código puede ver tus datos.
      </p>

      <div className={styles.disableRow}>
        <button type="button" className="text-btn text-btn--danger" onClick={handleDisable}>
          Desactivar sincronización
        </button>
      </div>
    </>
  );
}

/** Rendered only while open, so its state starts empty every time */
function JoinForm({ onJoined, onCancel }: { onJoined: () => void; onCancel: () => void }) {
  const { joinHousehold, settings, sync } = useApp();
  const { confirm, showToast } = useUI();
  const inputId = useId();
  const messageId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizeSyncCode(code);
    if (!normalized) {
      setError('Escribe el código del hogar');
      return;
    }
    // Check the format before asking: no point confirming a typo
    if (!isValidSyncCode(normalized)) {
      setError('El código no es válido. Revisa que esté bien escrito.');
      return;
    }
    if (sync.enabled && normalized === normalizeSyncCode(settings.syncCode)) {
      setError('Ya estás en este hogar');
      return;
    }
    inputRef.current?.blur();
    const accepted = await confirm({
      title: '¿Unirte a este hogar?',
      message: 'Lo que tengas en este dispositivo se combinará con los datos del hogar.',
      confirmLabel: 'Unirme',
    });
    if (!accepted) return;
    setBusy(true);
    const result = await joinHousehold(normalized);
    setBusy(false);
    if (result.ok) {
      showToast('Te has unido al hogar', { tone: 'success' });
      onJoined();
    } else {
      setError(result.message);
    }
  };

  return (
    <form className={styles.joinForm} onSubmit={handleSubmit} noValidate>
      <label className="field-label" htmlFor={inputId}>
        Código del hogar
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className={`input ${styles.codeInput}`}
        type="text"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        placeholder="CASA-XXXX-XXXX-XXXX"
        value={code}
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        onChange={(event) => {
          // Shown in capitals via CSS (no caret jumps); normalized when joining.
          // No maxLength: it would cut a pasted invitation link before the code.
          setCode(codeFromInput(event.target.value));
          setError(null);
        }}
      />
      {error ? (
        <p id={messageId} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        <p id={messageId} className="field-hint">
          Lo encuentras en Ajustes del otro dispositivo. También puedes pegar el enlace de invitación.
        </p>
      )}
      <div className={styles.joinActions}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Spinner size={18} /> : <Check size={18} aria-hidden="true" />}
          Unirme
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 3. Instalar en el iPhone
// ---------------------------------------------------------------------------

function InstallStep({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className={styles.step}>
      <span className={styles.stepNum} aria-hidden="true">
        {n}
      </span>
      <span className={styles.stepText}>{children}</span>
      <span className={styles.stepIcon} aria-hidden="true">
        {icon}
      </span>
    </li>
  );
}

function InstallSection() {
  // The view only renders in the browser, so these can be read once on mount
  const [installed] = useState(isStandalone);
  const [ios] = useState(isIos);

  if (installed) {
    return (
      <Section title="Aplicación">
        <div className="list">
          <div className="list-row">
            <span className={styles.rowIcon} aria-hidden="true">
              <CheckCircle2 size={18} />
            </span>
            <div className="list-row__main">
              <div className="list-row__title">Estás usando la app instalada</div>
              <div className="list-row__meta">Funciona sin conexión, también en el súper</div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Instalar en el iPhone">
      <div className="list">
        <p className={styles.installLead}>
          {ios
            ? 'Tenla a mano como una app más, en tu pantalla de inicio:'
            : 'Abre esta web en tu iPhone y sigue estos pasos:'}
        </p>
        {/* role="list": Safari drops list semantics when list-style is none */}
        <ol className={styles.steps} role="list">
          <InstallStep n={1} icon={<Compass size={20} />}>
            Abre esta página en <strong>Safari</strong>
          </InstallStep>
          <InstallStep n={2} icon={<Share size={20} />}>
            Toca <strong>Compartir</strong>
            <span className={styles.stepSub}>
              Si no lo ves, toca antes <Ellipsis size={14} className="inline-icon" role="img" aria-label="Más" />
            </span>
          </InstallStep>
          <InstallStep n={3} icon={<SquarePlus size={20} />}>
            Elige <strong>Añadir a pantalla de inicio</strong>
          </InstallStep>
          <InstallStep n={4} icon={<Check size={20} />}>
            Toca <strong>Añadir</strong>
            <span className={styles.stepSub}>El icono aparecerá junto a tus apps</span>
          </InstallStep>
        </ol>
        <div className={styles.tip}>
          <Lightbulb size={18} aria-hidden="true" />
          <p>Funciona sin conexión: tendrás tu lista en el súper aunque no haya cobertura.</p>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 4. Copia de seguridad
// ---------------------------------------------------------------------------

function BackupSection() {
  const { exportBackup, importBackup } = useApp();
  const { showToast, confirm } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ios] = useState(isIos);

  const handleExport = async () => {
    let json: string;
    try {
      json = exportBackup();
    } catch {
      showToast('No se pudo crear la copia', { tone: 'error' });
      return;
    }
    const file = new File([json], backupFileName(new Date()), { type: 'application/json' });

    // Phones: share sheet (Guardar en Archivos, AirDrop…). Computers: normal download.
    const preferShare = isIos() || window.matchMedia('(pointer: coarse)').matches;
    if (preferShare && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Copia de Menú & Compra' });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Otherwise fall back to a download
      }
    }
    downloadFile(file);
    showToast('Copia descargada', { tone: 'success' });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so the same file can be picked again later
    input.value = '';
    if (!file) return;

    let text: string;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('too large');
      text = await file.text();
      JSON.parse(text);
    } catch {
      showToast('Ese archivo no es una copia válida', { tone: 'error' });
      return;
    }

    const accepted = await confirm({
      title: '¿Restaurar la copia?',
      message: 'Se sustituirán tus platos, menú y lista por los de la copia. Podrás deshacerlo justo después.',
      confirmLabel: 'Restaurar',
      destructive: true,
    });
    if (!accepted) return;
    if (!importBackup(text)) showToast('Ese archivo no es una copia válida', { tone: 'error' });
  };

  return (
    <Section title="Copia de seguridad" note="Incluye tus platos, el menú, las plantillas y la lista. Útil antes de cambiar de móvil.">
      <div className="list">
        <RowButton
          icon={<Download size={18} />}
          title="Exportar copia"
          meta={ios ? 'Guárdala en Archivos o envíala por AirDrop' : 'Descarga un archivo con todos tus datos'}
          onClick={handleExport}
        />
        <RowButton
          icon={<Upload size={18} />}
          title="Restaurar copia"
          meta="Recupera tus datos desde un archivo"
          onClick={() => fileInputRef.current?.click()}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 5. Borrar datos
// ---------------------------------------------------------------------------

function DangerSection() {
  const { resetAllData, sync } = useApp();
  const { confirm } = useUI();

  const handleReset = async () => {
    const ok = await confirm({
      title: '¿Borrar todos los datos?',
      message: (
        <>
          Se borrarán tus platos, el menú de la semana, las plantillas y la lista de la compra.
          {sync.enabled && (
            <>
              {' '}
              <strong>También se borrarán en los demás dispositivos de tu hogar.</strong>
            </>
          )}{' '}
          No se puede deshacer: si quieres, exporta antes una copia de seguridad.
        </>
      ),
      confirmLabel: 'Borrar todo',
      destructive: true,
    });
    if (ok) resetAllData();
  };

  return (
    <Section title="Borrar datos">
      <div className="card card--padded">
        <p className={styles.dangerText}>
          Empieza de cero: borra platos, menú, plantillas y lista de la compra
          {sync.enabled ? ' en todos los dispositivos de tu hogar.' : ' de este dispositivo.'}
        </p>
        <button type="button" className={`btn btn-danger btn-block ${styles.dangerBtn}`} onClick={handleReset}>
          <Trash2 size={18} aria-hidden="true" />
          Borrar todos los datos
        </button>
      </div>
    </Section>
  );
}
