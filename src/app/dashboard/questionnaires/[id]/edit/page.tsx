export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { hasFullLibrary } from '@/lib/limits'
import { loadTemplateTree } from '@/lib/questionnaireTree'
import { loadLibrary } from '@/lib/questionnaireLibrary'
import QuestionnaireEditor from '../../_components/QuestionnaireEditor'

export default async function EditQuestionnairePage({ params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  if (!(await hasFullLibrary(user.tenant_id))) redirect('/dashboard/questionnaires?locked=1')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tree = await loadTemplateTree(db, params.id, user.tenant_id)
  if (!tree || tree.tenant_id !== user.tenant_id) notFound()
  const { data: campaigns } = await db.from('campaigns').select('id', { count: 'exact', head: false }).eq('template_id', params.id).limit(1)
  const library = await loadLibrary(db, user.tenant_id)
  return <QuestionnaireEditor tree={tree} lang={user.default_language === 'en' ? 'en' : 'fr'} inUse={!!campaigns?.length} library={library} />
}
