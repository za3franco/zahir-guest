'use client'

// Synchronisation engine of one audit on the phone (ZG-6 offline mode).
//
// Every change is applied on screen at once, written to the device store, then sent to the server in the
// background, one batch at a time and in order. A change stays on the phone until the server has answered for
// it. When the phone is offline, sending waits and resumes automatically (network back, app back in front,
// every 30 s). When the same standard was changed more recently elsewhere, the server keeps the most recent
// change and the phone takes it (the auditor is told).

import { MAX_PHOTOS_PER_CAMPAIGN, MAX_PHOTOS_PER_STANDARD } from '@/lib/photos'
import {
  auditKey, newId, opKey,
  type AuditRecord, type LocalResponse, type OfflineStore, type OpRecord, type ResponseValue,
} from './store'

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'auth' | 'closed' | 'forbidden'

export interface ServerResponseRow { standard_id: string; response: ResponseValue; auditor_note?: string | null; note?: string | null; client_updated_at?: string | null; updated_at?: string | null }
export interface ServerRatingRow { section_id: string; rating: number; client_updated_at?: string | null; updated_at?: string | null; created_at?: string | null }

export interface PhotoView {
  id: string
  /** Server photo: /api/photos/<id>; photo still on the phone: a local blob: URL */
  src: string
  /** Taken on the phone, not uploaded yet */
  pending: boolean
  /** Refused by the server (reason shown to the auditor) */
  rejected?: string
}

export interface SyncView {
  responses: Record<string, { response: ResponseValue; note: string }>
  ratings: Record<string, number>
  /** Photos per standard: on the server (minus deletions waiting to be sent) and on the phone */
  photos: Record<string, PhotoView[]>
  /** Why changes were refused (codes from /sync or messages from the photo upload) */
  rejectedReasons: string[]
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
  /** Photos taken on the phone and not uploaded yet: id -> standard and local preview URL */
  private localPhotos = new Map<string, { standardId: string; url: string }>()
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
      for (const b of await this.store.listBlobs(this.userId, this.campaignId)) {
        if (this.ops.get(`p:${b.id}`)?.kind === 'photo_add') {
          this.localPhotos.set(b.id, { standardId: b.standardId, url: URL.createObjectURL(b.blob) })
        } else {
          await this.store.deleteBlob(b.id).catch(() => {}) // uploaded or removed: the copy is no longer needed
        }
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
    this.localPhotos.forEach(p => URL.revokeObjectURL(p.url))
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
    const rejectedReasons: string[] = []
    const deleting = new Set<string>()
    this.ops.forEach(o => {
      if (o.rejected) { rejected++; rejectedReasons.push(o.rejected) } else pending++
      if (o.kind === 'photo_delete' && !o.rejected) deleting.add(o.payload.photo_id)
    })
    const photos: SyncView['photos'] = {}
    const onServer = new Set<string>()
    for (const p of this.photos) {
      onServer.add(p.id)
      if (!p.standard_id || deleting.has(p.id)) continue
      ;(photos[p.standard_id] ??= []).push({ id: p.id, src: `/api/photos/${p.id}`, pending: false })
    }
    this.localPhotos.forEach((lp, id) => {
      if (onServer.has(id)) return
      ;(photos[lp.standardId] ??= []).push({ id, src: lp.url, pending: true, rejected: this.ops.get(`p:${id}`)?.rejected })
    })
    return {
      responses, ratings, photos, rejectedReasons, pending, rejected,
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
      if (op.kind === 'photo_add') this.dropLocalPhoto(op.payload.photo_id)
    }
    this.emit()
  }

  // ── Photos ──────────────────────────────────────────────────────────────────────────────────
  /** Keeps a (compressed) photo on the phone and queues its upload. Returns an error message key when a limit is reached. */
  async addPhoto(standardId: string, blob: Blob): Promise<'limit_standard' | 'limit_total' | null> {
    const view = this.buildView()
    const forStandard = (view.photos[standardId] ?? []).length
    const total = Object.values(view.photos).reduce((n, l) => n + l.length, 0)
    if (forStandard >= MAX_PHOTOS_PER_STANDARD) return 'limit_standard'
    if (total >= MAX_PHOTOS_PER_CAMPAIGN) return 'limit_total'
    const id = newId()
    const ts = Date.now()
    await this.store.putBlob({ id, userId: this.userId, campaignId: this.campaignId, standardId, blob, createdAt: ts })
    this.localPhotos.set(id, { standardId, url: URL.createObjectURL(blob) })
    this.queue({ key: `p:${id}`, kind: 'photo_add', ts, payload: { photo_id: id, standard_id: standardId } })
    this.schedulePush(0)
    return null
  }

  /** Removes a photo: a photo still on the phone is simply dropped; one on the server gets a queued deletion. */
  async removePhoto(photoId: string) {
    const op = this.ops.get(`p:${photoId}`)
    if (op?.kind === 'photo_add') {
      this.ops.delete(op.key)
      await this.store.deleteOp(op.id).catch(() => {})
      this.dropLocalPhoto(photoId)
      this.emit()
      return
    }
    this.queue({ key: `p:${photoId}`, kind: 'photo_delete', ts: Date.now(), payload: { photo_id: photoId } })
    this.schedulePush(0)
  }

  private dropLocalPhoto(id: string) {
    const lp = this.localPhotos.get(id)
    if (lp) URL.revokeObjectURL(lp.url)
    this.localPhotos.delete(id)
    this.store.deleteBlob(id).catch(() => {})
  }

  /** Uploads and deletions of photos, one at a time, oldest first. False when sending must stop for now. */
  private async pushPhotos(): Promise<boolean> {
    const queued = Array.from(this.ops.values())
      .filter(o => !o.rejected && (o.kind === 'photo_add' || o.kind === 'photo_delete'))
      .sort((a, b) => a.ts - b.ts)
    for (const sent of queued) {
      if (this.isBlocked()) return false
      if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.setState('offline'); this.scheduleRetry(); return false }
      const photoId: string = sent.payload.photo_id
      this.setState('syncing')
      let res: Response
      try {
        if (sent.kind === 'photo_add') {
          const rec = await this.store.getBlob(photoId)
          if (!rec) { await this.settle(sent, 'missing'); continue } // the photo file was lost on the phone
          const fd = new FormData()
          fd.set('standard_id', sent.payload.standard_id)
          fd.set('photo_id', photoId)
          fd.set('file', new File([rec.blob], 'photo.jpg', { type: rec.blob.type || 'image/jpeg' }))
          res = await fetch(`/api/audit/${this.campaignId}/photos`, { method: 'POST', body: fd })
        } else {
          res = await fetch(`/api/audit/${this.campaignId}/photos?photo_id=${encodeURIComponent(photoId)}`, { method: 'DELETE' })
        }
      } catch {
        this.setState('offline')
        this.scheduleRetry()
        return false
      }
      // Refused for good (format, size, limit reached from another device): kept and shown with the reason
      if (!res.redirected && (res.status === 400 || res.status === 413)) {
        const data = await res.json().catch(() => ({}))
        await this.settle(sent, typeof data.error === 'string' ? data.error : 'invalid')
        continue
      }
      if (!(await this.handleHttp(res))) return false

      const current = this.ops.get(sent.key)
      const unchanged = current && current.opId === sent.opId
      if (sent.kind === 'photo_add') {
        if (!this.photos.some(p => p.id === photoId)) this.photos = [...this.photos, { id: photoId, standard_id: sent.payload.standard_id }]
        if (unchanged) {
          this.ops.delete(sent.key)
          await this.store.deleteOp(sent.id).catch(() => {})
          this.dropLocalPhoto(photoId)
        } else if (!current) {
          // removed by the auditor while it was uploading: delete it on the server too
          this.queue({ key: `p:${photoId}`, kind: 'photo_delete', ts: Date.now(), payload: { photo_id: photoId } })
          this.dropLocalPhoto(photoId)
        }
      } else if (unchanged) {
        this.photos = this.photos.filter(p => p.id !== photoId)
        this.ops.delete(sent.key)
        await this.store.deleteOp(sent.id).catch(() => {})
      }
      this.failures = 0
      this.lastSyncAt = Date.now()
      this.scheduleSave()
      this.emit()
    }
    return true
  }

  /** Marks a change as refused for good, if it was not edited again meanwhile. */
  private async settle(sent: OpRecord, reason: string) {
    const current = this.ops.get(sent.key)
    if (!current || current.opId !== sent.opId) return
    current.rejected = reason
    await this.store.putOp(current).catch(() => {})
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
    for (const b of await this.store.listBlobs(this.userId, this.campaignId).catch(() => [])) await this.store.deleteBlob(b.id).catch(() => {})
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
        if (!(await this.pushOnce())) return
        if (!(await this.pushPhotos())) return
      } while (this.again || this.sendable().length > 0)
      if (!this.isBlocked()) this.setState('idle')
    } finally {
      this.sending = false
      this.emit()
    }
  }


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

  /** Photos currently on the server (deletions and uploads still waiting are applied on top in the view). */
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
