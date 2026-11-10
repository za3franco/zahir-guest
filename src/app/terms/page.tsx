import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { TERMS } from '@/lib/legalContent'

export const metadata: Metadata = {
  title: TERMS.fr.title,
  description: TERMS.fr.intro.slice(0, 160),
  alternates: { canonical: '/terms', languages: { fr: '/terms', en: '/en/terms' } },
}

export default function Page() {
  return <LegalPage kind="terms" lang="fr" />
}
