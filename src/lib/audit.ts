import { createClient } from '@supabase/supabase-js'

// Records super-admin actions (best effort: never blocks the action itself).
export async function logAdminAction(actorUserId: string, action: string, tenantId?: string | null, detail?: unknown) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await supabase.from('admin_audit_log').insert({
      actor_user_id: actorUserId,
      action,
      tenant_id: tenantId ?? null,
      detail: detail ?? null,
    })
  } catch (err) {
    console.error('[audit] log failed:', err)
  }
}
