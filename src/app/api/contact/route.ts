import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { apiError, requestLang, serverError } from '@/lib/apiErrors'
import { ACTIVITY_LABELS, parseContactRequest } from '@/lib/contactRequest'
import { cleanLine, esc, h1, p, renderEmail, sendViaBrevo, strong, ZAHIR_BRAND, zahirSenderName } from '@/lib/emailLayout'
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_PER_IP_PER_HOUR = 5
const MAX_PER_EMAIL_PER_DAY = 3

// Public endpoint behind the "Parlons-en" buttons: records a lead (Enterprise, large operators) and tells us by email.
// The prospect gets a short acknowledgement. No account is created.
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return apiError(requestLang(request), 'invalid_request')
  }
  const lang = requestLang(request, body?.lang)

  // Honeypot: pretend success so bots learn nothing
  if (typeof body?.website === 'string' && body.website.trim() !== '') return NextResponse.json({ ok: true })

  if (body?.consent !== true) return apiError(lang, 'invalid_request', { extra: { field: 'consent' } })
  const parsed = parseContactRequest(body)
  if (!parsed.ok) return apiError(lang, 'invalid_request', { extra: { field: parsed.field } })
  const d = parsed.data

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Limits: per IP (hashed, separate counter from sign-ups) and per email address
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const ipHash = createHash('sha256').update(`contact|${ip}`).digest('hex')
  const { count: ipCount } = await supabase
    .from('signup_attempts').select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash).gte('created_at', new Date(Date.now() - 3600_000).toISOString())
  if ((ipCount ?? 0) >= MAX_PER_IP_PER_HOUR) return apiError(lang, 'too_many_attempts')
  await supabase.from('signup_attempts').insert({ ip_hash: ipHash })

  const { count: emailCount } = await supabase
    .from('contact_requests').select('id', { count: 'exact', head: true })
    .eq('email', d.email).gte('created_at', new Date(Date.now() - 86400_000).toISOString())
  if ((emailCount ?? 0) >= MAX_PER_EMAIL_PER_DAY) return apiError(lang, 'too_many_attempts')

  const { error } = await supabase.from('contact_requests').insert({ ...d, kind: 'enterprise', lang })
  if (error) return serverError(lang, error, 'contact insert')

  // Email to us (French: the team reads it). Reply-to = the prospect. A failure is logged but the request is kept.
  const row = (label: string, value: unknown) =>
    value === null || value === undefined || value === '' ? '' :
    `<tr><td style="padding:4px 12px 4px 0;color:#5E5A52;font-size:13px;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:4px 0;color:#14161B;font-size:14px;">${esc(value).replace(/\n/g, '<br>')}</td></tr>`
  const lead = renderEmail(ZAHIR_BRAND, 'fr',
    h1('Nouvelle demande « Parlons-en »') +
    `<table cellpadding="0" cellspacing="0" style="margin:0 0 8px;">` +
    row('Société', d.company) + row('Contact', d.contact_name) + row('Fonction', d.job_title) +
    row('Email', d.email) + row('Téléphone', d.phone) + row('Pays', d.country) +
    row('Activité', d.activity ? ACTIVITY_LABELS[d.activity].fr : null) +
    row('Établissements voulus', d.properties_wanted) + row('Audits par mois', d.audits_per_month) +
    row('Langue', lang) + row('Origine', d.source) + `</table>` +
    (d.message ? p(strong('Message') + '<br>' + esc(d.message).replace(/\n/g, '<br>')) : ''))
  const sentToUs = await sendViaBrevo({
    to: { name: 'Zahir Guest', email: SUPPORT_EMAIL },
    subject: `[Zahir Guest] Demande Enterprise : ${cleanLine(d.company, 60)} (${d.properties_wanted} établissements)`,
    html: lead,
    senderName: zahirSenderName(),
    replyTo: { email: d.email, name: cleanLine(d.contact_name, 100, true) || undefined },
  })
  if (!sentToUs) console.error('[contact] the team email was not sent; the request is saved in contact_requests')

  // Acknowledgement to the prospect
  const en = lang === 'en'
  const ack = renderEmail(ZAHIR_BRAND, lang,
    h1(en ? 'We received your request' : 'Nous avons bien reçu votre demande') +
    p(en
      ? `Hello ${esc(d.contact_name)}, thank you for your interest in Zahir Guest. We have your request for ${strong(String(d.properties_wanted))} ${d.properties_wanted > 1 ? 'properties' : 'property'} (${esc(d.company)}) and will get back to you within one working day, with a proposal that fits your needs.`
      : `Bonjour ${esc(d.contact_name)}, merci de votre intérêt pour Zahir Guest. Nous avons bien reçu votre demande pour ${strong(String(d.properties_wanted))} ${d.properties_wanted > 1 ? 'établissements' : 'établissement'} (${esc(d.company)}) et reviendrons vers vous sous un jour ouvré, avec une proposition adaptée à votre besoin.`) +
    p(en ? 'In the meantime, you can create a free workspace and try an audit:' : "En attendant, vous pouvez créer un espace gratuit et essayer un audit :") +
    p(`<a href="${esc(SITE_URL)}/signup" style="color:#8A5A18;">${esc(SITE_URL.replace(/^https?:\/\//, ''))}/signup</a>`))
  await sendViaBrevo({
    to: { name: d.contact_name, email: d.email },
    subject: en ? 'Zahir Guest: we received your request' : 'Zahir Guest : nous avons bien reçu votre demande',
    html: ack,
    senderName: zahirSenderName(),
  })

  return NextResponse.json({ ok: true })
}
