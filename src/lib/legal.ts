// Legal identity shown on the legal pages. Fill the empty fields when you have them:
// empty values are simply not displayed. (Draft v0.1: have a lawyer review before wide commercial use.)
import { SUPPORT_EMAIL } from '@/lib/site'

export const LEGAL = {
  publisher: 'Za3fran Consulting',
  legalForm: '', // e.g. "SARL", "Auto-entrepreneur"...
  address: '', // registered address
  registration: '', // e.g. RC / ICE / SIRET number
  vat: '', // VAT / tax identification number, if any
  directorOfPublication: 'Arnaud Hébrard',
  email: SUPPORT_EMAIL,
  host: 'Vercel Inc. (hosting), Supabase (database, EU region Frankfurt)',
  updated: { fr: '10 novembre 2026', en: '10 November 2026' },
  governingLaw: { fr: 'droit marocain', en: 'Moroccan law' },
  courts: { fr: 'tribunaux compétents de Casablanca (Maroc)', en: 'the competent courts of Casablanca (Morocco)' },
  deletionDays: 90,
}
