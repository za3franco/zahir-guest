// Reads Excel (.xls and .xlsx) and CSV files into plain string grids. Server-side only.
import * as XLSX from '@e965/xlsx'

export interface Sheet { name: string; rows: string[][] }

export const SPREADSHEET_EXT = /\.(xls|xlsx|xlsm|ods|csv|tsv)$/i

export function readSpreadsheet(buf: Buffer): Sheet[] {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false, dense: true })
  return wb.SheetNames.map(name => {
    const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', blankrows: false, raw: false })
    const rows = raw.map(r => r.map(c => String(c ?? '').replace(/\r\n?/g, '\n').trim()))
    return { name, rows: rows.filter(r => r.some(c => c !== '')) }
  }).filter(s => s.rows.length)
}
