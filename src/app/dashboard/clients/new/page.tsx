export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import ClientForm from '../_components/ClientForm'

export default async function NewClientPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  return <ClientForm lang={user.default_language === 'en' ? 'en' : 'fr'} />
}
