import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { readSpreadsheet } from '@/lib/spreadsheet'

export const runtime = 'nodejs'

// Reads the first sheet of an Excel file (.xls or .xlsx) and returns it as CSV text, so the spreadsheet import accepts Excel directly.
export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return Response.json({ error: 'Unauthorized' }, { status: 403 })
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return Response.json({ error: 'FILE' }, { status: 400 })
  try {
    const [sheet] = readSpreadsheet(Buffer.from(await file.arrayBuffer()))
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`
    return new Response((sheet?.rows ?? []).map(r => r.map(q).join(';')).join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch {
    return Response.json({ error: 'READ' }, { status: 400 })
  }
}
