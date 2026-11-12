import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'

export const runtime = 'nodejs'

// Reads the first sheet of an Excel file and returns it as CSV text, so the spreadsheet import accepts .xlsx directly.
export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return Response.json({ error: 'Unauthorized' }, { status: 403 })
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return Response.json({ error: 'FILE' }, { status: 400 })
  try {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
    const ws = wb.worksheets[0]
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines: string[] = []
    ws?.eachRow(row => {
      const cells = (row.values as any[]).slice(1).map(v =>
        v == null ? '' : typeof v === 'object' ? String(v.text ?? v.result ?? (v.richText ? v.richText.map((r: any) => r.text).join('') : '')) : String(v)
      )
      lines.push(cells.map(q).join(';'))
    })
    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch {
    return Response.json({ error: 'READ' }, { status: 400 })
  }
}
