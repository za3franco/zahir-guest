import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'),
  title: {
    default: 'Zahir Guest',
    template: '%s — Zahir Guest',
  },
  description: 'Mystery guest audit platform for the hospitality industry. Reveal what cannot be unseen.',
  icons: {
    icon: '/favicon.ico',
  },
  // Home-screen app on iPhone (ZG-6 offline audits)
  appleWebApp: {
    capable: true,
    title: 'Zahir Guest',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
