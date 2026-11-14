// Public site constants (landing page, SEO, support).
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com').replace(/\/$/, '')
// Until a zahirguest.com mailbox exists, support goes to the Za3fran address. Override in Vercel with NEXT_PUBLIC_SUPPORT_EMAIL.
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'hello@za3fran.io'
// Contact form ("Parlons-en"): replaces the old mailto link so that every lead arrives with its details.
export const CONTACT_HREF = (lang: 'en' | 'fr', source = 'landing') => `/contact?lang=${lang}&src=${source}`
