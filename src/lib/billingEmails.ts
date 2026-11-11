// Welcome email sent when a new tenant is created from a completed Stripe checkout.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function sendWelcomeEmail(opts: {
  name: string
  email: string
  companyName: string
  planName: string
  setPasswordLink: string
  lang: 'en' | 'fr'
  /** When set, the workspace is a free trial of this many days (no plan sentence, trial wording). */
  trialDays?: number
}): Promise<boolean> {
  const { name, email, companyName, planName, setPasswordLink, lang, trialDays } = opts
  const en = lang === 'en'

  const subject = en ? 'Welcome to Zahir Guest' : 'Bienvenue sur Zahir Guest'
  const title = en ? 'Welcome aboard' : 'Bienvenue à bord'
  const intro = trialDays
    ? en
      ? `Your <strong style="color:#F4F1EC;">${esc(companyName)}</strong> workspace is ready. You have <strong style="color:#C8A45A;">${trialDays} days</strong> to try Zahir Guest for free, with no card required.`
      : `Votre espace <strong style="color:#F4F1EC;">${esc(companyName)}</strong> est prêt. Vous disposez de <strong style="color:#C8A45A;">${trialDays} jours</strong> pour essayer Zahir Guest gratuitement, sans carte bancaire.`
    : en
      ? `Your <strong style="color:#F4F1EC;">${esc(companyName)}</strong> workspace is ready on the <strong style="color:#C8A45A;">${esc(planName)}</strong> plan.`
      : `Votre espace <strong style="color:#F4F1EC;">${esc(companyName)}</strong> est prêt avec le forfait <strong style="color:#C8A45A;">${esc(planName)}</strong>.`
  const next = en
    ? 'Set your password to sign in, then add your first property, invite an auditor and create your first campaign.'
    : 'Définissez votre mot de passe pour vous connecter, puis ajoutez votre premier établissement, invitez un auditeur et créez votre première campagne.'
  const cta = en ? 'Set my password →' : 'Définir mon mot de passe →'
  const expiry = en ? 'This link expires in 24 hours.' : 'Ce lien expire dans 24 heures.'
  const hello = en ? `Hello ${esc(name)},` : `Bonjour ${esc(name)},`

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;">
        <tr>
          <td style="padding:40px 48px 32px;border-bottom:1px solid #253549;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9B9488;">ZAHIR GUEST</p>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:300;color:#F4F1EC;line-height:1.3;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 48px;">
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">${hello}</p>
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">${intro}</p>
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 32px;">${next}</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#C8A45A;border-radius:8px;">
                  <a href="${setPasswordLink}" style="display:inline-block;padding:14px 32px;color:#0D1B2A;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">${cta}</a>
                </td>
              </tr>
            </table>
            <p style="color:#9B9488;font-size:13px;line-height:1.6;margin:0;">${expiry}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #253549;">
            <p style="margin:0;font-size:12px;color:#9B9488;line-height:1.6;">
              Zahir Guest — ${en ? 'Mystery Guest Audit Platform' : "Plateforme d'audit mystère"}<br>
              <a href="https://www.zahirguest.com" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY! },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME ?? 'Zahir Guest',
          email: process.env.BREVO_SENDER_EMAIL ?? 'hello@zahirguest.com',
        },
        to: [{ name, email }],
        subject,
        htmlContent,
      }),
    })
    if (!res.ok) {
      console.error('Welcome email failed:', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error('Welcome email network error:', err)
    return false
  }
}
