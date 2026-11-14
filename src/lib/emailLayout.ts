// Shared layout and sending for the emails Zahir Guest sends on behalf of a workspace (white label, level 1).
//
// A workspace on a white-label plan (Professional, Enterprise, internal, pilot) gets its own name, logo and main
// colour in these emails, with a discreet "Powered by Zahir Guest" line in the footer. Any other workspace, and any
// failure to read the branding, gives the standard Zahir Guest email.
//
// Level 1 only: the sender address stays our verified domain and the links stay on www.zahirguest.com.
// Emails from Zahir Guest to its own customer (welcome, billing, nurture, suspension, support) do NOT use this file.

import { createClient } from '@supabase/supabase-js'
import { getTenantBranding } from '@/lib/branding'
import { DEFAULT_ACCENT, luminance } from '@/lib/brandColors'
import { SITE_URL } from '@/lib/site'

export type EmailLang = 'en' | 'fr'

/** Escapes text for HTML (also safe inside a double-quoted attribute). Use it on EVERYTHING typed by a person. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Control, invisible-format (zero width, direction overrides), line and paragraph separator characters.
// Built from a string: the tsconfig has no explicit target, so the literal /u flag would not compile.
const HIDDEN_CHARS = new RegExp('[\\p{Cc}\\p{Cf}\\p{Zl}\\p{Zp}]', 'gu')

/**
 * A single line of plain text for a place where line breaks or hidden characters would be dangerous (email subject,
 * display names): control and direction-override characters become spaces, spaces are collapsed, length is bounded.
 * `strict` (sender / recipient names) also removes the characters that delimit an address (< > " @ , ; : \).
 */
export function cleanLine(s: unknown, max = 80, strict = false): string {
  let t = String(s ?? '').replace(HIDDEN_CHARS, ' ')
  if (strict) t = t.replace(/[<>"@,;:\\]/g, '')
  return t.replace(/\s+/g, ' ').trim().slice(0, max)
}

export interface EmailBrand {
  /** Workspace on a white-label plan with at least one custom element (name, logo or colour). */
  custom: boolean
  /** Name written next to the logo; null = no name to show (standard Zahir Guest header). */
  name: string | null
  /** Sender display name and the name used inside sentences ("join {name}"). */
  displayName: string
  /** Absolute https URL of a logo that is safe to load, or null. */
  logoUrl: string | null
  /** Main colour, readable on the dark background. */
  accent: string
  /** Show the "Powered by Zahir Guest" line. */
  poweredBy: boolean
}

export const ZAHIR_BRAND: EmailBrand = {
  custom: false,
  name: null,
  displayName: 'Zahir Guest',
  logoUrl: null,
  accent: DEFAULT_ACCENT,
  poweredBy: false,
}

/**
 * Only our own public logo bucket is accepted: the address is read from the workspace's settings, so it is checked
 * before it goes into an email (https, our Supabase host, tenant-logos bucket, an image extension, no markup).
 */
export function safeLogoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 500) return null
  try {
    const u = new URL(raw)
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!base) return null
    if (u.protocol !== 'https:' || u.host !== new URL(base).host || u.username || u.password || u.port) return null
    if (!/^\/storage\/v1\/object\/public\/tenant-logos\/[A-Za-z0-9._\-/]+\.(png|jpe?g|webp)$/i.test(u.pathname)) return null
    return `${u.origin}${u.pathname}`
  } catch {
    return null
  }
}

/** The look of a workspace's emails. Never throws: on any problem the standard Zahir Guest look is used. */
export async function emailBrandFor(tenantId?: string | null): Promise<EmailBrand> {
  if (!tenantId) return ZAHIR_BRAND
  try {
    const b = await getTenantBranding(tenantId)
    if (!b.whiteLabel) return ZAHIR_BRAND
    const name = b.brandName ? cleanLine(b.brandName, 80) || null : null
    const logoUrl = safeLogoUrl(b.logoUrl)
    const accent = b.accent
    const custom = !!name || !!logoUrl || accent.toUpperCase() !== DEFAULT_ACCENT
    if (!custom) return ZAHIR_BRAND
    const displayName = name ?? 'Zahir Guest'
    const isZahirName = displayName.toLowerCase() === 'zahir guest'
    return { custom, name, displayName, logoUrl, accent, poweredBy: !isZahirName || !!logoUrl }
  } catch {
    return ZAHIR_BRAND
  }
}

/** Text colour for a button of this colour: whichever of navy or white contrasts more. */
export function buttonTextColor(accent: string): string {
  const L = luminance(accent)
  const onNavy = (L + 0.05) / (luminance('#0D1B2A') + 0.05)
  const onWhite = 1.05 / (L + 0.05)
  return onNavy >= onWhite ? '#0D1B2A' : '#FFFFFF'
}

/** "rgba(r,g,b,a)" for a #RRGGBB colour (used for tinted boxes). */
export function accentRgba(accent: string, alpha: number): string {
  const n = parseInt(accent.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

export function h1(text: string): string {
  return `<h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">${text}</h1>`
}

export function p(html: string, opts: { size?: number; mb?: number } = {}): string {
  return `<p style="color:#9B9488;font-size:${opts.size ?? 14}px;line-height:1.7;margin:0 0 ${opts.mb ?? 16}px;">${html}</p>`
}

export function strong(text: string): string {
  return `<strong style="color:#F4F1EC;">${text}</strong>`
}

/** Call-to-action button. `href` is escaped here; `label` must already be safe HTML (translated text). */
export function ctaButton(brand: EmailBrand, href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${brand.accent};border-radius:8px;">
        <a href="${esc(href)}" style="display:inline-block;padding:13px 28px;color:${buttonTextColor(brand.accent)};font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">${label}</a>
      </td>
    </tr>
  </table>`
}

const MARK_SVG = `<svg width="24" height="24" viewBox="0 0 40 40" fill="none">
  <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
  <circle cx="20" cy="20" r="7" stroke="#C8A45A" stroke-width="1" stroke-opacity="0.5" fill="none"/>
  <circle cx="20" cy="20" r="13" stroke="#C8A45A" stroke-width="0.5" stroke-opacity="0.25" fill="none"/>
  <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
</svg>`

function headerHtml(brand: EmailBrand): string {
  // Standard look: the Zahir Guest mark and name
  if (!brand.logoUrl && !brand.name) {
    return `<td style="padding-right:12px;">${MARK_SVG}</td>
      <td><div style="font-size:16px;font-weight:400;color:#F4F1EC;letter-spacing:0.05em;">Zahir Guest</div></td>`
  }
  // White label: the logo (if any) and always the name in text, so that a logo that is dark or blocked by the mail
  // client still leaves the name readable
  const logo = brand.logoUrl
    ? `<td style="padding-right:12px;"><img src="${esc(brand.logoUrl)}" alt="${esc(brand.name ?? '')}" height="36" style="display:block;border:0;outline:none;height:36px;width:auto;max-width:160px;"></td>`
    : ''
  const name = brand.name
    ? `<td><div style="font-size:16px;font-weight:400;color:#F4F1EC;letter-spacing:0.05em;">${esc(brand.name)}</div></td>`
    : ''
  return logo + name
}

function footerHtml(brand: EmailBrand, lang: EmailLang): string {
  if (!brand.poweredBy) {
    return `Zahir Guest — ${lang === 'en' ? 'Mystery Guest Audit Platform' : "Plateforme d'audit mystère"}<br>
      <a href="${esc(SITE_URL)}" style="color:${brand.accent};text-decoration:none;">zahirguest.com</a>`
  }
  const line = lang === 'en' ? 'Powered by' : 'Propulsé par'
  const who = brand.name ? `${esc(brand.name)}<br>` : ''
  return `${who}<span style="font-size:11px;">${line} <a href="${esc(SITE_URL)}" style="color:#9B9488;text-decoration:underline;">Zahir Guest</a></span>`
}

/** The full HTML of an email: header (logo / name), content, footer. `content` must already be safe HTML. */
export function renderEmail(brand: EmailBrand, lang: EmailLang, content: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>@media only screen and (max-width:480px){.zg-pad{padding-left:20px!important;padding-right:20px!important;}.zg-outer{padding:24px 12px!important;}}</style></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" class="zg-outer" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;max-width:600px;width:100%;">
        <tr>
          <td class="zg-pad" style="padding:28px 40px 22px;border-bottom:1px solid #253549;">
            <table cellpadding="0" cellspacing="0"><tr>${headerHtml(brand)}</tr></table>
          </td>
        </tr>
        <tr><td class="zg-pad" style="padding:32px 40px;">${content}</td></tr>
        <tr>
          <td class="zg-pad" style="padding:20px 40px;border-top:1px solid #253549;">
            <p style="margin:0;font-size:11px;color:#9B9488;line-height:1.6;">${footerHtml(brand, lang)}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Reply-to address of a workspace's emails: the person who acted when they are an administrator of the workspace,
 * otherwise the oldest administrator. Only used for white-label emails (the recipients belong to the same workspace).
 */
export async function workspaceReplyTo(
  tenantId: string,
  preferred?: { email?: string | null; role?: string | null; name?: string | null } | null
): Promise<{ email: string; name?: string } | undefined> {
  const ok = (e: unknown): e is string => typeof e === 'string' && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(e)
  if (preferred && preferred.role === 'tenant_admin' && ok(preferred.email)) {
    return { email: preferred.email, name: cleanLine(preferred.name, 80, true) || undefined }
  }
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await supabase
      .from('users')
      .select('email, name')
      .eq('tenant_id', tenantId)
      .eq('role', 'tenant_admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data && ok(data.email)) return { email: data.email, name: cleanLine(data.name, 80, true) || undefined }
  } catch {
    /* no reply-to rather than a failed email */
  }
  return undefined
}

export interface BrandedEmail {
  to: { name: string; email: string }
  subject: string
  html: string
  /** Sender display name (the address always stays our verified one). */
  senderName: string
  replyTo?: { email: string; name?: string }
}

/** Sends one email through Brevo. Never logs the content (it can hold a single-use link). */
export async function sendViaBrevo(mail: BrandedEmail): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY! },
      body: JSON.stringify({
        sender: {
          name: cleanLine(mail.senderName, 80, true) || 'Zahir Guest',
          email: process.env.BREVO_SENDER_EMAIL ?? 'hello@zahirguest.com',
        },
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
        to: [{ name: cleanLine(mail.to.name, 100, true) || mail.to.email, email: mail.to.email }],
        subject: cleanLine(mail.subject, 200) || 'Zahir Guest',
        htmlContent: mail.html,
      }),
    })
    if (!res.ok) console.error('[email] Brevo refused the email:', res.status, (await res.text().catch(() => '')).slice(0, 300))
    return res.ok
  } catch (err) {
    console.error('[email] Brevo network error:', err instanceof Error ? err.message : 'unknown')
    return false
  }
}

/** Sender name of the standard Zahir Guest emails. */
export const zahirSenderName = () => process.env.BREVO_SENDER_NAME ?? 'Zahir Guest'

/** The sender display name for a brand. */
export function senderNameFor(brand: EmailBrand): string {
  return brand.custom ? brand.displayName : zahirSenderName()
}
