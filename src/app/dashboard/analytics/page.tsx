export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole, isViewer } from '@/lib/access'
import { loadAuditRows } from '@/lib/analytics'
import Analytics from './Analytics'

export default async function AnalyticsPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role) && !isViewer(user.role)) redirect('/dashboard')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const rows = await loadAuditRows(db, user)
  const clientIds = Array.from(new Set(rows.map(r => r.clientId).filter(Boolean))) as string[]
  const { data: clients } = clientIds.length
    ? await db.from('clients').select('id, name').in('id', clientIds).order('name')
    : { data: [] as { id: string; name: string }[] }
  return <Analytics rows={rows} clients={clients ?? []} lang={user.default_language === 'en' ? 'en' : 'fr'} isAdmin={isAdminRole(user.role)} />
}
