/**
 * ZAHIR GUEST — BREVO EMAIL UTILITY
 * All transactional email templates and send function
 */

const BREVO_API = 'https://api.brevo.com/v3/smtp/email'

interface EmailPayload {
  to: { name: string; email: string }[]
  subject: string
  htmlContent: string
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME ?? 'Zahir Guest',
          email: process.env.BREVO_SENDER_EMAIL ?? 'hello@zahirguest.com',
        },
        ...payload,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Brevo send error:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('Brevo network error:', err)
    return false
  }
}

// ── Shared layout wrapper ────────────────────────────────
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;max-width:600px;width:100%;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #253549;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
                    <circle cx="20" cy="20" r="7" stroke="#C8A45A" stroke-width="1" stroke-opacity="0.5" fill="none"/>
                    <circle cx="20" cy="20" r="13" stroke="#C8A45A" stroke-width="0.5" stroke-opacity="0.25" fill="none"/>
                    <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
                    <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
                    <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
                    <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
                  </svg>
                </td>
                <td>
                  <div style="font-size:16px;font-weight:400;color:#F4F1EC;letter-spacing:0.05em;">Zahir Guest</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:32px 40px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #253549;">
            <p style="margin:0;font-size:11px;color:#9B9488;line-height:1.6;">
              Zahir Guest — Mystery Guest Audit Platform<br>
              <a href="https://www.zahirguest.com" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:#C8A45A;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 28px;color:#0D1B2A;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">${label}</a>
      </td>
    </tr>
  </table>`
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
  lang: 'en' | 'fr'
}): Promise<boolean> {
  const { auditorName, auditorEmail, campaignName, propertyName, propertyCity, visitWindowStart, visitWindowEnd, assignedByName, lang } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const windowStr = visitWindowStart && visitWindowEnd
    ? `${formatDate(visitWindowStart)} → ${formatDate(visitWindowEnd)}`
    : visitWindowEnd ? `${lang === 'en' ? 'Before' : 'Avant le'} ${formatDate(visitWindowEnd)}` : null

  const subject = lang === 'en'
    ? `New audit assignment — ${propertyName}`
    : `Nouvelle mission d'audit — ${propertyName}`

  const content = lang === 'en' ? `
    <h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">You have been assigned an audit</h1>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Hello ${auditorName},</p>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#F4F1EC;">${assignedByName}</strong> has assigned you to conduct a mystery guest audit.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #253549;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Property</span><br>
        <span style="font-size:14px;color:#F4F1EC;font-weight:500;">${propertyName}${propertyCity ? ` — ${propertyCity}` : ''}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #253549;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Campaign</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${campaignName}</span>
      </td></tr>
      ${windowStr ? `<tr><td style="padding:8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Visit window</span><br>
        <span style="font-size:14px;color:#C8A45A;font-weight:500;">${windowStr}</span>
      </td></tr>` : ''}
    </table>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 8px;">Log in to access your audit on mobile.</p>
    ${ctaButton(`${appUrl}/dashboard`, 'Go to my dashboard →')}
    <p style="color:#9B9488;font-size:12px;line-height:1.6;margin:0;">Do not conduct the audit before your assigned visit window.</p>
  ` : `
    <h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">Vous avez été assigné à un audit</h1>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Bonjour ${auditorName},</p>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#F4F1EC;">${assignedByName}</strong> vous a assigné une mission d'audit mystère.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #253549;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Établissement</span><br>
        <span style="font-size:14px;color:#F4F1EC;font-weight:500;">${propertyName}${propertyCity ? ` — ${propertyCity}` : ''}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #253549;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Campagne</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${campaignName}</span>
      </td></tr>
      ${windowStr ? `<tr><td style="padding:8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Fenêtre de visite</span><br>
        <span style="font-size:14px;color:#C8A45A;font-weight:500;">${windowStr}</span>
      </td></tr>` : ''}
    </table>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 8px;">Connectez-vous pour accéder à votre audit sur mobile.</p>
    ${ctaButton(`${appUrl}/dashboard`, 'Accéder à mon tableau de bord →')}
    <p style="color:#9B9488;font-size:12px;line-height:1.6;margin:0;">Ne conduisez pas l'audit avant votre fenêtre de visite assignée.</p>
  `

  return sendEmail({
    to: [{ name: auditorName, email: auditorEmail }],
    subject,
    htmlContent: emailWrapper(content),
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
}): Promise<boolean> {
  const { adminName, adminEmail, auditorName, campaignName, propertyName, propertyCity, campaignId, lang } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'

  const subject = lang === 'en'
    ? `Audit submitted for review — ${propertyName}`
    : `Audit soumis pour révision — ${propertyName}`

  const content = lang === 'en' ? `
    <h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">Audit ready for review</h1>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Hello ${adminName},</p>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#F4F1EC;">${auditorName}</strong> has submitted the audit for 
      <strong style="color:#F4F1EC;">${propertyName}${propertyCity ? ` (${propertyCity})` : ''}</strong>. 
      It is ready for your review.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #253549;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Campaign</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${campaignName}</span>
      </td></tr>
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Submitted by</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${auditorName}</span>
      </td></tr>
    </table>
    ${ctaButton(`${appUrl}/dashboard/campaigns/${campaignId}`, 'Review audit →')}
  ` : `
    <h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">Audit prêt pour révision</h1>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Bonjour ${adminName},</p>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#F4F1EC;">${auditorName}</strong> a soumis l'audit pour 
      <strong style="color:#F4F1EC;">${propertyName}${propertyCity ? ` (${propertyCity})` : ''}</strong>. 
      Il est prêt pour votre révision.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #253549;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Campagne</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${campaignName}</span>
      </td></tr>
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Soumis par</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${auditorName}</span>
      </td></tr>
    </table>
    ${ctaButton(`${appUrl}/dashboard/campaigns/${campaignId}`, 'Réviser l\'audit →')}
  `

  return sendEmail({
    to: [{ name: adminName, email: adminEmail }],
    subject,
    htmlContent: emailWrapper(content),
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
}): Promise<boolean> {
  const { pmName, pmEmail, propertyName, propertyCity, campaignName, overallScore, reportId, lang } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'

  const subject = lang === 'en'
    ? `Your audit report is ready — ${propertyName}`
    : `Votre rapport d'audit est disponible — ${propertyName}`

  const scoreDisplay = overallScore !== null
    ? `<div style="font-size:36px;font-weight:700;color:#C8A45A;line-height:1;margin:16px 0 4px;">${overallScore}%</div>
       <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">${lang === 'en' ? 'Overall score' : 'Score global'}</div>`
    : ''

  const content = lang === 'en' ? `
    <h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">Your audit report is ready</h1>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Hello ${pmName},</p>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 24px;">
      The mystery guest audit report for <strong style="color:#F4F1EC;">${propertyName}${propertyCity ? ` — ${propertyCity}` : ''}</strong> 
      has been completed and is now available.
    </p>
    ${scoreDisplay ? `
    <div style="background:rgba(200,164,90,0.08);border:1px solid rgba(200,164,90,0.2);border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
      ${scoreDisplay}
    </div>` : ''}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Campaign</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${campaignName}</span>
      </td></tr>
    </table>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 8px;">View the full report and download the PDF from your portal.</p>
    ${ctaButton(`${appUrl}/dashboard/reports/${reportId}/view`, 'View report →')}
    <p style="color:#9B9488;font-size:12px;line-height:1.6;margin:0;">This report is confidential. Please do not forward this email.</p>
  ` : `
    <h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;line-height:1.3;">Votre rapport d'audit est disponible</h1>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Bonjour ${pmName},</p>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Le rapport d'audit mystère pour <strong style="color:#F4F1EC;">${propertyName}${propertyCity ? ` — ${propertyCity}` : ''}</strong> 
      a été finalisé et est maintenant disponible.
    </p>
    ${scoreDisplay ? `
    <div style="background:rgba(200,164,90,0.08);border:1px solid rgba(200,164,90,0.2);border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
      ${scoreDisplay}
    </div>` : ''}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">Campagne</span><br>
        <span style="font-size:14px;color:#F4F1EC;">${campaignName}</span>
      </td></tr>
    </table>
    <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 8px;">Consultez le rapport complet et téléchargez le PDF depuis votre portail.</p>
    ${ctaButton(`${appUrl}/dashboard/reports/${reportId}/view`, 'Consulter le rapport →')}
    <p style="color:#9B9488;font-size:12px;line-height:1.6;margin:0;">Ce rapport est confidentiel. Merci de ne pas transférer cet email.</p>
  `

  return sendEmail({
    to: [{ name: pmName, email: pmEmail }],
    subject,
    htmlContent: emailWrapper(content),
  })
}
