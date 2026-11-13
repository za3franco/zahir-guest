// The question library offered when building a questionnaire: every domain, section and question of the
// Zahir Guest standard(s), plus extra common sections (names only) that hotels often audit.
// Used by the guided start, the editor drop-downs / question picker and the AI import (to reuse names).

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadTemplateTree, type TreeDomain, type TreeStandard } from '@/lib/questionnaireTree'
import { ESSENTIAL_TEMPLATE_ID } from '@/lib/plans'

export interface LibQuestion { question_en: string; question_fr: string; classification: string; critical: boolean; guidance_en: string; guidance_fr: string }
export interface LibSection { key: string; name_en: string; name_fr: string; optional: boolean; questions: LibQuestion[] }
export interface LibDomain { key: string; name_en: string; name_fr: string; sections: LibSection[] }
export type Library = LibDomain[]

// Common sections not covered by the standard yet: offered by name, the user writes (or picks) the questions.
const EXTRA_SECTIONS: Record<string, { name_en: string; name_fr: string }[]> = {
  'Front Office': [
    { name_en: 'Club / Executive Lounge', name_fr: 'Club / Salon Exécutif' },
    { name_en: 'Telephone / Switchboard', name_fr: 'Téléphone / Standard' },
    { name_en: 'Parking / Valet', name_fr: 'Parking / Voiturier' },
  ],
  'Food & Beverage': [
    { name_en: 'Lobby Lounge / Afternoon Tea', name_fr: 'Lobby Lounge / Tea Time' },
    { name_en: 'Pool Bar / Beach Restaurant', name_fr: 'Bar de piscine / Restaurant de plage' },
    { name_en: 'Minibar', name_fr: 'Minibar' },
  ],
  Product: [{ name_en: 'Accessibility', name_fr: 'Accessibilité' }],
  'Other Services': [
    { name_en: 'Kids Club', name_fr: 'Club Enfants' },
    { name_en: 'Activities & Entertainment', name_fr: 'Activités & Animation' },
    { name_en: 'Beach', name_fr: 'Plage' },
    { name_en: 'Meetings & Events', name_fr: 'Séminaires & Événements' },
    { name_en: 'Golf', name_fr: 'Golf' },
    { name_en: 'Shop / Boutique', name_fr: 'Boutique' },
  ],
}

export const keyOf = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const toQ = (q: TreeStandard): LibQuestion => ({
  question_en: q.question_en, question_fr: q.question_fr, classification: q.classification,
  critical: q.critical, guidance_en: q.guidance_en, guidance_fr: q.guidance_fr,
})

/** Builds the library from the active platform questionnaires (merged by domain/section name). */
export async function loadLibrary(db: SupabaseClient<any, any, any>, tenantId: string): Promise<Library> {
  // The "Essentiel" questionnaire is a subset of the library: leave it out so questions are not offered twice.
  const { data: tpls } = await db.from('questionnaire_templates').select('id').is('tenant_id', null).eq('is_active', true).neq('id', ESSENTIAL_TEMPLATE_ID).order('created_at')
  const domains: LibDomain[] = []
  for (const t of tpls ?? []) {
    const tree = await loadTemplateTree(db, t.id, tenantId)
    for (const d of tree?.domains ?? []) mergeDomain(domains, d)
  }
  for (const [domainEn, extras] of Object.entries(EXTRA_SECTIONS)) {
    const d = domains.find(x => x.name_en === domainEn)
    if (!d) continue
    for (const e of extras) {
      if (!d.sections.some(s => s.key === keyOf(e.name_en))) d.sections.push({ key: keyOf(e.name_en), ...e, optional: true, questions: [] })
    }
  }
  return domains
}

function mergeDomain(domains: LibDomain[], d: TreeDomain) {
  let target = domains.find(x => x.key === keyOf(d.name_en))
  if (!target) { target = { key: keyOf(d.name_en), name_en: d.name_en, name_fr: d.name_fr, sections: [] }; domains.push(target) }
  for (const s of d.sections) {
    const sk = keyOf(s.name_en)
    const existing = target.sections.find(x => x.key === sk)
    if (existing) existing.questions.push(...s.standards.map(toQ))
    else target.sections.push({ key: sk, name_en: s.name_en, name_fr: s.name_fr, optional: !!s.optional, questions: s.standards.map(toQ) })
  }
}

/** "Essentials" = every critical question plus the first ones of the section, up to `max`. */
export function essentials(questions: LibQuestion[], max = 10): LibQuestion[] {
  const crit = questions.filter(q => q.critical)
  const rest = questions.filter(q => !q.critical)
  return [...crit, ...rest].slice(0, Math.max(max, crit.length)).sort((a, b) => questions.indexOf(a) - questions.indexOf(b))
}
