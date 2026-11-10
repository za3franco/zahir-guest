import { requireUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import ScrollToTop from '@/components/ScrollToTop'
import SessionTimeout from '@/components/SessionTimeout'
import TrialBanner from '@/components/layout/TrialBanner'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import { createClient } from '@supabase/supabase-js'
import { brandingFromTenant, DEFAULT_ACCENT } from '@/lib/branding'
import { SUPPORT_EMAIL } from '@/lib/site'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  // Tenant billing + branding. Never blocks rendering on error.
  let billing: { status: string | null; trialEndsAt: string | null; hasSubscription: boolean } | null = null
  let branding = brandingFromTenant(null)
  let tenantName = ''
  let suspended = false
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id, branding_config')
      .eq('id', user.tenant_id)
      .single()
    if (tenant) {
      branding = brandingFromTenant(tenant)
      tenantName = tenant.name
      suspended = tenant.subscription_status === 'suspended'
      if (user.role === 'tenant_admin' && tenant.subscription_tier !== 'za3fran_internal') {
        billing = {
          status: tenant.subscription_status,
          trialEndsAt: tenant.trial_ends_at,
          hasSubscription: !!tenant.stripe_subscription_id,
        }
      }
    }
  } catch {
    billing = null
  }

  // Suspended by a super admin: the whole app is locked (a super admin viewing as the tenant still gets in)
  if (suspended && !user.impersonating_tenant_id) {
    const en = user.default_language === 'en'
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 440 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, color: 'var(--color-ivory)' }}>
            {en ? 'Account suspended' : 'Compte suspendu'}
          </h1>
          <p style={{ color: 'var(--color-sand)', lineHeight: 1.6 }}>
            {en
              ? 'Access to this workspace has been suspended. Please contact us to restore it.'
              : "L'accès à cet espace a été suspendu. Contactez-nous pour le rétablir."}
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--color-gold)' }}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    )
  }

  // White-label accent: override the gold token for the whole app shell
  const shellStyle = branding.whiteLabel && branding.accent !== DEFAULT_ACCENT
    ? ({ '--color-gold': branding.accent } as React.CSSProperties)
    : undefined

  return (
    <div className={styles.shell} style={shellStyle}>
      <Sidebar user={user} brand={{ brandName: branding.brandName, logoUrl: branding.logoUrl }} />
      <main className={styles.main}>
        {user.impersonating_tenant_id && <ImpersonationBanner tenantName={tenantName || user.impersonating_tenant_id} />}
        {billing && (
          <TrialBanner
            lang={user.default_language === 'en' ? 'en' : 'fr'}
            status={billing.status}
            trialEndsAt={billing.trialEndsAt}
            hasSubscription={billing.hasSubscription}
          />
        )}
        <ScrollToTop />
        <SessionTimeout role={user.role} />
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
