export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { hasFullLibrary } from '@/lib/limits'
import ImportForm from '../_components/ImportForm'

export default async function ImportPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  if (!(await hasFullLibrary(user.tenant_id))) redirect('/dashboard/questionnaires?locked=1')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await db.from('questionnaire_templates').select('id, name').is('tenant_id', null).eq('is_active', true).order('name')
  return <ImportForm lang={user.default_language === 'en' ? 'en' : 'fr'} standards={data ?? []} />
}
