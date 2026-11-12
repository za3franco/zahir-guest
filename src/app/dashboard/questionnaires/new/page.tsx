export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { loadLibrary } from '@/lib/questionnaireLibrary'
import NewWizard from '../_components/NewWizard'

export default async function NewQuestionnairePage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [library, { data: templates }] = await Promise.all([
    loadLibrary(db, user.tenant_id),
    db.from('questionnaire_templates').select('id, name').or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`).eq('is_active', true).order('name'),
  ])
  return <NewWizard lang={user.default_language === 'en' ? 'en' : 'fr'} library={library} templates={templates ?? []} />
}
