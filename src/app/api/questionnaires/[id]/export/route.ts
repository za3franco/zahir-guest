import { apiError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { toCsv } from '@/lib/questionnaireImport'
import { loadTemplateTree } from '@/lib/questionnaireTree'
import { libraryLockedResponse } from '@/lib/limits'
import { createHash } from 'crypto'

// Downloads a questionnaire (platform standard or your own) as a CSV you can edit and re-import.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const user = await requireUser()
  const lang = langOf(user)
  if (!isAdminRole(user.role)) return apiError(lang, 'forbidden')
  // Exports (the library above all) are for paying plans and pilots only.
  const locked = await libraryLockedResponse(user.tenant_id, user.default_language === 'en' ? 'en' : 'fr')
  if (locked) return locked
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tree = await loadTemplateTree(db, params.id, user.tenant_id)
  if (!tree) return apiError(lang, 'not_found')
  // The platform library is our product: a workspace can export it a few times a day, not harvest it (counter in
  // signup_attempts, keyed by a hash of the workspace; the exports are also written to the server log)
  if (tree.tenant_id === null) {
    const key = createHash('sha256').update(`export|${user.tenant_id}`).digest('hex')
    const { count } = await db.from('signup_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', key).gte('created_at', new Date(Date.now() - 86400_000).toISOString())
    if ((count ?? 0) >= 3) return apiError(lang, 'too_many_attempts')
    await db.from('signup_attempts').insert({ ip_hash: key })
    console.warn('[export] platform questionnaire exported', JSON.stringify({ template: tree.id, tenant: user.tenant_id, user: user.id }))
  }
  const rows: string[][] = []
  for (const d of tree.domains) for (const s of d.sections) for (const q of s.standards) {
    rows.push([d.name_en, s.name_en, q.question_en, q.classification, q.critical ? 'yes' : 'no', q.guidance_en, d.name_fr, s.name_fr, q.question_fr, q.guidance_fr])
  }
  const file = tree.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'questionnaire'
  return new NextResponse(toCsv(rows), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}.csv"` },
  })
}
