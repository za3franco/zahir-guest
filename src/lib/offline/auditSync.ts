'use client'

// Synchronisation engine of one audit on the phone (ZG-6 offline mode).
//
// Every change is applied on screen at once, written to the device store, then sent to the server in the
// background, one batch at a time and in order. A change stays on the phone until the server has answered for
// it. When the phone is offline, sending waits and resumes automatically (network back, app back in front,
// every 30 s). When the same standard was changed more recently elsewhere, the server keeps the most recent
// change and the phone takes it (the auditor is told).

import {
  auditKey, newId, opKey,
  type AuditRecord, type LocalResponse, type OfflineStore, type OpRecord, type ResponseValue,
} from './store'

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'auth' | 'closed' | 'forbidden'

export interface ServerResponseRow { standard_id: string; response: ResponseValue; auditor_note?: string | null; note?: string | null; client_updated_at?: string | null; updated_at?: string | null }
export interface ServerRatingRow { section_id: string; rating: number; client_updated_at?: string | null; updated_at?: string | null; created_at?: string | null }

export interface SyncView {
  responses: Record<string, { response: ResponseValue; note: string }>
  ratings: Record<string, number>
  /** Changes not yet accepted by the server (rejected ones excluded) */
  pending: number
  /** Changes the server refused for good (kept on the phone, shown to the auditor) */
  rejected: number
  state: SyncState
  /** A batch is being sent right now */
  sending: boolean
  lastSyncAt: number | null
  /** Changes replaced by a more recent one made elsewhere, since the auditor last dismissed the notice */
  conflicts: number
  persistent: boolean
  ready: boolean
}

const BATCH = 100
const RETRY_STEPS = [5_000, 15_000, 30_000]
const TYPING_DELAY = 700

const tsOf = (row: { client_updated_at?: string | null; updated_at?: string | null; created_at?: string | null }) => {
  const t = Date.parse(row.client_updated_at ?? row.updated_at ?? row.created_at ?? '')
  return Number.isNaN(t) ? 0 : t
}

export class AuditSync {
  readonly campaignId: string
  readonly userId: string
  private store: OfflineStore
  private responses: Record<string, LocalResponse> = {}
  private ratings: Record<string, { rating: number; ts: number }> = {}
  private photos: { id: string; standard_id: string | null }[] = []
  private ops = new Map<string, OpRecord>() // by key
  private state: SyncState = 'idle'
  private sending = false
  private again = false
  private lastSyncAt: number | null = null
  private conflicts = 0
  private ready = false
  private failures = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()
  private view: SyncView
  private campaignName?: string
  private disposed = false

  constructor(opts: {
    campaignId: string
    userId: string
    campaignName?: string
    store: OfflineStore
    serverResponses: ServerResponseRow[]
    serverRatings: ServerRatingRow[]
    serverPhotos?: { id: string; standard_id: string | null }[]
  }) {
    this.campaignId = opts.campaignId
    this.userId = opts.userId
    this.campaignName = opts.campaignName
    this.store = opts.store
    for (const r of opts.serverResponses) {
      this.responses[r.standard_id] = { response: r.response ?? null, note: r.auditor_note ?? r.note ?? '', ts: tsOf(r) }
    }
    for (const r of opts.serverRatings) this.ratings[r.section_id] = { rating: r.rating, ts: tsOf(r) }
    this.photos = opts.serverPhotos ?? []
    this.view = this.buildView()
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    try {
      const rec = await this.store.getAudit(this.userId, this.campaignId)
      if (rec) {
        // What the phone knew last time wins where it is more recent than what the page was rendered with
        // (e.g. the page came from the offline cache).
        for (const [id, r] of Object.entries(rec.responses)) {
          if (!this.responses[id] || r.ts > this.responses[id].ts) this.responses[id] = r
        }
        for (const [id, r] of Object.entries(rec.ratings)) {
          if (!this.ratings[id] || r.ts > this.ratings[id].ts) this.ratings[id] = r
        }
        this.lastSyncAt = rec.lastSyncAt
      }
      for (const op of await this.store.listOps(this.userId, this.campaignId)) {
        this.ops.set(op.key, op)
        this.applyOpLocally(op)
      }
    } catch {
      // device storage unreadable: carry on with what the page brought
    }
    this.ready = true
    this.scheduleSave()
    this.emit()
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline)
      window.addEventListener('offline', this.onOffline)
      document.addEventListener('visibilitychange', this.onVisible)
      window.addEventListener('pagehide', this.onPageHide)
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) this.setState('offline')
    void this.push().then(() => this.pull())
  }

  dispose() {
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    if (this.saveTimer) { clearTimeout(this.saveTimer); void this.save() }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline)
      window.removeEventListener('offline', this.onOffline)
      document.removeEventListener('visibilitychange', this.onVisible)
      window.removeEventListener('pagehide', this.onPageHide)
    }
    this.listeners.clear()
  }

  private onOnline = () => { this.failures = 0; if (this.isBlocked()) return; this.setState('idle'); void this.push().then(() => this.pull()) }
  private onOffline = () => { if (!this.isBlocked()) this.setState('offline') }
  private onVisible = () => {
    if (document.visibilityState === 'visible') { if (!this.isBlocked()) void this.push().then(() => this.pull()) }
    else void this.save()
  }
  private onPageHide = () => {
    void this.save()
    // Without device storage, a last attempt so nothing typed is lost when the page closes
    if (!this.store.persistent && this.sendable().length) {
      try {
        fetch(`/api/audit/${this.campaignId}/sync`, {
          method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops: this.sendable().slice(0, BATCH).map(o => this.wire(o)) }),
        }).catch(() => {})
      } catch { /* best effort */ }
    }
  }

  // ── Reading ─────────────────────────────────────────────────────────────────────────────────
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  getView(): SyncView { return this.view }

  get serverPhotos() { return this.photos }

  private buildView(): SyncView {
    const responses: SyncView['responses'] = {}
    for (const [id, r] of Object.entries(this.responses)) responses[id] = { response: r.response, note: r.note }
    const ratings: SyncView['ratings'] = {}
    for (const [id, r] of Object.entries(this.ratings)) ratings[id] = r.rating
    let pending = 0, rejected = 0
    this.ops.forEach(o => { if (o.rejected) rejected++; else pending++ })
    return {
      responses, ratings, pending, rejected,
      state: this.state, sending: this.sending, lastSyncAt: this.lastSyncAt, conflicts: this.conflicts,
      persistent: this.store.persistent, ready: this.ready,
    }
  }

  private emit() {
    if (this.disposed) return
    this.view = this.buildView()
    this.listeners.forEach(fn => fn())
  }

  private setState(s: SyncState) {
    if (this.state === s) return
    this.state = s
    this.emit()
  }

  private isBlocked() { return this.state === 'auth' || this.state === 'closed' || this.state === 'forbidden' }

  // ── Editing ─────────────────────────────────────────────────────────────────────────────────
  setResponse(standardId: string, response: ResponseValue, note: string, opts: { typing?: boolean } = {}) {
    const ts = Date.now()
    this.responses[standardId] = { response, note, ts }
    this.queue({ key: `r:${standardId}`, kind: 'response', ts, payload: { standard_id: standardId, response, note } })
    this.schedulePush(opts.typing ? TYPING_DELAY : 0)
  }

  setRating(sectionId: string, rating: number) {
    const ts = Date.now()
    this.ratings[sectionId] = { rating, ts }
    this.queue({ key: `e:${sectionId}`, kind: 'rating', ts, payload: { section_id: sectionId, rating } })
    this.schedulePush(0)
  }

  /** Records a change (replacing any unsent change of the same standard / section / photo). */
  protected queue(o: Pick<OpRecord, 'key' | 'kind' | 'ts' | 'payload'>) {
    const op: OpRecord = {
      id: opKey(this.userId, this.campaignId, o.key), userId: this.userId, campaignId: this.campaignId,
      key: o.key, kind: o.kind, opId: newId(), ts: o.ts, payload: o.payload, tries: 0,
    }
    this.ops.set(op.key, op)
    this.store.putOp(op).catch(() => {})
    this.scheduleSave()
    this.emit()
  }

  private applyOpLocally(op: OpRecord) {
    if (op.kind === 'response') {
      const cur = this.responses[op.payload.standard_id]
      if (!cur || op.ts >= cur.ts) this.responses[op.payload.standard_id] = { response: op.payload.response ?? null, note: op.payload.note ?? '', ts: op.ts }
    } else if (op.kind === 'rating') {
      const cur = this.ratings[op.payload.section_id]
      if (!cur || op.ts >= cur.ts) this.ratings[op.payload.section_id] = { rating: op.payload.rating, ts: op.ts }
    }
  }

  dismissConflicts() { this.conflicts = 0; this.emit() }

  /** Rejected changes are dropped only when the auditor asks for it. */
  async discardRejected() {
    for (const [key, op] of Array.from(this.ops.entries())) {
      if (!op.rejected) continue
      this.ops.delete(key)
      await this.store.deleteOp(op.id).catch(() => {})
    }
    this.emit()
  }

  // ── Persistence ─────────────────────────────────────────────────────────────────────────────
  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.save() }, 250)
  }

  private async save() {
    const rec: AuditRecord = {
      id: auditKey(this.userId, this.campaignId), userId: this.userId, campaignId: this.campaignId, campaignName: this.campaignName,
      responses: this.responses, ratings: this.ratings, photos: this.photos, touchedAt: Date.now(), lastSyncAt: this.lastSyncAt,
    }
    await this.store.putAudit(rec).catch(() => {})
  }

  /** After a successful submission: nothing of this audit needs to stay on the phone. */
  async forget() {
    for (const op of Array.from(this.ops.values())) await this.store.deleteOp(op.id).catch(() => {})
    this.ops.clear()
    await this.store.deleteAudit(this.userId, this.campaignId).catch(() => {})
    this.emit()
  }

  // ── Sending ─────────────────────────────────────────────────────────────────────────────────
  private schedulePush(delay: number) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.timer = null; void this.push() }, delay)
  }

  private scheduleRetry() {
    const delay = RETRY_STEPS[Math.min(this.failures, RETRY_STEPS.length - 1)]
    this.failures++
    this.schedulePush(delay)
  }

  /** Changes of the kinds this engine sends through /sync, oldest first. */
  protected sendable(): OpRecord[] {
    return Array.from(this.ops.values()).filter(o => !o.rejected && (o.kind === 'response' || o.kind === 'rating')).sort((a, b) => a.ts - b.ts)
  }

  private wire(o: OpRecord) {
    return { op_id: o.opId, kind: o.kind, ...o.payload, client_updated_at: new Date(o.ts).toISOString() }
  }

  /** Sends everything waiting. Resolves when the queue is empty or sending had to stop. */
  async push(): Promise<void> {
    if (this.disposed) return
    if (this.sending) { this.again = true; return }
    if (this.isBlocked()) return
    this.sending = true
    this.emit()
    try {
      do {
        this.again = false
        const ok = await this.pushOnce()
        if (!ok) return
        await this.pushExtra()
      } while (this.again || this.sendable().length > 0)
      if (!this.isBlocked()) this.setState('idle')
    } finally {
      this.sending = false
      this.emit()
    }
  }

  /** Hook for kinds that are not sent through /sync (photos, PR 2). */
  protected async pushExtra(): Promise<void> {}

  /** One batch. Returns false when sending must stop for now (offline, error, blocked). */
  private async pushOnce(): Promise<boolean> {
    const batch = this.sendable().slice(0, BATCH)
    if (!batch.length) return true
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.setState('offline'); this.scheduleRetry(); return false }
    this.setState('syncing')
    let res: Response
    try {
      res = await fetch(`/api/audit/${this.campaignId}/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ops: batch.map(o => this.wire(o)) }),
      })
    } catch {
      this.setState('offline')
      this.scheduleRetry()
      return false
    }
    if (!(await this.handleHttp(res))) return false

    const data = await res.json().catch(() => null)
    const results: any[] = Array.isArray(data?.results) ? data.results : []
    if (!results.length) { this.setState('error'); this.scheduleRetry(); return false }
    const byOpId = new Map(batch.map(o => [o.opId, o]))
    for (const r of results) {
      const sent = byOpId.get(r.op_id)
      if (!sent) continue
      const current = this.ops.get(sent.key)
      const unchanged = current && current.opId === sent.opId // not edited again while the request was in flight
      if (r.result === 'applied' || r.result === 'superseded') {
        if (unchanged) {
          this.ops.delete(sent.key)
          await this.store.deleteOp(sent.id).catch(() => {})
          if (r.result === 'superseded') this.takeServerValue(sent, r.value)
        }
      } else if (r.result === 'rejected' && unchanged) {
        if (r.code === 'error' && sent.tries < 5) {
          current!.tries++
        } else {
          current!.rejected = String(r.code ?? 'error')
        }
        await this.store.putOp(current!).catch(() => {})
      }
    }
    this.failures = 0
    this.lastSyncAt = Date.now()
    this.scheduleSave()
    this.emit()
    // A batch where nothing could be settled (server errors only): wait before trying again
    if (results.length && results.every(r => r.result === 'rejected' && r.code === 'error')) { this.setState('error'); this.scheduleRetry(); return false }
    return true
  }

  /** Common handling of a /sync answer; false when sending must stop. */
  protected async handleHttp(res: Response): Promise<boolean> {
    // A redirect to /login or a 401: the session has expired. Changes stay on the phone.
    if (res.redirected || res.status === 401) { this.setState('auth'); return false }
    if (res.status === 403 || res.status === 404) { this.setState('forbidden'); return false }
    if (res.status === 409) { this.setState('closed'); return false }
    if (!res.ok) { this.setState('error'); this.scheduleRetry(); return false }
    return true
  }

  private takeServerValue(op: OpRecord, value: any) {
    if (!value) return
    const ts = Date.parse(value.client_updated_at ?? '') || Date.now()
    if (op.kind === 'response') this.responses[op.payload.standard_id] = { response: value.response ?? null, note: value.note ?? '', ts }
    if (op.kind === 'rating') this.ratings[op.payload.section_id] = { rating: value.rating, ts }
    this.conflicts++
  }

  /** Brings in changes made on other devices (only where the phone has nothing waiting to be sent). */
  async pull(): Promise<void> {
    if (this.disposed || this.isBlocked()) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    let res: Response
    try {
      res = await fetch(`/api/audit/${this.campaignId}/sync`, { cache: 'no-store' })
    } catch {
      return
    }
    if (res.redirected || res.status === 401) { this.setState('auth'); return }
    if (res.status === 403 || res.status === 404) { this.setState('forbidden'); return }
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    if (!data) return
    for (const r of data.responses ?? []) {
      if (this.ops.has(`r:${r.standard_id}`)) continue
      const ts = tsOf(r)
      const cur = this.responses[r.standard_id]
      if (!cur || ts >= cur.ts) this.responses[r.standard_id] = { response: r.response ?? null, note: r.note ?? '', ts }
    }
    for (const r of data.ratings ?? []) {
      if (this.ops.has(`e:${r.section_id}`)) continue
      const ts = tsOf(r)
      const cur = this.ratings[r.section_id]
      if (!cur || ts >= cur.ts) this.ratings[r.section_id] = { rating: r.rating, ts }
    }
    this.onServerPhotos(data.photos ?? [])
    this.lastSyncAt = Date.now()
    if (data.open === false) this.setState('closed')
    this.scheduleSave()
    this.emit()
  }

  /** Hook: photos currently on the server (PR 2). */
  protected onServerPhotos(photos: { id: string; standard_id: string | null }[]) { this.photos = photos }

  /** Sends now and waits (before submitting). */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    if (this.isBlocked()) return
    if (this.state === 'offline' || this.state === 'error') this.setState('idle')
    this.failures = 0
    await this.push()
  }

  /** "Retry" button: also leaves the "reconnect" state, after the auditor has signed in again. */
  async retry(): Promise<void> {
    if (this.state === 'auth' || this.state === 'error' || this.state === 'offline') this.state = 'idle'
    // rejected changes for a transient reason get another chance
    this.ops.forEach(o => { if (o.rejected === 'error') { o.rejected = undefined; o.tries = 0 } })
    this.emit()
    await this.flush()
    await this.pull()
  }
}
