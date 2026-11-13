import type { MetadataRoute } from 'next'

// Installable app (ZG-6): on a phone, "Add to Home Screen" opens the dashboard full screen. Installing also
// protects the audits kept offline from the browser's storage clean-up (Safari).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zahir Guest',
    short_name: 'Zahir Guest',
    description: 'Audits mystère hôteliers, même sans réseau.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0D1B2A',
    theme_color: '#0D1B2A',
    lang: 'fr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
