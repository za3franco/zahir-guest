export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import PropertyForm from '../_components/PropertyForm'

export default async function NewPropertyPage() {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: managers } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .eq('tenant_id', user.tenant_id)
    .eq('role', 'property_manager')
    .order('name')

  return (
    <PropertyForm
      user={user}
      propertyManagers={managers ?? []}
      mode="create"
    />
  )
}
