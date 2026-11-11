import { createClient } from '@supabase/supabase-js'

// Simple per-user usage limits for the AI coach and support requests (table help_usage).
export async function checkAndRecordUsage(userId: string, kind: 'chat' | 'support', max: number, windowMs: number) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabase
    .from('help_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since)
  if ((count ?? 0) >= max) return false
  await supabase.from('help_usage').insert({ user_id: userId, kind })
  return true
}
