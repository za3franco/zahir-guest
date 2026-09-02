export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import type { Property } from '@/types'
import PropertyForm from '../../_components/PropertyForm'

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const user = await requireUser()

  // Only admins can edit properties
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    redirect('/dashboard/reports')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!property) notFound()

  const { data: managers } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .eq('tenant_id', user.tenant_id)
    .eq('role', 'property_manager')
    .order('name')

  return (
    <PropertyForm
      user={user}
      property={property as Property}
      propertyManagers={managers ?? []}
      mode="edit"
    />
  )
}
