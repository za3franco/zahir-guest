// Checks the references sent when creating or editing a campaign: the property, the auditor and the
// questionnaire must belong to the workspace (or, for the questionnaire, be a platform one the plan allows).
import { createClient } from '@supabase/supabase-js'
import { canUseTemplate } from '@/lib/limits'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function checkCampaignRefs(
  tenantId: string,
  refs: { property_id?: unknown; auditor_user_id?: unknown; template_id?: unknown },
  lang: 'en' | 'fr'
): Promise<string | null> {
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  if (refs.property_id !== undefined) {
    const id = String(refs.property_id ?? '')
    if (!UUID.test(id)) return msg('Please choose a property.', 'Choisissez un établissement.')
    const { data } = await db.from('properties').select('id').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
    if (!data) return msg('Unknown property.', 'Établissement inconnu.')
  }

  if (refs.auditor_user_id !== undefined && refs.auditor_user_id !== null && refs.auditor_user_id !== '') {
    const id = String(refs.auditor_user_id)
    if (!UUID.test(id)) return msg('Unknown auditor.', 'Auditeur inconnu.')
    const { data } = await db.from('users').select('id').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
    if (!data) return msg('Unknown auditor.', 'Auditeur inconnu.')
  }

  if (refs.template_id !== undefined) {
    const id = String(refs.template_id ?? '')
    if (!UUID.test(id) || !(await canUseTemplate(tenantId, id))) {
      return msg(
        'This questionnaire is not available on your plan. The Discovery plan uses the Essential questionnaire.',
        "Ce questionnaire n'est pas disponible avec votre offre. L'offre Découverte utilise le questionnaire Essentiel."
      )
    }
  }
  return null
}
