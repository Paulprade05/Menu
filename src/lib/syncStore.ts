/**
 * Server-side storage for household documents.
 *
 * - Upstash Redis (REST) when its environment variables are present. In Vercel:
 *   Storage → Create Database → "Upstash for Redis" → connect it to the project.
 *   Vercel injects KV_REST_API_URL / KV_REST_API_TOKEN automatically.
 * - Local JSON files in `.sync-data/` when running on your own computer/server.
 * - Otherwise sync is reported as "not configured" (no silent data loss).
 */
import fs from 'fs';
import path from 'path';

const KEY_PREFIX = 'menu-compra:sync:v1:';

export type SyncBackend = 'redis' | 'file' | 'none';

export interface SyncStore {
  backend: SyncBackend;
  read(code: string): Promise<unknown | null>;
  write(code: string, doc: unknown): Promise<void>;
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redisCommand(config: { url: string; token: string }, command: (string | number)[]): Promise<unknown> {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!res.ok || !json || json.error) {
    throw new Error(json?.error || `Redis respondió ${res.status}`);
  }
  return json.result;
}

function createRedisStore(config: { url: string; token: string }): SyncStore {
  return {
    backend: 'redis',
    async read(code) {
      const result = await redisCommand(config, ['GET', KEY_PREFIX + code]);
      if (typeof result !== 'string') return null;
      try {
        return JSON.parse(result);
      } catch {
        return null;
      }
    },
    async write(code, doc) {
      await redisCommand(config, ['SET', KEY_PREFIX + code, JSON.stringify(doc)]);
    },
  };
}

const DATA_DIR = path.join(process.cwd(), '.sync-data');

function fileForCode(code: string): string {
  return path.join(DATA_DIR, `${code.replace(/[^A-Z0-9_-]/gi, '_')}.json`);
}

let fileStoreWritable: boolean | null = null;

function canUseFileStore(): boolean {
  if (fileStoreWritable !== null) return fileStoreWritable;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, '.write-test');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    fileStoreWritable = true;
  } catch {
    fileStoreWritable = false;
  }
  return fileStoreWritable;
}

const fileStore: SyncStore = {
  backend: 'file',
  async read(code) {
    try {
      const content = await fs.promises.readFile(fileForCode(code), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  },
  async write(code, doc) {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const target = fileForCode(code);
    // Unique temp name: two devices can push the same household at the same time
    const tmp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(doc), 'utf-8');
    try {
      await fs.promises.rename(tmp, target);
    } catch {
      // Windows can refuse to replace a file that is being read: fall back to a direct write
      await fs.promises.writeFile(target, JSON.stringify(doc), 'utf-8');
      await fs.promises.unlink(tmp).catch(() => undefined);
    }
  },
};

const noStore: SyncStore = {
  backend: 'none',
  async read() {
    return null;
  },
  async write() {
    throw new Error('Sincronización no configurada');
  },
};

export function getSyncStore(): SyncStore {
  const redis = redisConfig();
  if (redis) return createRedisStore(redis);
  // On Vercel the project folder is read-only: files would be lost, so don't pretend.
  if (!process.env.VERCEL && canUseFileStore()) return fileStore;
  return noStore;
}
