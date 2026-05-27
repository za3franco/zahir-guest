import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { calculateScores } from '@/lib/scoring'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify campaign access
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, auditor_user_id, tenant_id, status, template_id')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (user.role === 'auditor' && campaign.auditor_user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!['assigned', 'in_progress'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign cannot be submitted in its current status' }, { status: 400 })
  }

  // ── Load full questionnaire structure ──────────────────────────────
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

  // ── Load responses and emotional ratings ───────────────────────────
  const { data: responses } = await supabaseAdmin
    .from('audit_responses')
    .select('standard_id, response, auditor_note')
    .eq('campaign_id', params.id)

  const { data: emotionalRatings } = await supabaseAdmin
    .from('audit_emotional_ratings')
    .select('section_id, rating')
    .eq('campaign_id', params.id)

  // ── Run scoring engine ─────────────────────────────────────────────
  const scores = calculateScores(
    domains ?? [],
    sections ?? [],
    standards ?? [],
    (responses ?? []).map((r: any) => ({
      standard_id: r.standard_id,
      response: r.response,
      auditor_note: r.auditor_note,
    })),
    (emotionalRatings ?? []).map((e: any) => ({
      section_id: e.section_id,
      rating: e.rating,
    }))
  )

  // ── Update campaign status ─────────────────────────────────────────
  const { error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 })
  }

  // ── Store report with scores ───────────────────────────────────────
  // Check if a report already exists for this campaign
  const { data: existingReport } = await supabaseAdmin
    .from('audit_reports')
    .select('id')
    .eq('campaign_id', params.id)
    .single()

  if (existingReport) {
    // Update existing report
    await supabaseAdmin
      .from('audit_reports')
      .update({
        report_json: scores,
        generated_at: new Date().toISOString(),
      })
      .eq('id', existingReport.id)
  } else {
    // Create new report
    await supabaseAdmin
      .from('audit_reports')
      .insert({
        campaign_id: params.id,
        tenant_id: campaign.tenant_id,
        report_json: scores,
        language: 'bilingual',
        generated_at: new Date().toISOString(),
      })
  }

  return NextResponse.json({
    ok: true,
    scores: {
      overall_percent: scores.overall_percent,
      total_standards: scores.total_standards,
      total_meet: scores.total_meet,
      total_below: scores.total_below,
    }
  })
}
