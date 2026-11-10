import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { PRIVACY } from '@/lib/legalContent'

export const metadata: Metadata = {
  title: PRIVACY.en.title,
  description: PRIVACY.en.intro.slice(0, 160),
  alternates: { canonical: '/en/privacy', languages: { fr: '/privacy', en: '/en/privacy' } },
}

export default function Page() {
  return <LegalPage kind="privacy" lang="en" />
}
