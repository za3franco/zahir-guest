export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import AiImport from '../_components/AiImport'

export default async function AiImportPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  return <AiImport lang={user.default_language === 'en' ? 'en' : 'fr'} />
}
