export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import EditUserForm from './_components/EditUserForm'

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const currentUser = await requireUser()

  if (currentUser.role !== 'tenant_admin' && currentUser.role !== 'super_admin') {
    return notFound()
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, default_language')
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .single()

  if (!targetUser) notFound()

  return <EditUserForm currentUser={currentUser} targetUser={targetUser} />
}
