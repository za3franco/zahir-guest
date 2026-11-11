import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { toCsv } from '@/lib/questionnaireImport'
import { loadTemplateTree } from '@/lib/questionnaireTree'

// Downloads a questionnaire (platform standard or your own) as a CSV you can edit and re-import.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tree = await loadTemplateTree(db, params.id, user.tenant_id)
  if (!tree) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const rows: string[][] = []
  for (const d of tree.domains) for (const s of d.sections) for (const q of s.standards) {
    rows.push([d.name_en, s.name_en, q.question_en, q.classification, q.critical ? 'yes' : 'no', q.guidance_en, d.name_fr, s.name_fr, q.question_fr, q.guidance_fr])
  }
  const file = tree.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'questionnaire'
  return new NextResponse(toCsv(rows), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}.csv"` },
  })
}
