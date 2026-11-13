export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { hasFullLibrary } from '@/lib/limits'
import { ESSENTIAL_TEMPLATE_ID } from '@/lib/plans'
import { notFound } from 'next/navigation'
import CampaignForm from '../../_components/CampaignForm'

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: campaign }, { data: properties }, { data: auditors }, { data: templates }] = await Promise.all([
    supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id)
      .single(),
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

  if (!campaign) notFound()

  // Free plan: the "Essentiel" questionnaire, plus the one this campaign already uses.
  const full = await hasFullLibrary(user.tenant_id)
  const usable = (templates ?? []).filter((x: any) => full || x.id === ESSENTIAL_TEMPLATE_ID || x.id === (campaign as any).template_id)

  return (
    <CampaignForm
      user={user}
      campaign={campaign}
      properties={properties ?? []}
      auditors={auditors ?? []}
      templates={usable}
      mode="edit"
    />
  )
}
