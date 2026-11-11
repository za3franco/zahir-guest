export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import EditUserForm from './_components/EditUserForm'
import AccessEditor from './_components/AccessEditor'
import { isViewer } from '@/lib/access'

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

  // A super admin account is only managed by a super admin
  if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') notFound()

  const viewer = isViewer(targetUser.role)
  const [{ data: clients }, { data: properties }, { data: access }] = viewer
    ? await Promise.all([
        supabaseAdmin.from('clients').select('id, name').eq('tenant_id', currentUser.tenant_id).eq('is_archived', false).order('name'),
        supabaseAdmin.from('properties').select('id, name, city, client_id').eq('tenant_id', currentUser.tenant_id).eq('is_archived', false).order('name'),
        supabaseAdmin.from('user_access').select('client_id, property_id').eq('user_id', targetUser.id).eq('tenant_id', currentUser.tenant_id),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  return (
    <>
      <EditUserForm currentUser={currentUser} targetUser={targetUser} />
      {viewer && (
        <div style={{ maxWidth: 720 }}>
          <AccessEditor
            userId={targetUser.id}
            lang={currentUser.default_language === 'en' ? 'en' : 'fr'}
            clients={(clients ?? []) as any}
            properties={(properties ?? []) as any}
            initialClientIds={(access ?? []).filter((a: any) => a.client_id).map((a: any) => a.client_id)}
            initialPropertyIds={(access ?? []).filter((a: any) => a.property_id).map((a: any) => a.property_id)}
          />
        </div>
      )}
    </>
  )
}
