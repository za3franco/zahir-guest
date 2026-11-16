/** @type {import('next').NextConfig} */

// Security headers for every response. The application is served only from its own origin; it talks to Supabase
// (authentication, storage) from the browser and to nothing else (Stripe, YouCan Pay, Brevo and Anthropic are called by
// the server). Vercel preview deployments also need Vercel's own toolbar, so those hosts are added outside production.
const preview = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
const vercelLive = preview ? ' https://vercel.live https://*.vercel.live wss://ws-us3.pusher.com' : ''

const csp = [
  "default-src 'self'",
  // Next.js injects small inline scripts and styles; everything else must come from our own origin
  `script-src 'self' 'unsafe-inline'${vercelLive}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${vercelLive}`,
  `font-src 'self' data: https://fonts.gstatic.com${vercelLive}`,
  `img-src 'self' data: blob: https://*.supabase.co${vercelLive}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${vercelLive}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  preview ? "frame-src https://vercel.live" : "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera is used by the audit screen to take photos; nothing else is needed
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false, // the readable source code is never published to browsers
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Answers of the API are personal or workspace data: never stored by a browser, proxy or CDN
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/dashboard/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/superadmin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]
  },
}

module.exports = nextConfig
