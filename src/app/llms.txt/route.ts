import { COPY, FAQS } from '@/lib/landingContent'
import { PLAN_DISPLAY } from '@/lib/plans'
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/site'

export const dynamic = 'force-static'

// llms.txt: a plain-text summary of the product for AI assistants and answer engines.
export function GET() {
  const en = COPY.en
  const plans = PLAN_DISPLAY.map(p => `- ${p.name}: €${p.monthlyEur}/month${p.annualEur ? ` (or €${p.annualEur}/year)` : ''}. ${p.featuresEn.join(', ')}.`).join('\n')
  const faq = FAQS.en.map(f => `### ${f.q}\n${f.a}`).join('\n\n')

  const body = `# Zahir Guest

> ${en.metaDescription}

Zahir Guest is a multi-tenant SaaS platform for mystery guest (mystery shopper) audits in hospitality, built by Za3fran Consulting. Available in English and French.

## Who it is for
${en.audience.items.map(i => `- ${i.t}: ${i.d}`).join('\n')}

## Key features
${en.features.items.map(i => `- ${i.t}: ${i.d}`).join('\n')}

## Pricing (14-day free trial, no credit card)
${plans}

## Pages
- [Home (English)](${SITE_URL}/en)
- [Accueil (français)](${SITE_URL}/)
- [Start a free trial](${SITE_URL}/signup)
- [Sign in](${SITE_URL}/login)

## Contact
${SUPPORT_EMAIL}

## FAQ
${faq}
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
