export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import AuditInterface from './_components/AuditInterface'

export default async function AuditPage({ params }: { params: { id: string } }) {
  const user = await requireUser()

  // Only auditors can access this
  if (user.role !== 'auditor' && user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    redirect('/dashboard')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load campaign
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('*, property:properties(name, city), template:questionnaire_templates(id, name)')
    .eq('id', params.id)
    .single()

  if (!campaign) notFound()

  // Auditors can only access their own campaigns
  if (user.role === 'auditor' && campaign.auditor_user_id !== user.id) {
    redirect('/dashboard')
  }

  // Cannot audit a published or finalized campaign
  if (['published', 'finalized'].includes(campaign.status)) {
    redirect(`/dashboard/campaigns/${params.id}`)
  }

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

  // Load existing responses
  const { data: responses } = await supabaseAdmin
    .from('audit_responses')
    .select('*')
    .eq('campaign_id', params.id)

  // Load existing emotional ratings
  const { data: emotionalRatings } = await supabaseAdmin
    .from('audit_emotional_ratings')
    .select('*')
    .eq('campaign_id', params.id)

  return (
    <AuditInterface
      campaign={campaign}
      domains={domains ?? []}
      sections={sections ?? []}
      standards={standards ?? []}
      existingResponses={responses ?? []}
      existingEmotionalRatings={emotionalRatings ?? []}
      user={user}
    />
  )
}
