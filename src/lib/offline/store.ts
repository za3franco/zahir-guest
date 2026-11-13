'use client'

// On-device storage for the offline audit mode (ZG-6).
// IndexedDB when the workspace has the offline mode; otherwise (or when IndexedDB is unavailable, e.g. some
// private windows) an in-memory store with the same interface, so the audit screen has a single code path.
//
// Stores
//   audits : one record per (user, audit): last known answers / ratings / photos, last sync time
//   ops    : changes not yet accepted by the server, one per (user, audit, standard | section | photo)
//   blobs  : photos taken on the phone and not uploaded yet (PR 2)

export type ResponseValue = 'meet' | 'below' | 'na' | null

export interface LocalResponse { response: ResponseValue; note: string; ts: number }
export interface LocalRating { rating: number; ts: number }

export interface AuditRecord {
  id: string // `${userId}|${campaignId}`
  userId: string
  campaignId: string
  campaignName?: string
  responses: Record<string, LocalResponse>
  ratings: Record<string, LocalRating>
  /** Photos known to be on the server, per standard */
  photos: { id: string; standard_id: string | null }[]
  touchedAt: number
  lastSyncAt: number | null
}

export type OpKind = 'response' | 'rating' | 'photo_add' | 'photo_delete'

export interface OpRecord {
  id: string // `${userId}|${campaignId}|${key}`
  userId: string
  campaignId: string
  key: string // r:<standardId> | e:<sectionId> | p:<photoId>
  kind: OpKind
  opId: string // changes on every edit: the server result only clears the op it answers
  ts: number // when the change was made on the phone
  payload: any
  tries: number
  /** Set when the server refused this change for good (it is kept and shown, never silently dropped) */
  rejected?: string
}

export interface BlobRecord {
  id: string // photo id (also the server id once uploaded)
  userId: string
  campaignId: string
  standardId: string
  blob: Blob
  createdAt: number
}

export interface OfflineStore {
  readonly persistent: boolean
  getAudit(userId: string, campaignId: string): Promise<AuditRecord | null>
  putAudit(rec: AuditRecord): Promise<void>
  deleteAudit(userId: string, campaignId: string): Promise<void>
  listAudits(): Promise<AuditRecord[]>
  listOps(userId: string, campaignId?: string): Promise<OpRecord[]>
  putOp(op: OpRecord): Promise<void>
  deleteOp(id: string): Promise<void>
  getBlob(id: string): Promise<BlobRecord | null>
  putBlob(rec: BlobRecord): Promise<void>
  deleteBlob(id: string): Promise<void>
  listBlobs(userId: string, campaignId: string): Promise<BlobRecord[]>
  clearAll(): Promise<void>
}

export const auditKey = (userId: string, campaignId: string) => `${userId}|${campaignId}`
export const opKey = (userId: string, campaignId: string, key: string) => `${userId}|${campaignId}|${key}`

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ── In-memory store ───────────────────────────────────────────────────────────────────────────
class MemoryStore implements OfflineStore {
  readonly persistent = false
  private audits = new Map<string, AuditRecord>()
  private ops = new Map<string, OpRecord>()
  private blobs = new Map<string, BlobRecord>()
  async getAudit(u: string, c: string) { return this.audits.get(auditKey(u, c)) ?? null }
  async putAudit(r: AuditRecord) { this.audits.set(r.id, r) }
  async deleteAudit(u: string, c: string) { this.audits.delete(auditKey(u, c)) }
  async listAudits() { return Array.from(this.audits.values()) }
  async listOps(u: string, c?: string) { return Array.from(this.ops.values()).filter(o => o.userId === u && (!c || o.campaignId === c)) }
  async putOp(o: OpRecord) { this.ops.set(o.id, o) }
  async deleteOp(id: string) { this.ops.delete(id) }
  async getBlob(id: string) { return this.blobs.get(id) ?? null }
  async putBlob(r: BlobRecord) { this.blobs.set(r.id, r) }
  async deleteBlob(id: string) { this.blobs.delete(id) }
  async listBlobs(u: string, c: string) { return Array.from(this.blobs.values()).filter(b => b.userId === u && b.campaignId === c) }
  async clearAll() { this.audits.clear(); this.ops.clear(); this.blobs.clear() }
}

// ── IndexedDB store ───────────────────────────────────────────────────────────────────────────
const DB_NAME = 'zahir-guest-offline'
const DB_VERSION = 1

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      if (!db.objectStoreNames.contains('audits')) db.createObjectStore('audits', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('ops')) db.createObjectStore('ops', { keyPath: 'id' }).createIndex('user', 'userId')
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' }).createIndex('user', 'userId')
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

class IdbStore implements OfflineStore {
  readonly persistent = true
  constructor(private db: IDBDatabase) {}
  private store(name: string, mode: IDBTransactionMode = 'readonly') {
    return this.db.transaction(name, mode).objectStore(name)
  }
  async getAudit(u: string, c: string) { return ((await req(this.store('audits').get(auditKey(u, c)))) as AuditRecord | undefined) ?? null }
  async putAudit(r: AuditRecord) { await req(this.store('audits', 'readwrite').put(r)) }
  async deleteAudit(u: string, c: string) { await req(this.store('audits', 'readwrite').delete(auditKey(u, c))) }
  async listAudits() { return (await req(this.store('audits').getAll())) as AuditRecord[] }
  async listOps(u: string, c?: string) {
    const all = (await req(this.store('ops').index('user').getAll(u))) as OpRecord[]
    return c ? all.filter(o => o.campaignId === c) : all
  }
  async putOp(o: OpRecord) { await req(this.store('ops', 'readwrite').put(o)) }
  async deleteOp(id: string) { await req(this.store('ops', 'readwrite').delete(id)) }
  async getBlob(id: string) { return ((await req(this.store('blobs').get(id))) as BlobRecord | undefined) ?? null }
  async putBlob(r: BlobRecord) { await req(this.store('blobs', 'readwrite').put(r)) }
  async deleteBlob(id: string) { await req(this.store('blobs', 'readwrite').delete(id)) }
  async listBlobs(u: string, c: string) {
    const all = (await req(this.store('blobs').index('user').getAll(u))) as BlobRecord[]
    return all.filter(b => b.campaignId === c)
  }
  async clearAll() {
    for (const name of ['audits', 'ops', 'blobs']) await req(this.store(name, 'readwrite').clear())
  }
}

let shared: Promise<OfflineStore> | null = null
const memory = new MemoryStore()

/** The device store (IndexedDB) or, when it cannot be opened, the in-memory one. */
export function deviceStore(): Promise<OfflineStore> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(memory)
  shared ??= openDb().then(db => new IdbStore(db) as OfflineStore).catch(() => memory)
  return shared
}

export function memoryStore(): OfflineStore {
  return memory
}

/** Asks the browser not to evict our data under storage pressure (best effort; Safari may ignore it). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

/** Unsynced changes of this user on this device, any audit (used before logging out). */
export async function pendingCount(userId: string): Promise<number> {
  try {
    const store = await deviceStore()
    return (await store.listOps(userId)).length
  } catch {
    return 0
  }
}

/** Removes every audit, change and photo kept on this device (logout). */
export async function wipeDevice(): Promise<void> {
  try { await (await deviceStore()).clearAll() } catch { /* nothing stored */ }
  await memory.clearAll()
}

export const RETENTION_MS = 14 * 86400_000
export const STALE_MS = 3 * 86400_000

/** Forgets audits not opened for 14 days that have nothing left to send. Unsent work is never dropped. */
export async function purgeOld(store: OfflineStore, now = Date.now()): Promise<void> {
  try {
    for (const a of await store.listAudits()) {
      if (now - a.touchedAt < RETENTION_MS) continue
      const ops = await store.listOps(a.userId, a.campaignId)
      if (!ops.length) await store.deleteAudit(a.userId, a.campaignId)
    }
  } catch { /* best effort */ }
}

/**
 * A store usable immediately: calls wait for the device store to open. `enabled` = the workspace has the offline
 * mode; otherwise changes are only kept in memory while the page is open (previous behaviour).
 */
export function auditStore(enabled: boolean): OfflineStore {
  if (!enabled || typeof indexedDB === 'undefined') return memory
  const ready = deviceStore()
  const call = <K extends keyof OfflineStore>(k: K) =>
    (async (...args: any[]) => ((await ready)[k] as any)(...args)) as OfflineStore[K]
  return {
    persistent: true,
    getAudit: call('getAudit'), putAudit: call('putAudit'), deleteAudit: call('deleteAudit'), listAudits: call('listAudits'),
    listOps: call('listOps'), putOp: call('putOp'), deleteOp: call('deleteOp'),
    getBlob: call('getBlob'), putBlob: call('putBlob'), deleteBlob: call('deleteBlob'), listBlobs: call('listBlobs'),
    clearAll: call('clearAll'),
  }
}
