export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import ImportForm from '../_components/ImportForm'

export default async function ImportPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  return <ImportForm lang={user.default_language === 'en' ? 'en' : 'fr'} />
}
