import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parlons-en · Let’s talk',
  description: 'Enterprise, chaînes, cabinets et programmes : dites-nous votre besoin et nous revenons vers vous sous un jour ouvré.',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
