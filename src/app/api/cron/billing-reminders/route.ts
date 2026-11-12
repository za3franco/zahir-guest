import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { appUrl } from '@/lib/billing'
import { escHtml, sendBillingNotice } from '@/lib/billingEmails'
import { planName } from '@/lib/plans'
import { GRACE_DAYS } from '@/lib/youcanBilling'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY = 86400_000
const REMINDERS = [15, 7, 1] // days before the end of a prepaid (YouCan Pay) period

// Daily (vercel.json → crons). Prepaid MAD workspaces: renewal reminders at D-15 / D-7 / D-1 to the
// workspace admins, then the workspace ends GRACE_DAYS after the period end.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, subscription_tier, subscription_status, current_period_end, renewal_reminders_sent')
    .eq('billing_mode', 'youcan')
    .not('current_period_end', 'is', null)

  const now = Date.now()
  let reminded = 0
  let ended = 0

  for (const t of tenants ?? []) {
    const end = new Date(t.current_period_end).getTime()
    const daysLeft = Math.ceil((end - now) / DAY)

    // End of grace period → the workspace stops (same effect as an ended Stripe subscription).
    if (now > end + GRACE_DAYS * DAY && t.subscription_status === 'active') {
      await supabase.from('tenants').update({ subscription_status: 'canceled' }).eq('id', t.id)
      ended++
      continue
    }
    if (t.subscription_status !== 'active') continue

    const sent: number[] = Array.isArray(t.renewal_reminders_sent) ? t.renewal_reminders_sent : []
    const due = REMINDERS.find(d => daysLeft <= d && daysLeft > 0 && !sent.includes(d))
    const afterEnd = daysLeft <= 0 && !sent.includes(0)
    if (!due && !afterEnd) continue

    const { data: admins } = await supabase.from('users').select('name, email, default_language').eq('tenant_id', t.id).eq('role', 'tenant_admin')
    for (const a of admins ?? []) {
      if (!a.email) continue
      const lang: 'en' | 'fr' = a.default_language === 'en' ? 'en' : 'fr'
      const date = new Date(end).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const plan = escHtml(planName(t.subscription_tier, lang) ?? 'Zahir Guest')
      const graceEnd = new Date(end + GRACE_DAYS * DAY).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' })
      await sendBillingNotice({
        to: { name: a.name ?? a.email, email: a.email },
        lang,
        subject: afterEnd
          ? (lang === 'en' ? 'Your Zahir Guest period has ended' : 'Votre période Zahir Guest est terminée')
          : (lang === 'en' ? `Your Zahir Guest plan ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}` : `Votre forfait Zahir Guest se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`),
        title: afterEnd ? (lang === 'en' ? 'Time to renew' : 'Il est temps de renouveler') : (lang === 'en' ? 'Renewal reminder' : 'Rappel de renouvellement'),
        paragraphs: afterEnd
          ? [lang === 'en'
              ? `Your prepaid <strong style="color:#F4F1EC;">${plan}</strong> period ended on ${date}. Your workspace stays open until ${graceEnd}; after that, creating properties, users and campaigns will be paused (your data is kept).`
              : `Votre période prépayée <strong style="color:#F4F1EC;">${plan}</strong> s'est terminée le ${date}. Votre espace reste ouvert jusqu'au ${graceEnd} ; ensuite, la création d'établissements, d'utilisateurs et de campagnes sera suspendue (vos données sont conservées).`]
          : [lang === 'en'
              ? `Your prepaid <strong style="color:#F4F1EC;">${plan}</strong> period ends on <strong style="color:#F4F1EC;">${date}</strong>. Renew in a few clicks from Billing (card payment in dirhams via YouCan Pay).`
              : `Votre période prépayée <strong style="color:#F4F1EC;">${plan}</strong> se termine le <strong style="color:#F4F1EC;">${date}</strong>. Renouvelez en quelques clics depuis la page Facturation (paiement par carte en dirhams via YouCan Pay).`],
        cta: { href: `${appUrl()}/dashboard/billing`, label: lang === 'en' ? 'Renew →' : 'Renouveler →' },
      })
    }
    await supabase.from('tenants').update({ renewal_reminders_sent: [...sent, afterEnd ? 0 : due!] }).eq('id', t.id)
    reminded++
  }

  return NextResponse.json({ ok: true, reminded, ended })
}
