import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { TERMS } from '@/lib/legalContent'

export const metadata: Metadata = {
  title: TERMS.en.title,
  description: TERMS.en.intro.slice(0, 160),
  alternates: { canonical: '/en/terms', languages: { fr: '/terms', en: '/en/terms' } },
}

export default function Page() {
  return <LegalPage kind="terms" lang="en" />
}
