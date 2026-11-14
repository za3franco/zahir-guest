import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Super admin: switches the offline audit mode (ZG-6) on or off for a workspace. Body: { enabled: boolean }.
// Turning it off also makes the phones of that workspace drop the offline app cache at their next visit.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperAdmin()
  const lang = langOf(admin)
  const body = await request.json().catch(() => ({}))
  if (typeof body.enabled !== 'boolean') return apiError(lang, 'invalid_request')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.from('tenants').update({ offline_audit_enabled: body.enabled }).eq('id', params.id).select('id').maybeSingle()
  if (error) return serverError(lang, error, 'superadmin/tenants/id/offline')
  if (!data) return apiError(lang, 'workspace_not_found')
  await logAdminAction(admin.id, body.enabled ? 'tenant_offline_on' : 'tenant_offline_off', params.id, {})
  return NextResponse.json({ ok: true })
}
