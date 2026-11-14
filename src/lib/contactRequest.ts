// "Parlons-en" form (Enterprise and large operators): validation shared by the API route.
// Everything typed by a person is bounded here; it is escaped again where it is put in an email.

export const ACTIVITIES = ['hotel_group', 'audit_firm', 'chain', 'programme', 'other'] as const
export type Activity = (typeof ACTIVITIES)[number]

export const ACTIVITY_LABELS: Record<Activity, { en: string; fr: string }> = {
  hotel_group: { en: 'Hotel group', fr: 'Groupe hôtelier' },
  audit_firm: { en: 'Mystery audit firm', fr: "Cabinet d'audit" },
  chain: { en: 'Hotel chain', fr: 'Chaîne hôtelière' },
  programme: { en: 'National or regional programme', fr: 'Programme national ou régional' },
  other: { en: 'Other', fr: 'Autre' },
}

export interface ContactRequestInput {
  contact_name: string
  company: string
  job_title: string | null
  email: string
  phone: string | null
  country: string | null
  activity: Activity | null
  properties_wanted: number
  audits_per_month: number | null
  message: string | null
  source: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const HIDDEN = new RegExp('[\\p{Cc}\\p{Cf}\\p{Zl}\\p{Zp}]', 'gu')

const line = (v: unknown, max: number) => String(v ?? '').replace(HIDDEN, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
// Free text keeps its line breaks (but no hidden or control characters)
const text = (v: unknown, max: number) =>
  String(v ?? '').replace(/\r\n?/g, '\n').replace(new RegExp('[\\p{Cc}\\p{Cf}\\p{Zl}\\p{Zp}]', 'gu'), c => (c === '\n' ? '\n' : ' ')).trim().slice(0, max)

function count(v: unknown, min: number, max: number): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN
}

/** Returns the cleaned request, or the name of the first field that is missing or wrong. */
export function parseContactRequest(body: any): { ok: true; data: ContactRequestInput } | { ok: false; field: string } {
  const contact_name = line(body?.name, 120)
  const company = line(body?.company, 150)
  const email = line(body?.email, 200).toLowerCase()
  if (!contact_name) return { ok: false, field: 'name' }
  if (!company) return { ok: false, field: 'company' }
  if (!EMAIL_RE.test(email)) return { ok: false, field: 'email' }

  const phone = line(body?.phone, 40)
  if (phone && !/^[0-9+()\-. ]{6,40}$/.test(phone)) return { ok: false, field: 'phone' }

  const properties_wanted = count(body?.properties, 1, 5000)
  if (properties_wanted === null || Number.isNaN(properties_wanted)) return { ok: false, field: 'properties' }
  const audits = count(body?.audits, 0, 100000)
  if (audits !== null && Number.isNaN(audits)) return { ok: false, field: 'audits' }

  const activity = ACTIVITIES.includes(body?.activity) ? (body.activity as Activity) : null
  const source = line(body?.source, 30).replace(/[^a-z0-9_-]/gi, '') || null

  return {
    ok: true,
    data: {
      contact_name, company, email,
      job_title: line(body?.jobTitle, 120) || null,
      phone: phone || null,
      country: line(body?.country, 80) || null,
      activity,
      properties_wanted,
      audits_per_month: audits,
      message: text(body?.message, 2000) || null,
      source,
    },
  }
}
