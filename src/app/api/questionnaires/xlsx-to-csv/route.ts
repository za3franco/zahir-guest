import { apiError, langOf } from '@/lib/apiErrors'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { libraryLockedResponse } from '@/lib/limits'
import { readSpreadsheet } from '@/lib/spreadsheet'

export const runtime = 'nodejs'

// Reads the first sheet of an Excel file (.xls or .xlsx) and returns it as CSV text, so the spreadsheet import accepts Excel directly.
export async function POST(request: Request) {
  const user = await requireUser()
  const lang = langOf(user)
  if (!isAdminRole(user.role)) return apiError(lang, 'forbidden')
  {
    const locked = await libraryLockedResponse(user.tenant_id, user.default_language === 'en' ? 'en' : 'fr')
    if (locked) return locked
  }
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return apiError(lang, 'file_invalid')
  try {
    const [sheet] = readSpreadsheet(Buffer.from(await file.arrayBuffer()))
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`
    return new Response((sheet?.rows ?? []).map(r => r.map(q).join(';')).join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch {
    return apiError(lang, 'file_unreadable')
  }
}
