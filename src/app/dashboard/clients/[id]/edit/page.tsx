export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import type { ClientRow } from '@/lib/clients'
import ClientForm from '../../_components/ClientForm'

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: client } = await supabase.from('clients').select('*').eq('id', params.id).eq('tenant_id', user.tenant_id).maybeSingle()
  if (!client) notFound()
  return <ClientForm lang={user.default_language === 'en' ? 'en' : 'fr'} client={client as ClientRow} />
}
