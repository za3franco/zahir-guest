// Client accounts (a hotel group, a hotel, an institution...) inside a workspace,
// with optional Za3fran-side contract tracking.

export const CLIENT_TYPES = ['group', 'hotel', 'institution', 'other'] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export const CLIENT_TYPE_LABELS: Record<ClientType, { en: string; fr: string }> = {
  group: { en: 'Hotel group', fr: 'Groupe hôtelier' },
  hotel: { en: 'Independent hotel', fr: 'Hôtel indépendant' },
  institution: { en: 'Institution / programme', fr: 'Institution / programme' },
  other: { en: 'Other', fr: 'Autre' },
}

export interface ClientRow {
  id: string
  tenant_id: string
  name: string
  type: ClientType
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contract_ref: string | null
  contract_value_eur: number | null
  contract_start: string | null
  contract_end: string | null
  audits_planned: number | null
  notes: string | null
  is_archived: boolean
  created_at: string
}

const str = (v: unknown, max = 200) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : ''
  return s || null
}
const num = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

/** Validates and normalises a client payload from the form. Returns an error message or the fields. */
export function parseClientBody(body: any): { error: string } | { fields: Record<string, unknown> } {
  const name = str(body?.name, 160)
  if (!name) return { error: 'name' }
  const type = (CLIENT_TYPES as readonly string[]).includes(body?.type) ? body.type : 'group'
  const start = date(body?.contract_start)
  const end = date(body?.contract_end)
  if (start && end && end < start) return { error: 'dates' }
  const planned = num(body?.audits_planned)
  return {
    fields: {
      name,
      type,
      contact_name: str(body?.contact_name),
      contact_email: str(body?.contact_email),
      contact_phone: str(body?.contact_phone, 60),
      contract_ref: str(body?.contract_ref, 120),
      contract_value_eur: num(body?.contract_value_eur),
      contract_start: start,
      contract_end: end,
      audits_planned: planned === null ? null : Math.round(planned),
      notes: str(body?.notes, 4000),
    },
  }
}
