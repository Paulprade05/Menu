import type { SyncDoc } from '@/types';
import { normalizeSyncDoc } from './sync';

export type SyncErrorKind = 'offline' | 'unconfigured' | 'bad_code' | 'too_large' | 'server';

export type SyncResult<T> = ({ ok: true } & T) | { ok: false; error: SyncErrorKind; message: string };

const MESSAGES: Record<SyncErrorKind, string> = {
  offline: 'Sin conexión. Se sincronizará al recuperar internet.',
  unconfigured: 'La sincronización no está configurada en el servidor.',
  bad_code: 'El código de hogar no es válido.',
  too_large: 'Hay demasiados datos para sincronizar.',
  server: 'No se pudo conectar con la nube. Se reintentará.',
};

async function call<T>(body: Record<string, unknown>, timeoutMs = 12_000): Promise<SyncResult<T>> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: 'offline', message: MESSAGES.offline };
  }
  let res: Response;
  try {
    res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return { ok: false, error: offline ? 'offline' : 'server', message: offline ? MESSAGES.offline : MESSAGES.server };
  }
  const json = (await res.json().catch(() => null)) as (Record<string, unknown> & { message?: string }) | null;
  if (!res.ok || !json) {
    const kind: SyncErrorKind =
      res.status === 503 ? 'unconfigured' : res.status === 400 ? 'bad_code' : res.status === 413 ? 'too_large' : 'server';
    return { ok: false, error: kind, message: (json?.message as string) || MESSAGES[kind] };
  }
  return { ok: true, ...(json as T) };
}

export async function pullDoc(code: string): Promise<SyncResult<{ found: boolean; doc: SyncDoc | null }>> {
  const result = await call<{ found?: boolean; doc?: unknown }>({ action: 'pull', code });
  if (!result.ok) return result;
  const doc = normalizeSyncDoc(result.doc);
  return { ok: true, found: Boolean(result.found && doc), doc };
}

export async function pushDoc(code: string, doc: SyncDoc): Promise<SyncResult<{ doc: SyncDoc }>> {
  const result = await call<{ doc?: unknown }>({ action: 'push', code, doc });
  if (!result.ok) return result;
  const merged = normalizeSyncDoc(result.doc);
  if (!merged) return { ok: false, error: 'server', message: MESSAGES.server };
  return { ok: true, doc: merged };
}

export async function fetchSyncServerStatus(): Promise<{ configured: boolean; backend: string } | null> {
  try {
    const res = await fetch('/api/sync', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { configured?: boolean; backend?: string };
    return { configured: Boolean(json.configured), backend: json.backend || 'none' };
  } catch {
    return null;
  }
}
