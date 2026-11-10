export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { brandingFromTenant } from '@/lib/branding'
import BrandingForm from './BrandingForm'
import styles from './branding.module.css'

export default async function BrandingPage() {
  const user = await requireUser()
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') redirect('/dashboard')
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, subscription_tier, subscription_status, branding_config')
    .eq('id', user.tenant_id)
    .single()

  const b = brandingFromTenant(tenant)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{lang === 'en' ? 'Branding' : 'Marque'}</h1>
      <BrandingForm
        lang={lang}
        allowed={b.whiteLabel}
        initial={{
          brandName: tenant?.branding_config?.brand_name ?? tenant?.name ?? '',
          color: tenant?.branding_config?.primary_color ?? '#C8A45A',
          logoUrl: tenant?.branding_config?.logo_url ?? null,
        }}
      />
    </div>
  )
}
