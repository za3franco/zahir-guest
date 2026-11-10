import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'
import { COPY } from '@/lib/landingContent'

export const metadata: Metadata = {
  title: { absolute: COPY.fr.metaTitle },
  description: COPY.fr.metaDescription,
  alternates: { canonical: '/', languages: { fr: '/', en: '/en', 'x-default': '/' } },
  openGraph: { title: COPY.fr.metaTitle, description: COPY.fr.metaDescription, url: '/', siteName: 'Zahir Guest', locale: 'fr_FR', alternateLocale: ['en_GB'], type: 'website' },
  twitter: { card: 'summary_large_image', title: COPY.fr.metaTitle, description: COPY.fr.metaDescription },
}

// Public marketing page (static, French). Signed-in visitors see "Mon espace" in the header.
export default function Home() {
  return <LandingPage lang="fr" />
}
