// Public site constants (landing page, SEO, support).
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com').replace(/\/$/, '')
// Until a zahirguest.com mailbox exists, support goes to the Za3fran address. Override in Vercel with NEXT_PUBLIC_SUPPORT_EMAIL.
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'hello@za3fran.io'
export const DEMO_MAILTO = (lang: 'en' | 'fr') =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(lang === 'en' ? 'Zahir Guest demo request' : 'Demande de démo Zahir Guest')}`
