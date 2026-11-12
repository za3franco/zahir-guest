import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { calculateScores, type ReportScores } from '@/lib/scoring'
import { checkPlanLimit, recordAiUsage } from '@/lib/limits'

export const maxDuration = 120

const CLASS_LABEL: Record<string, string> = {
  SERVICE: 'Service', EFFICIENCY: 'Efficiency', PRODUCT: 'Product', CLEANLINESS: 'Cleanliness',
  EMOTIONAL_INTELLIGENCE: 'Emotional intelligence', SALES_OPPORTUNITY: 'Sales opportunity',
}

/** Compact, factual digest of the audit for the model (current answers, not the snapshot taken at submission). */
function digest(scores: ReportScores, notes: Map<string, string>): string {
  const pct = (v: number | null) => (v == null ? 'n/a' : `${Math.round(v)}%`)
  const lines: string[] = []
  lines.push(`Overall score: ${pct(scores.overall_percent)} (${scores.total_meet} met, ${scores.total_below} below, ${scores.total_na} not applicable, out of ${scores.total_standards} standards).`)
  if (scores.average_emotional_rating) lines.push(`Average emotional rating: ${scores.average_emotional_rating.toFixed(1)} / 5.`)
  lines.push('By classification: ' + Object.entries(scores.classification_breakdown).map(([k, v]) => `${CLASS_LABEL[k] ?? k} ${pct(v.meet_percent)} (${v.below} below)`).join('; ') + '.')
  for (const d of scores.domains) {
    lines.push(`\n## ${d.name_en} — ${pct(d.score_percent)}`)
    for (const s of d.sections) {
      if (!s.scored) continue
      lines.push(`### ${s.name_en} — ${pct(s.score_percent)}${s.emotional_rating ? `, emotional ${s.emotional_rating}/5` : ''}`)
      for (const st of s.standards) {
        const note = notes.get(st.standard_id)
        if (st.response === 'below') lines.push(`- BELOW${st.is_critical ? ' [CRITICAL]' : ''} (${CLASS_LABEL[st.performance_classification] ?? ''}): ${st.question_en}${note ? ` — auditor: "${note.slice(0, 300)}"` : ''}`)
        else if (st.response === 'meet' && note) lines.push(`- MET: ${st.question_en} — auditor: "${note.slice(0, 200)}"`)
      }
    }
  }
  return lines.join('\n').slice(0, 120_000)
}

// Drafts the executive summary and recommendations of a report. The admin reviews and edits it before saving.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const ui = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (ui === 'en' ? en : fr)
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: msg('AI is not available right now.', "L'IA n'est pas disponible pour le moment.") }, { status: 503 })
  const body = await request.json().catch(() => ({}))
  const language: 'fr' | 'en' | 'both' = ['fr', 'en', 'both'].includes(body?.language) ? body.language : ui

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: campaign } = await db
    .from('campaigns')
    .select('id, name, tenant_id, template_id, status, submitted_at, property:properties(name, city, country, category)')
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['submitted', 'under_review', 'finalized', 'published'].includes(campaign.status)) {
    return NextResponse.json({ error: msg('The audit has not been submitted yet.', "L'audit n'a pas encore été soumis.") }, { status: 400 })
  }

  // Monthly quota of AI summaries per plan (grid v2).
  const quota = await checkPlanLimit(user.tenant_id, 'ai', ui)
  if (!quota.allowed) return NextResponse.json({ error: quota.message, code: quota.code }, { status: 402 })

  const { data: domains } = await db.from('template_domains').select('*').eq('template_id', campaign.template_id).order('display_order')
  const { data: sections } = await db.from('template_sections').select('*').in('domain_id', (domains ?? []).map((d: any) => d.id)).order('display_order')
  const secIds = (sections ?? []).map((s: any) => s.id)
  const standards: any[] = []
  for (let i = 0; i < secIds.length; i += 100) {
    const { data } = await db.from('template_standards').select('*').in('section_id', secIds.slice(i, i + 100)).order('display_order')
    standards.push(...(data ?? []))
  }
  const [{ data: responses }, { data: emotional }] = await Promise.all([
    db.from('audit_responses').select('standard_id, response, auditor_note').eq('campaign_id', params.id),
    db.from('audit_emotional_ratings').select('section_id, rating').eq('campaign_id', params.id),
  ])
  const scores = calculateScores(domains ?? [], sections ?? [], standards, (responses ?? []) as any, (emotional ?? []) as any)
  const notes = new Map<string, string>((responses ?? []).filter((r: any) => r.auditor_note).map((r: any) => [r.standard_id, r.auditor_note]))
  const prop: any = Array.isArray(campaign.property) ? campaign.property[0] : campaign.property

  const langRule = language === 'both'
    ? 'Write the full text in French first, then a line containing only "———", then the same text in English.'
    : `Write in ${language === 'en' ? 'English' : 'French'}.`
  const system = `You are a senior hospitality quality consultant writing the executive summary of a mystery-guest audit report for the hotel's general manager.
${langRule}
Structure (plain text, no markdown symbols such as # or **; short paragraphs; use "–" for list items):
1. Overall impression: the overall score and one or two sentences on the guest experience.
2. Strengths: two or three areas that performed well, with concrete examples from the data.
3. Priority areas: the most important gaps, critical failures first, grouped by theme, quoting what the auditor observed.
4. Recommendations: four to six prioritised, practical actions (training, process, product, supervision), each tied to a finding, with who should own it when obvious (e.g. Front Office Manager).
Tone: professional, factual, constructive, no exaggeration. Base everything strictly on the data; never invent observations, numbers or names. About 300 to 450 words${language === 'both' ? ' per language' : ''}.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL_REPORT ?? process.env.CLAUDE_MODEL_DEFAULT ?? 'claude-haiku-4-5-20251001',
      max_tokens: language === 'both' ? 4000 : 2000,
      system,
      messages: [{
        role: 'user',
        content: `Property: ${prop?.name ?? ''}${prop?.city ? `, ${prop.city}` : ''}${prop?.country ? ` (${prop.country})` : ''}${prop?.category ? ` — ${prop.category}` : ''}
Audit: ${campaign.name}${campaign.submitted_at ? `, submitted ${String(campaign.submitted_at).slice(0, 10)}` : ''}

AUDIT RESULTS
${digest(scores, notes)}`,
      }],
    }),
  })
  if (!res.ok) {
    console.error('[ai-summary] anthropic error', res.status, (await res.text().catch(() => '')).slice(0, 300))
    return NextResponse.json({ error: msg('The AI could not write the summary. Please try again.', "L'IA n'a pas pu rédiger la synthèse. Veuillez réessayer.") }, { status: 502 })
  }
  const data = await res.json()
  const text = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim()
  if (!text) return NextResponse.json({ error: msg('Empty answer, please try again.', 'Réponse vide, veuillez réessayer.') }, { status: 502 })
  await db.from('audit_reports').update({ model_used: data.model ?? null }).eq('campaign_id', params.id)
  await recordAiUsage(user.tenant_id, user.id, params.id)
  return NextResponse.json({ text })
}
