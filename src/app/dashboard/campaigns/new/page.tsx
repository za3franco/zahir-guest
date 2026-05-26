export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import CampaignForm from '../_components/CampaignForm'

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: { property_id?: string }
}) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: properties }, { data: auditors }, { data: templates }] = await Promise.all([
    supabaseAdmin
      .from('properties')
      .select('id, name, city, category')
      .eq('tenant_id', user.tenant_id)
      .eq('is_archived', false)
      .order('name'),
    supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('tenant_id', user.tenant_id)
      .eq('role', 'auditor')
      .order('name'),
    supabaseAdmin
      .from('questionnaire_templates')
      .select('id, name, tier')
      .or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <CampaignForm
      user={user}
      properties={properties ?? []}
      auditors={auditors ?? []}
      templates={templates ?? []}
      mode="create"
      defaultPropertyId={searchParams.property_id}
    />
  )
}
