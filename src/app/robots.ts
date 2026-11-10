import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Public pages are open to search engines and AI crawlers; the application itself is not.
const PRIVATE = ['/dashboard', '/superadmin', '/api/', '/audit', '/auth/']

export default function robots(): MetadataRoute.Robots {
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot']
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...aiBots.map(userAgent => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
