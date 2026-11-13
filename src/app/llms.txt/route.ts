import { COPY, FAQS } from '@/lib/landingContent'
import { PLAN_FEATURES, PLAN_NAMES, PRICE_GRID, type PlanTier } from '@/lib/plans'
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/site'

export const dynamic = 'force-static'

// llms.txt: a plain-text summary of the product for AI assistants and answer engines.
export function GET() {
  const en = COPY.en
  const tiers: PlanTier[] = ['starter', 'professional', 'enterprise']
  const plans = tiers.map(t => {
    const eur = PRICE_GRID.EUR[t]
    const usd = PRICE_GRID.USD[t]
    const mad = PRICE_GRID.MAD[t]
    const from = t === 'enterprise' ? 'from ' : ''
    const extra = eur.extra ? ` (+€${eur.extra} per extra property)` : ''
    return `- ${PLAN_NAMES[t].en}: ${from}€${eur.base}/month${extra}; $${usd.base}/month; MAD ${mad.base}/month (prepaid). ${PLAN_FEATURES[t].en.join(', ')}.`
  }).join('\n')
  const faq = FAQS.en.map(f => `### ${f.q}\n${f.a}`).join('\n\n')

  const body = `# Zahir Guest

> ${en.metaDescription}

Zahir Guest is a multi-tenant SaaS platform for mystery guest (mystery shopper) audits in hospitality, built by Za3fran Consulting. Available in English and French.

## Who it is for
${en.audience.items.map(i => `- ${i.t}: ${i.d}`).join('\n')}

## Key features
${en.features.items.map(i => `- ${i.t}: ${i.d}`).join('\n')}

## Pricing (per property; free Discovery plan with no credit card: 1 property, 2 users, 1 audit per quarter; annual = 2 months free; 14-day Professional pilot on request)
${plans}

## Pages
- [Home (English)](${SITE_URL}/en)
- [Accueil (français)](${SITE_URL}/)
- [Start for free](${SITE_URL}/signup)
- [Sign in](${SITE_URL}/login)

## Contact
${SUPPORT_EMAIL}

## FAQ
${faq}
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
