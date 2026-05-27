export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import ReviewInterface from './_components/ReviewInterface'

export default async function CampaignReviewPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    redirect('/dashboard')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load campaign
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select(`
      *,
      property:properties(id, name, city, category, country),
      auditor:users!campaigns_auditor_user_id_fkey(id, name, email),
      template:questionnaire_templates(id, name, tier)
    `)
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!campaign) notFound()

  if (!['submitted', 'under_review', 'finalized', 'published'].includes(campaign.status)) {
    redirect(`/dashboard/campaigns/${params.id}`)
  }

  // Load report with scores
  const { data: report } = await supabaseAdmin
    .from('audit_reports')
    .select('*')
    .eq('campaign_id', params.id)
    .single()

  // Load full questionnaire structure
  const { data: domains } = await supabaseAdmin
    .from('template_domains')
    .select('*')
    .eq('template_id', campaign.template_id)
    .order('display_order')

  const { data: sections } = await supabaseAdmin
    .from('template_sections')
    .select('*')
    .in('domain_id', (domains ?? []).map((d: any) => d.id))
    .order('display_order')

  const { data: standards } = await supabaseAdmin
    .from('template_standards')
    .select('*')
    .in('section_id', (sections ?? []).map((s: any) => s.id))
    .order('display_order')

  // Load responses
  const { data: responses } = await supabaseAdmin
    .from('audit_responses')
    .select('*')
    .eq('campaign_id', params.id)

  return (
    <ReviewInterface
      campaign={campaign}
      report={report}
      domains={domains ?? []}
      sections={sections ?? []}
      standards={standards ?? []}
      responses={responses ?? []}
      user={user}
    />
  )
}
