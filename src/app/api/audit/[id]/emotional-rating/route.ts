import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { canWorkOnAudit, isAuditOpen, sectionInTemplate } from '@/lib/auditAccess'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => null)
  const section_id = typeof body?.section_id === 'string' ? body.section_id : ''
  const rating = body?.rating

  if (!section_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  // Verify campaign access
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, auditor_user_id, tenant_id, status, template_id')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Only the assigned auditor or admins of the same workspace may touch an audit
  if (!canWorkOnAudit(user, campaign)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Once submitted, ratings are frozen like answers
  if (!isAuditOpen(campaign.status)) {
    return NextResponse.json({ error: 'Audit is closed', code: 'audit_closed' }, { status: 409 })
  }

  // The section must belong to this audit's questionnaire
  if (!(await sectionInTemplate(supabaseAdmin, section_id, campaign.template_id))) {
    return NextResponse.json({ error: 'Section does not belong to this audit', code: 'unknown_section' }, { status: 400 })
  }

  if (campaign.status === 'assigned') {
    await supabaseAdmin.from('campaigns').update({ status: 'in_progress' }).eq('id', params.id).eq('status', 'assigned')
  }

  const { error } = await supabaseAdmin
    .from('audit_emotional_ratings')
    .upsert({
      campaign_id: params.id,
      section_id,
      rating,
    }, {
      onConflict: 'campaign_id,section_id',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
