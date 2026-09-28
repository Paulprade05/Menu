import { NextRequest, NextResponse } from 'next/server';
import { getSyncStore } from '@/lib/syncStore';
import {
  MAX_SYNC_DOC_BYTES,
  isValidSyncCode,
  mergeSyncDocs,
  normalizeSyncCode,
  normalizeSyncDoc,
} from '@/lib/sync';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function notConfigured() {
  return json(
    {
      error: 'not_configured',
      message: 'La sincronización no está configurada en el servidor (falta la base de datos Upstash Redis).',
    },
    503,
  );
}

/** GET /api/sync → is sync available on this server? (codes never travel in URLs) */
export async function GET() {
  const store = getSyncStore();
  return json({ configured: store.backend !== 'none', backend: store.backend });
}

/**
 * POST /api/sync
 *   { action: 'pull', code }        → { found, doc }
 *   { action: 'push', code, doc }   → { doc } (server copy merged with the incoming one)
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_SYNC_DOC_BYTES + 2_000) {
    return json({ error: 'too_large', message: 'Hay demasiados datos para sincronizar.' }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_request', message: 'Petición no válida.' }, 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return json({ error: 'bad_request', message: 'Petición no válida.' }, 400);
  }
  const body = parsed as { action?: unknown; code?: unknown; doc?: unknown };

  const code = normalizeSyncCode(typeof body.code === 'string' ? body.code : '');
  if (!isValidSyncCode(code)) {
    return json({ error: 'bad_code', message: 'El código de hogar no es válido.' }, 400);
  }

  const store = getSyncStore();
  if (store.backend === 'none') return notConfigured();

  try {
    if (body.action === 'pull') {
      const stored = normalizeSyncDoc(await store.read(code));
      return json({ found: Boolean(stored), doc: stored });
    }

    if (body.action === 'push') {
      const incoming = normalizeSyncDoc(body.doc);
      if (!incoming) {
        return json({ error: 'bad_request', message: 'Datos no válidos.' }, 400);
      }
      const now = Date.now();
      const stored = normalizeSyncDoc(await store.read(code), now);
      const merged = stored ? mergeSyncDocs(stored, incoming, now) : incoming;
      merged.updatedAt = now;
      if (JSON.stringify(merged).length > MAX_SYNC_DOC_BYTES) {
        return json({ error: 'too_large', message: 'Hay demasiados datos para sincronizar.' }, 413);
      }
      await store.write(code, merged);
      return json({ doc: merged });
    }

    return json({ error: 'bad_request', message: 'Acción desconocida.' }, 400);
  } catch (error) {
    console.error('[sync]', error);
    return json({ error: 'server_error', message: 'No se pudo conectar con la base de datos.' }, 502);
  }
}
