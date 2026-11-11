import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'
import { COPY } from '@/lib/landingContent'

export const metadata: Metadata = {
  title: { absolute: COPY.en.metaTitle },
  description: COPY.en.metaDescription,
  alternates: { canonical: '/en', languages: { fr: '/', en: '/en', 'x-default': '/' } },
  openGraph: { title: COPY.en.metaTitle, description: COPY.en.metaDescription, url: '/en', siteName: 'Zahir Guest', locale: 'en_GB', alternateLocale: ['fr_FR'], type: 'website' },
  twitter: { card: 'summary_large_image', title: COPY.en.metaTitle, description: COPY.en.metaDescription },
}

export default function HomeEn() {
  return <LandingPage lang="en" />
}
