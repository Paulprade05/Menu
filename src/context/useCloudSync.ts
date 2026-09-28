'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SyncDoc, SyncStatus, UserSettings } from '@/types';
import { buildSyncDoc, docFingerprint, mergePrefs, mergeSyncDocs, type SyncableData } from '@/lib/sync';
import { pullDoc, pushDoc, type SyncErrorKind } from '@/lib/syncClient';

/*
 * Automatic household sync:
 * - pushes local changes ~1 s after the last edit (the server merges and returns the result)
 * - pulls when the app opens, when it comes back to the foreground, when the
 *   connection returns and every 45 s while visible
 * Nothing happens until the user enables sync (or joins a household).
 */

const PUSH_DEBOUNCE_MS = 1200;
const PULL_INTERVAL_MS = 45_000;
const RETRY_MS = 20_000;

export type JoinResult = { ok: true } | { ok: false; message: string };

interface SyncState {
  enabled: boolean;
  lastSyncAt: number | null;
}

interface Args {
  data: SyncableData;
  settings: UserSettings;
  syncState: SyncState;
  setData: Dispatch<SetStateAction<SyncableData>>;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  dataRef: MutableRefObject<SyncableData>;
  settingsRef: MutableRefObject<UserSettings>;
}

/** Fingerprint without pruning or timestamps (now = 0 keeps every tombstone) */
function localFingerprint(data: SyncableData, settings: UserSettings): string {
  return docFingerprint(buildSyncDoc(data, settings, 0));
}

export function useCloudSync({ data, settings, syncState, setData, setSettings, setSyncState, dataRef, settingsRef }: Args) {
  const [status, setStatus] = useState<SyncStatus>(syncState.enabled ? 'idle' : 'off');
  const [error, setError] = useState<string | null>(null);

  const enabledRef = useRef(syncState.enabled);
  const lastSyncedFp = useRef<string | null>(null);
  const inFlight = useRef(false);
  const pendingPush = useRef(false);
  const retryTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    enabledRef.current = syncState.enabled;
  }, [syncState.enabled]);

  /** Merges a document from the cloud into the local state */
  const applyRemote = useCallback(
    (doc: SyncDoc) => {
      const now = Date.now();
      setData((current) => {
        const localDoc = buildSyncDoc(current, settingsRef.current, 0);
        const merged = mergeSyncDocs(localDoc, doc, now);
        const comparable = { ...merged, prefs: localDoc.prefs };
        if (docFingerprint(comparable) === docFingerprint(localDoc)) return current;
        return {
          dishes: merged.dishes,
          savedMenus: merged.savedMenus,
          shoppingList: merged.shoppingList,
          weekMenu: merged.weekMenu,
          tombstones: merged.tombstones,
        };
      });
      setSettings((s) => {
        const local = {
          postalCode: s.postalCode,
          warehouse: s.warehouse,
          defaultDaysCount: s.defaultDaysCount === 7 ? 7 : 6,
          updatedAt: s.prefsUpdatedAt ?? 0,
        };
        const winner = mergePrefs(local, doc.prefs);
        if (winner === local) return s;
        return {
          ...s,
          postalCode: winner.postalCode,
          warehouse: winner.warehouse,
          defaultDaysCount: winner.defaultDaysCount,
          prefsUpdatedAt: winner.updatedAt,
        };
      });
    },
    [setData, setSettings, settingsRef],
  );

  const clearRetry = () => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  };

  const markSynced = useCallback(() => {
    clearRetry();
    setStatus('synced');
    setError(null);
    setSyncState((s) => ({ ...s, lastSyncAt: Date.now() }));
  }, [setSyncState]);

  // `push` and `pull` reference each other (and themselves) through refs
  const pullRef = useRef<() => Promise<boolean>>(async () => false);
  const pushRef = useRef<(code?: string) => Promise<boolean>>(async () => false);

  const lastErrorKind = useRef<SyncErrorKind | null>(null);

  const handleError = useCallback((kind: SyncErrorKind, message: string) => {
    lastErrorKind.current = kind;
    setError(message);
    setStatus(kind === 'offline' ? 'offline' : kind === 'unconfigured' ? 'unconfigured' : 'error');
    if ((kind === 'server' || kind === 'offline') && enabledRef.current) {
      clearRetry();
      retryTimer.current = window.setTimeout(() => void pullRef.current(), RETRY_MS);
    }
  }, []);

  const push = useCallback(
    async (codeOverride?: string): Promise<boolean> => {
      if (inFlight.current) {
        pendingPush.current = true;
        return false;
      }
      const code = codeOverride ?? settingsRef.current.syncCode;
      const doc = buildSyncDoc(dataRef.current, settingsRef.current);
      inFlight.current = true;
      setStatus('syncing');
      const result = await pushDoc(code, doc);
      inFlight.current = false;

      if (!result.ok) {
        handleError(result.error, result.message);
        return false;
      }
      if (code === settingsRef.current.syncCode) {
        lastSyncedFp.current = docFingerprint(result.doc);
        applyRemote(result.doc);
      }
      markSynced();
      if (pendingPush.current) {
        pendingPush.current = false;
        window.setTimeout(() => void pushRef.current(), 50);
      }
      return true;
    },
    [applyRemote, dataRef, handleError, markSynced, settingsRef],
  );

  useEffect(() => {
    pushRef.current = push;
  }, [push]);

  const pull = useCallback(async (): Promise<boolean> => {
    if (inFlight.current || !enabledRef.current) return false;
    const code = settingsRef.current.syncCode;
    inFlight.current = true;
    setStatus('syncing');
    const result = await pullDoc(code);
    inFlight.current = false;

    if (!result.ok) {
      handleError(result.error, result.message);
      return false;
    }
    if (code !== settingsRef.current.syncCode) {
      // The household code changed during this request (new code / joined): upload to the new one
      pendingPush.current = false;
      setStatus('idle');
      if (enabledRef.current) window.setTimeout(() => void pushRef.current(), 50);
      return false;
    }

    const localDoc = buildSyncDoc(dataRef.current, settingsRef.current);
    if (result.found && result.doc) {
      lastSyncedFp.current = docFingerprint(result.doc);
      applyRemote(result.doc);
      // This device has changes the cloud doesn't: upload them
      const merged = mergeSyncDocs(localDoc, result.doc);
      if (docFingerprint(merged) !== lastSyncedFp.current) {
        window.setTimeout(() => void push(), 300);
      }
    } else {
      // Nothing stored for this code yet
      lastSyncedFp.current = null;
      window.setTimeout(() => void push(), 300);
    }
    markSynced();
    return true;
  }, [applyRemote, dataRef, handleError, markSynced, push, settingsRef]);

  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);

  // Push local changes shortly after they happen
  const fingerprint = useMemo(() => (syncState.enabled ? localFingerprint(data, settings) : ''), [data, settings, syncState.enabled]);

  useEffect(() => {
    if (!syncState.enabled || !fingerprint || fingerprint === lastSyncedFp.current) return;
    const timer = window.setTimeout(() => void push(), PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [syncState.enabled, fingerprint, push]);

  // Pull on start, when returning to the app, when back online and periodically
  useEffect(() => {
    if (!syncState.enabled) return;
    const first = window.setTimeout(() => void pull(), 100);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull();
    }, PULL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pull();
    };
    const onOnline = () => void pull();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      clearRetry();
    };
  }, [syncState.enabled, pull]);

  const enable = useCallback(async (): Promise<boolean> => {
    enabledRef.current = true;
    lastSyncedFp.current = null;
    setError(null);
    setSyncState((s) => ({ ...s, enabled: true }));
    lastErrorKind.current = null;
    const ok = await push();
    if (!ok && (lastErrorKind.current === 'unconfigured' || lastErrorKind.current === 'bad_code')) {
      // A wrong configuration is not something a retry will fix: switch it back off
      enabledRef.current = false;
      clearRetry();
      setSyncState((s) => ({ ...s, enabled: false }));
    }
    return ok;
  }, [push, setSyncState]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    clearRetry();
    setSyncState((s) => ({ ...s, enabled: false }));
    setStatus('off');
    setError(null);
  }, [setSyncState]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current) return false;
    return push();
  }, [push]);

  const join = useCallback(
    async (code: string): Promise<JoinResult> => {
      const previousStatus = enabledRef.current ? 'idle' : 'off';
      setStatus('syncing');
      const result = await pullDoc(code);
      if (!result.ok) {
        setStatus(previousStatus);
        return { ok: false, message: result.message };
      }
      if (!result.found || !result.doc) {
        setStatus(previousStatus);
        return { ok: false, message: 'No hay ningún hogar con ese código. Comprueba que esté bien escrito.' };
      }
      settingsRef.current = { ...settingsRef.current, syncCode: code };
      setSettings((s) => ({ ...s, syncCode: code }));
      lastSyncedFp.current = docFingerprint(result.doc);
      applyRemote(result.doc);
      enabledRef.current = true;
      setSyncState((s) => ({ ...s, enabled: true }));
      markSynced();
      // Upload whatever this device had that the household didn't
      window.setTimeout(() => void push(code), 400);
      return { ok: true };
    },
    [applyRemote, markSynced, push, setSettings, setSyncState, settingsRef],
  );

  const changeCode = useCallback(
    (code: string) => {
      settingsRef.current = { ...settingsRef.current, syncCode: code };
      setSettings((s) => ({ ...s, syncCode: code }));
      lastSyncedFp.current = null;
      if (enabledRef.current) void push(code);
    },
    [push, setSettings, settingsRef],
  );

  return useMemo(
    () => ({ status, error, enable, disable, syncNow, join, changeCode }),
    [status, error, enable, disable, syncNow, join, changeCode],
  );
}
