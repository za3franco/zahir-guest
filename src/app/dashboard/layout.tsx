import { requireUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import ScrollToTop from '@/components/ScrollToTop'
import SessionTimeout from '@/components/SessionTimeout'
import TrialBanner from '@/components/layout/TrialBanner'
import { createClient } from '@supabase/supabase-js'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  // Trial / payment banner for tenant admins of customer workspaces. Never blocks rendering on error.
  let billing: { status: string | null; trialEndsAt: string | null; hasSubscription: boolean } | null = null
  if (user.role === 'tenant_admin') {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: tenant } = await supabase
        .from('tenants')
        .select('subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id')
        .eq('id', user.tenant_id)
        .single()
      if (tenant && tenant.subscription_tier !== 'za3fran_internal') {
        billing = {
          status: tenant.subscription_status,
          trialEndsAt: tenant.trial_ends_at,
          hasSubscription: !!tenant.stripe_subscription_id,
        }
      }
    } catch {
      billing = null
    }
  }

  return (
    <div className={styles.shell}>
      <Sidebar user={user} />
      <main className={styles.main}>
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
