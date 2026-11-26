/**
 * ZAHIR GUEST — emails sent to the teams of a workspace (assignment, audit submitted, report published).
 * Layout, escaping and sending are shared with the other workspace emails in `emailLayout.ts`: a white-label workspace
 * gets its own name, logo and main colour here, with a "Powered by Zahir Guest" line in the footer.
 * Every value typed by a person (names, property, campaign) is escaped before it goes into the HTML.
 */

import {
  type EmailLang,
  accentRgba,
  ctaButton,
  emailBrandFor,
  esc,
  h1,
  p,
  renderEmail,
  senderNameFor,
  sendViaBrevo,
  strong,
  workspaceReplyTo,
} from '@/lib/emailLayout'

const appBase = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com').replace(/\/$/, '')

const LABEL = 'font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#5E5A52;'

interface Actor { email?: string | null; role?: string | null; name?: string | null }

async function sendWorkspaceEmail(args: {
  tenantId?: string
  lang: EmailLang
  to: { name: string; email: string }
  subject: (displayName: string) => string
  content: (ctx: { accent: string; brand: Awaited<ReturnType<typeof emailBrandFor>> }) => string
  actor?: Actor | null
}): Promise<boolean> {
  const brand = await emailBrandFor(args.tenantId)
  // Reply-to only for white-label emails: the recipients belong to the same workspace as the administrator
  const replyTo = brand.custom && args.tenantId ? await workspaceReplyTo(args.tenantId, args.actor) : undefined
  return sendViaBrevo({
    to: args.to,
    subject: args.subject(brand.displayName),
    html: renderEmail(brand, args.lang, args.content({ accent: brand.accent, brand })),
    senderName: senderNameFor(brand),
    replyTo,
  })
}

// ── 1. Auditor assigned to campaign ─────────────────────
export async function sendAuditorAssignedEmail(params: {
  auditorName: string
  auditorEmail: string
  campaignName: string
  propertyName: string
  propertyCity: string | null
  visitWindowStart: string | null
  visitWindowEnd: string | null
  assignedByName: string
  /** The person who assigned the mission (used as reply-to when they are an administrator of the workspace). */
  assignedBy?: Actor | null
  lang: 'en' | 'fr'
  tenantId?: string
}): Promise<boolean> {
  const { auditorName, auditorEmail, campaignName, propertyName, propertyCity, visitWindowStart, visitWindowEnd, assignedByName, lang, tenantId } = params

  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const windowStr = visitWindowStart && visitWindowEnd
    ? `${formatDate(visitWindowStart)} → ${formatDate(visitWindowEnd)}`
    : visitWindowEnd ? `${lang === 'en' ? 'Before' : 'Avant le'} ${formatDate(visitWindowEnd)}` : null

  return sendWorkspaceEmail({
    tenantId,
    lang,
    to: { name: auditorName, email: auditorEmail },
    actor: params.assignedBy,
    subject: () => lang === 'en' ? `New audit assignment — ${propertyName}` : `Nouvelle mission d'audit — ${propertyName}`,
    content: ({ accent, brand }) => {
      const where = `${esc(propertyName)}${propertyCity ? ` — ${esc(propertyCity)}` : ''}`
      const row = (label: string, value: string, last = false, color = '#14161B', weight = 400) =>
        `<tr><td style="padding:8px 0;${last ? '' : 'border-bottom:1px solid #D8D2C6;'}">
          <span style="${LABEL}">${label}</span><br>
          <span style="font-size:14px;color:${color};font-weight:${weight};">${value}</span>
        </td></tr>`
      const table = (rows: string) => `<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">${rows}</table>`
      return lang === 'en'
        ? `${h1('You have been assigned an audit')}
           ${p(`Hello ${esc(auditorName)},`)}
           ${p(`${strong(esc(assignedByName))} has assigned you to conduct a mystery guest audit.`, { mb: 24 })}
           ${table(
             row('Property', where, false, '#14161B', 500) +
             row('Campaign', esc(campaignName), !windowStr) +
             (windowStr ? row('Visit window', esc(windowStr), true, accent, 500) : '')
           )}
           ${p('Log in to access your audit on mobile.', { mb: 8 })}
           ${ctaButton(brand, `${appBase()}/dashboard`, 'Go to my dashboard →')}
           ${p('Do not conduct the audit before your assigned visit window.', { size: 12, mb: 0 })}`
        : `${h1('Vous avez été assigné à un audit')}
           ${p(`Bonjour ${esc(auditorName)},`)}
           ${p(`${strong(esc(assignedByName))} vous a assigné une mission d'audit mystère.`, { mb: 24 })}
           ${table(
             row('Établissement', where, false, '#14161B', 500) +
             row('Campagne', esc(campaignName), !windowStr) +
             (windowStr ? row('Fenêtre de visite', esc(windowStr), true, accent, 500) : '')
           )}
           ${p('Connectez-vous pour accéder à votre audit sur mobile.', { mb: 8 })}
           ${ctaButton(brand, `${appBase()}/dashboard`, 'Accéder à mon tableau de bord →')}
           ${p("Ne conduisez pas l'audit avant votre fenêtre de visite assignée.", { size: 12, mb: 0 })}`
    },
  })
}

// ── 2. Admin notified when audit submitted ───────────────
export async function sendAuditSubmittedEmail(params: {
  adminName: string
  adminEmail: string
  auditorName: string
  campaignName: string
  propertyName: string
  propertyCity: string | null
  campaignId: string
  lang: 'en' | 'fr'
  tenantId?: string
}): Promise<boolean> {
  const { adminName, adminEmail, auditorName, campaignName, propertyName, propertyCity, campaignId, lang, tenantId } = params

  return sendWorkspaceEmail({
    tenantId,
    lang,
    to: { name: adminName, email: adminEmail },
    subject: () => lang === 'en' ? `Audit submitted for review — ${propertyName}` : `Audit soumis pour révision — ${propertyName}`,
    content: ({ brand }) => {
      const where = `${esc(propertyName)}${propertyCity ? ` (${esc(propertyCity)})` : ''}`
      const row = (label: string, value: string, last = false) =>
        `<tr><td style="padding:8px 0;${last ? '' : 'border-bottom:1px solid #D8D2C6;'}">
          <span style="${LABEL}">${label}</span><br>
          <span style="font-size:14px;color:#14161B;">${value}</span>
        </td></tr>`
      const table = (rows: string) => `<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">${rows}</table>`
      const url = `${appBase()}/dashboard/campaigns/${encodeURIComponent(campaignId)}`
      return lang === 'en'
        ? `${h1('Audit ready for review')}
           ${p(`Hello ${esc(adminName)},`)}
           ${p(`${strong(esc(auditorName))} has submitted the audit for ${strong(where)}. It is ready for your review.`, { mb: 24 })}
           ${table(row('Campaign', esc(campaignName)) + row('Submitted by', esc(auditorName), true))}
           ${ctaButton(brand, url, 'Review audit →')}`
        : `${h1('Audit prêt pour révision')}
           ${p(`Bonjour ${esc(adminName)},`)}
           ${p(`${strong(esc(auditorName))} a soumis l'audit pour ${strong(where)}. Il est prêt pour votre révision.`, { mb: 24 })}
           ${table(row('Campagne', esc(campaignName)) + row('Soumis par', esc(auditorName), true))}
           ${ctaButton(brand, url, "Réviser l'audit →")}`
    },
  })
}

// ── 3. Property manager notified when report published ───
export async function sendReportPublishedEmail(params: {
  pmName: string
  pmEmail: string
  propertyName: string
  propertyCity: string | null
  campaignName: string
  overallScore: number | null
  reportId: string
  lang: 'en' | 'fr'
  tenantId?: string
}): Promise<boolean> {
  const { pmName, pmEmail, propertyName, propertyCity, campaignName, overallScore, reportId, lang, tenantId } = params

  return sendWorkspaceEmail({
    tenantId,
    lang,
    to: { name: pmName, email: pmEmail },
    subject: () => lang === 'en' ? `Your audit report is ready — ${propertyName}` : `Votre rapport d'audit est disponible — ${propertyName}`,
    content: ({ accent, brand }) => {
      const where = `${esc(propertyName)}${propertyCity ? ` — ${esc(propertyCity)}` : ''}`
      const score = typeof overallScore === 'number' && Number.isFinite(overallScore)
        ? `<div style="background:${accentRgba(accent, 0.08)};border:1px solid ${accentRgba(accent, 0.2)};border-radius:2px;padding:20px 24px;text-align:center;margin-bottom:24px;">
             <div style="font-size:36px;font-weight:700;color:${accent};line-height:1;margin:16px 0 4px;">${esc(overallScore)}%</div>
             <div style="${LABEL}">${lang === 'en' ? 'Overall score' : 'Score global'}</div>
           </div>`
        : ''
      const campaign = (label: string) => `<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
        <tr><td style="padding:8px 0;">
          <span style="${LABEL}">${label}</span><br>
          <span style="font-size:14px;color:#14161B;">${esc(campaignName)}</span>
        </td></tr>
      </table>`
      const url = `${appBase()}/dashboard/reports/${encodeURIComponent(reportId)}/view`
      return lang === 'en'
        ? `${h1('Your audit report is ready')}
           ${p(`Hello ${esc(pmName)},`)}
           ${p(`The mystery guest audit report for ${strong(where)} has been completed and is now available.`, { mb: 24 })}
           ${score}
           ${campaign('Campaign')}
           ${p('View the full report and download the PDF from your portal.', { mb: 8 })}
           ${ctaButton(brand, url, 'View report →')}
           ${p('This report is confidential. Please do not forward this email.', { size: 12, mb: 0 })}`
        : `${h1("Votre rapport d'audit est disponible")}
           ${p(`Bonjour ${esc(pmName)},`)}
           ${p(`Le rapport d'audit mystère pour ${strong(where)} a été finalisé et est maintenant disponible.`, { mb: 24 })}
           ${score}
           ${campaign('Campagne')}
           ${p('Consultez le rapport complet et téléchargez le PDF depuis votre portail.', { mb: 8 })}
           ${ctaButton(brand, url, 'Consulter le rapport →')}
           ${p('Ce rapport est confidentiel. Merci de ne pas transférer cet email.', { size: 12, mb: 0 })}`
    },
  })
}
