/**
 * Household sync: pure helpers shared by the browser and the /api/sync route.
 *
 * Every device keeps a full copy of the data. To combine two copies we merge
 * entity by entity (dishes, saved menus, shopping items): the version with the
 * newest `updatedAt` wins, and deletions are remembered as tombstones so a
 * deleted item does not come back from another device. The week menu and the
 * preferences are merged as a whole (newest wins).
 */
import type {
  DayPlan,
  Dish,
  SavedMenuTemplate,
  ShoppingListItem,
  SyncDoc,
  SyncPrefs,
  Tombstones,
  UserSettings,
  WeekMenu,
} from '@/types';
import { DEFAULT_POSTAL_CODE, DEFAULT_WAREHOUSE, createEmptyWeekMenu } from '@/data/initialData';

/** Tombstones older than this are forgotten */
export const TOMBSTONE_TTL_MS = 60 * 24 * 60 * 60 * 1000;
/** Maximum size of a household document (bytes of JSON) */
export const MAX_SYNC_DOC_BYTES = 1_000_000;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no 0/O/1/I

/** "CASA-7KQ2-M9XD-4TPB": 60 random bits, not guessable */
export function generateSyncCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `CASA-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`;
}

export function normalizeSyncCode(input: string): string {
  return (input || '').toUpperCase().replace(/\s+/g, '').trim();
}

export function isValidSyncCode(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{3,39}$/.test(code);
}

/** Old codes like "CASA-1234" or "LOGRO-101" can be guessed by anyone */
export function isWeakSyncCode(code: string): boolean {
  const body = normalizeSyncCode(code).replace(/^(CASA|LOGRO)-/, '').replace(/[-_]/g, '');
  return body.length < 10;
}

// ---------------------------------------------------------------------------
// Normalization (also accepts the old payload format of the first version)
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function entityArray<T extends { id: string }>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item as unknown as T);
  }
  return out;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Always returns a menu with the 7 days in order */
export function sanitizeWeekMenu(value: unknown): WeekMenu {
  const empty = createEmptyWeekMenu();
  if (!isRecord(value) || !Array.isArray(value.days)) return empty;
  const incomingDays = value.days.filter(isRecord) as unknown as DayPlan[];
  const days = empty.days.map((base) => {
    const found = incomingDays.find((d) => d.dayKey === base.dayKey);
    if (!found) return base;
    return {
      ...base,
      comidaDishId: typeof found.comidaDishId === 'string' ? found.comidaDishId : null,
      comidaCustomName: typeof found.comidaCustomName === 'string' && found.comidaCustomName ? found.comidaCustomName : undefined,
      cenaDishId: typeof found.cenaDishId === 'string' ? found.cenaDishId : null,
      cenaCustomName: typeof found.cenaCustomName === 'string' && found.cenaCustomName ? found.cenaCustomName : undefined,
    };
  });
  const activeDaysCount = value.activeDaysCount === 7 ? 7 : 6;
  const menu: WeekMenu = {
    id: typeof value.id === 'string' ? value.id : empty.id,
    name: typeof value.name === 'string' ? value.name : empty.name,
    activeDaysCount,
    days,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : empty.updatedAt,
  };
  if (isRecord(value.fieldUpdatedAt)) {
    const fieldUpdatedAt: Record<string, number> = {};
    for (const [key, ts] of Object.entries(value.fieldUpdatedAt)) {
      if (MENU_FIELD_KEYS.includes(key) && typeof ts === 'number' && Number.isFinite(ts)) fieldUpdatedAt[key] = ts;
    }
    menu.fieldUpdatedAt = fieldUpdatedAt;
  }
  return menu;
}

// ---------------------------------------------------------------------------
// Week menu: each meal is merged on its own
// ---------------------------------------------------------------------------

const DAY_KEYS = createEmptyWeekMenu().days.map((d) => d.dayKey);

/** "lunes:comida", "lunes:cena", … plus "activeDaysCount" and "name" */
export const MENU_FIELD_KEYS: string[] = [
  ...DAY_KEYS.flatMap((day) => [`${day}:comida`, `${day}:cena`]),
  'activeDaysCount',
  'name',
];

function menuFieldValue(menu: WeekMenu, key: string): unknown {
  if (key === 'activeDaysCount') return menu.activeDaysCount;
  if (key === 'name') return menu.name;
  const [dayKey, slot] = key.split(':');
  const day = menu.days.find((d) => d.dayKey === dayKey);
  if (!day) return [null, null];
  return slot === 'comida'
    ? [day.comidaDishId ?? null, day.comidaCustomName || null]
    : [day.cenaDishId ?? null, day.cenaCustomName || null];
}

function menuFieldTime(menu: WeekMenu, key: string): number {
  const ts = menu.fieldUpdatedAt?.[key];
  return typeof ts === 'number' && Number.isFinite(ts) ? ts : menuTime(menu);
}

/**
 * Returns `next` stamped for syncing: every meal (or setting) that differs from
 * `prev` gets `now` as its change time. Use it for every change to the week menu.
 */
export function stampWeekMenu(prev: WeekMenu, next: WeekMenu, now: number): WeekMenu {
  const fieldUpdatedAt: Record<string, number> = {};
  for (const key of MENU_FIELD_KEYS) {
    const changed = stableStringify(menuFieldValue(prev, key)) !== stableStringify(menuFieldValue(next, key));
    fieldUpdatedAt[key] = changed ? now : menuFieldTime(prev, key);
  }
  return { ...next, fieldUpdatedAt, updatedAt: new Date(now).toISOString() };
}

/** Puts back, in `current`, the meals an action changed from `before` to `after` (unless changed again since) */
export function revertWeekMenuFields(current: WeekMenu, before: WeekMenu, after: WeekMenu, now: number): WeekMenu {
  let result = current;
  for (const key of MENU_FIELD_KEYS) {
    const beforeValue = stableStringify(menuFieldValue(before, key));
    const afterValue = stableStringify(menuFieldValue(after, key));
    if (beforeValue === afterValue) continue;
    if (stableStringify(menuFieldValue(result, key)) !== afterValue) continue; // changed again since
    result = copyMenuField(result, before, key);
  }
  return result === current ? current : stampWeekMenu(current, result, now);
}

function copyMenuField(target: WeekMenu, source: WeekMenu, key: string): WeekMenu {
  if (key === 'activeDaysCount') return { ...target, activeDaysCount: source.activeDaysCount };
  if (key === 'name') return { ...target, name: source.name };
  const [dayKey, slot] = key.split(':');
  const from = source.days.find((d) => d.dayKey === dayKey);
  if (!from) return target;
  return {
    ...target,
    days: target.days.map((day) => {
      if (day.dayKey !== dayKey) return day;
      return slot === 'comida'
        ? { ...day, comidaDishId: from.comidaDishId ?? null, comidaCustomName: from.comidaCustomName || undefined }
        : { ...day, cenaDishId: from.cenaDishId ?? null, cenaCustomName: from.cenaCustomName || undefined };
    }),
  };
}

/** Meal by meal: the newest change of each meal wins (commutative) */
export function mergeWeekMenus(a: WeekMenu, b: WeekMenu): WeekMenu {
  if (a === b) return a;
  const pick = (key: string): WeekMenu => pickNewest(a, b, menuFieldTime(a, key), menuFieldTime(b, key), (m) => menuFieldValue(m, key));
  let merged: WeekMenu = sanitizeWeekMenu({ days: [] });
  const fieldUpdatedAt: Record<string, number> = {};
  for (const key of MENU_FIELD_KEYS) {
    merged = copyMenuField(merged, pick(key), key);
    fieldUpdatedAt[key] = Math.max(menuFieldTime(a, key), menuFieldTime(b, key));
  }
  return {
    ...merged,
    updatedAt: new Date(Math.max(menuTime(a), menuTime(b))).toISOString(),
    fieldUpdatedAt,
  };
}

// ---------------------------------------------------------------------------
// Stable serialization (key order independent)
// ---------------------------------------------------------------------------

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : sortKeysDeep(v)));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined && typeof v !== 'function') out[key] = sortKeysDeep(v);
    }
    return out;
  }
  return value;
}

/** JSON.stringify with sorted object keys: the same data always gives the same string */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sanitizeTombstones(value: unknown, now: number): Tombstones {
  const out: Tombstones = {};
  if (!isRecord(value)) return out;
  const cutoff = now - TOMBSTONE_TTL_MS;
  for (const [id, ts] of Object.entries(value)) {
    if (typeof ts === 'number' && Number.isFinite(ts) && ts >= cutoff) out[id] = ts;
  }
  return out;
}

function sanitizePrefs(value: unknown): SyncPrefs {
  const src = isRecord(value) ? value : {};
  return {
    postalCode: typeof src.postalCode === 'string' && src.postalCode ? src.postalCode : DEFAULT_POSTAL_CODE,
    warehouse: typeof src.warehouse === 'string' && src.warehouse ? src.warehouse : DEFAULT_WAREHOUSE,
    defaultDaysCount: src.defaultDaysCount === 7 ? 7 : 6,
    updatedAt: toNumber(src.updatedAt ?? src.prefsUpdatedAt),
  };
}

/** Validates an unknown JSON value and converts it to a SyncDoc (null if unusable) */
export function normalizeSyncDoc(raw: unknown, now: number = Date.now()): SyncDoc | null {
  if (!isRecord(raw)) return null;
  return {
    schema: 1,
    dishes: entityArray<Dish>(raw.dishes),
    savedMenus: entityArray<SavedMenuTemplate>(raw.savedMenus),
    shoppingList: entityArray<ShoppingListItem>(raw.shoppingList),
    weekMenu: sanitizeWeekMenu(raw.weekMenu),
    // first version stored the whole settings object instead of prefs
    prefs: sanitizePrefs(raw.prefs ?? raw.settings),
    tombstones: sanitizeTombstones(raw.tombstones, now),
    updatedAt: toNumber(raw.updatedAt, toNumber(raw.timestamp)),
  };
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

function entityTime(entity: { updatedAt?: number }): number {
  return typeof entity.updatedAt === 'number' && Number.isFinite(entity.updatedAt) ? entity.updatedAt : 0;
}

function menuTime(menu: WeekMenu): number {
  const t = Date.parse(menu.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Newest wins. On equal times the choice must not depend on which side is
 * "local", otherwise two devices would keep overwriting each other: compare the
 * serialized values instead.
 */
function pickNewest<T>(a: T, b: T, timeA: number, timeB: number, valueOf: (x: T) => unknown = (x) => x): T {
  if (timeA !== timeB) return timeA > timeB ? a : b;
  if (a === b) return a;
  return stableStringify(valueOf(a)) >= stableStringify(valueOf(b)) ? a : b;
}

export function mergePrefs(a: SyncPrefs, b: SyncPrefs): SyncPrefs {
  return pickNewest(a, b, a.updatedAt, b.updatedAt);
}

export function mergeTombstones(a: Tombstones, b: Tombstones, now: number = Date.now()): Tombstones {
  const out: Tombstones = {};
  const cutoff = now - TOMBSTONE_TTL_MS;
  for (const source of [a, b]) {
    for (const [id, ts] of Object.entries(source)) {
      if (ts < cutoff) continue;
      if (out[id] === undefined || ts > out[id]) out[id] = ts;
    }
  }
  return out;
}

/**
 * Merges two lists of entities. Items only present in `remote` go first (they are
 * new from another device), then `local` in its order. The newest version of each
 * item wins; an item is dropped when it was deleted after its last change.
 */
export function mergeEntities<T extends { id: string; updatedAt?: number }>(
  local: T[],
  remote: T[],
  tombstones: Tombstones,
): T[] {
  const remoteById = new Map(remote.map((e) => [e.id, e]));
  const localIds = new Set(local.map((e) => e.id));
  const isAlive = (e: T) => tombstones[e.id] === undefined || entityTime(e) > tombstones[e.id];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of remote) {
    if (localIds.has(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    if (isAlive(r)) out.push(r);
  }
  for (const l of local) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    const r = remoteById.get(l.id);
    const winner = r ? pickNewest(l, r, entityTime(l), entityTime(r)) : l;
    if (isAlive(winner)) out.push(winner);
  }
  return out;
}

/**
 * Combines two household documents. The result is the same whichever side is
 * `local` (commutative), so every device converges to the same data.
 */
export function mergeSyncDocs(local: SyncDoc, remote: SyncDoc, now: number = Date.now()): SyncDoc {
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones, now);
  return {
    schema: 1,
    dishes: mergeEntities(local.dishes, remote.dishes, tombstones),
    savedMenus: mergeEntities(local.savedMenus, remote.savedMenus, tombstones),
    shoppingList: mergeEntities(local.shoppingList, remote.shoppingList, tombstones),
    weekMenu: mergeWeekMenus(local.weekMenu, remote.weekMenu),
    prefs: mergePrefs(local.prefs, remote.prefs),
    tombstones,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

/**
 * Content fingerprint: equal when two documents hold the same data, regardless
 * of list order or when they were saved.
 */
export function docFingerprint(doc: SyncDoc): string {
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return stableStringify({
    d: [...doc.dishes].sort(byId),
    s: [...doc.savedMenus].sort(byId),
    l: [...doc.shoppingList].sort(byId),
    w: doc.weekMenu,
    p: doc.prefs,
    t: doc.tombstones,
  });
}

export interface SyncableData {
  dishes: Dish[];
  weekMenu: WeekMenu;
  savedMenus: SavedMenuTemplate[];
  shoppingList: ShoppingListItem[];
  tombstones: Tombstones;
}

export function buildSyncDoc(data: SyncableData, settings: UserSettings, now: number = Date.now()): SyncDoc {
  return {
    schema: 1,
    dishes: data.dishes,
    savedMenus: data.savedMenus,
    shoppingList: data.shoppingList,
    weekMenu: data.weekMenu,
    prefs: {
      postalCode: settings.postalCode,
      warehouse: settings.warehouse,
      defaultDaysCount: settings.defaultDaysCount === 7 ? 7 : 6,
      updatedAt: settings.prefsUpdatedAt ?? 0,
    },
    tombstones: sanitizeTombstones(data.tombstones, now),
    updatedAt: now,
  };
}
