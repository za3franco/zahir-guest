export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import PropertyForm from '../_components/PropertyForm'
import { redirect } from 'next/navigation'

export default async function NewPropertyPage({ searchParams }: { searchParams?: { client?: string } }) {
  const user = await requireUser()
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') redirect('/dashboard')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)
    .eq('is_archived', false)
    .order('name')

  return (
    <PropertyForm
      user={user}
      clients={clients ?? []}
      defaultClientId={searchParams?.client}
      mode="create"
    />
  )
}
