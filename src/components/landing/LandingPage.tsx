import Link from 'next/link'
import { COPY, FAQS, PLAN_COPY, type Lang } from '@/lib/landingContent'
import { DEMO_MAILTO, SITE_URL, SUPPORT_EMAIL } from '@/lib/site'
import LandingNav from './LandingNav'
import styles from './landing.module.css'

const SAMPLE_SCORES = [92, 84, 78, 81]

function ScoreRing({ value }: { value: number }) {
  const r = 54
  const c = 2 * Math.PI * r
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`${value}%`}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(244,241,236,0.1)" strokeWidth="9" />
      <circle cx="66" cy="66" r={r} fill="none" stroke="#C8A45A" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 66 66)" />
      <text x="66" y="64" textAnchor="middle" fill="#F4F1EC" fontSize="30" fontFamily="Cormorant Garamond, serif">{value}%</text>
    </svg>
  )
}

function jsonLd(lang: Lang) {
  const url = lang === 'en' ? `${SITE_URL}/en` : SITE_URL
  const plans = PLAN_COPY(lang)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Zahir Guest',
      url: SITE_URL,
      parentOrganization: { '@type': 'Organization', name: 'Za3fran Consulting' },
      contactPoint: { '@type': 'ContactPoint', email: SUPPORT_EMAIL, contactType: 'customer support', availableLanguage: ['French', 'English'] },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Zahir Guest',
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: lang,
      description: COPY[lang].metaDescription,
      offers: plans.map(p => ({
        '@type': 'Offer',
        name: p.name,
        price: String(p.monthlyEur),
        priceCurrency: 'EUR',
        url: `${SITE_URL}/signup`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS[lang].map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
}

export default function LandingPage({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const plans = PLAN_COPY(lang)
  const base = lang === 'en' ? '/en' : ''

  return (
    <div className={styles.page} lang={lang}>
      {jsonLd(lang).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}

      <LandingNav lang={lang} labels={c.nav} />

      <main>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>{c.hero.eyebrow}</p>
              <h1 className={styles.h1}>{c.hero.title}</h1>
              <p className={styles.lead}>{c.hero.sub}</p>
              <div className={styles.ctaRow}>
                <Link href="/signup" className={styles.btnPrimary}>{c.hero.cta}</Link>
                <a href={DEMO_MAILTO(lang)} className={styles.btnGhost}>{c.hero.cta2}</a>
              </div>
              <p className={styles.note}>{c.hero.note}</p>
            </div>

            <div className={styles.mock} aria-hidden="true">
              <div className={styles.mockHead}>
                <span>{c.preview.label}</span>
                <span className={styles.mockTag}>{c.preview.caption}</span>
              </div>
              <div className={styles.mockBody}>
                <div className={styles.mockScore}>
                  <ScoreRing value={84} />
                  <span>{c.preview.score}</span>
                </div>
                <div className={styles.mockBars}>
                  {c.preview.domains.map((d, i) => (
                    <div key={d} className={styles.mockBar}>
                      <div className={styles.mockBarTop}><span>{d}</span><span>{SAMPLE_SCORES[i]}%</span></div>
                      <div className={styles.mockTrack}><div style={{ width: `${SAMPLE_SCORES[i]}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.audience.title}</h2>
            <div className={styles.grid3}>
              {c.audience.items.map(i => (
                <div key={i.t} className={styles.card}>
                  <h3 className={styles.h3}>{i.t}</h3>
                  <p>{i.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className={`${styles.section} ${styles.alt}`}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.features.title}</h2>
            <p className={styles.sectionSub}>{c.features.sub}</p>
            <div className={styles.grid3}>
              {c.features.items.map((f, i) => (
                <article key={f.t} className={styles.feature}>
                  <span className={styles.featureNum}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={styles.h3}>{f.t}</h3>
                  <p>{f.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.how.title}</h2>
            <ol className={styles.steps}>
              {c.how.steps.map((s, i) => (
                <li key={s.t}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <h3 className={styles.h3}>{s.t}</h3>
                  <p>{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className={`${styles.section} ${styles.alt}`}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.pricing.title}</h2>
            <p className={styles.sectionSub}>{c.pricing.sub}</p>
            <div className={styles.grid3}>
              {plans.map(p => {
                const featured = p.tier === 'professional'
                const enterprise = p.tier === 'enterprise'
                return (
                  <div key={p.tier} className={`${styles.plan} ${featured ? styles.planFeatured : ''}`}>
                    {featured && <span className={styles.badge}>{c.pricing.popular}</span>}
                    <h3 className={styles.planName}>{p.name}</h3>
                    <p className={styles.price}>
                      {enterprise && <small>{c.pricing.enterpriseNote} </small>}
                      €{p.monthlyEur}<small>{c.pricing.monthly}</small>
                    </p>
                    <p className={styles.annual}>
                      {p.annualEur && p.annualPerMonthEur ? c.pricing.annualNote(p.annualEur, p.annualPerMonthEur) : ' '}
                    </p>
                    <ul>
                      {p.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    {enterprise ? (
                      <a href={DEMO_MAILTO(lang)} className={styles.btnGhost}>{c.pricing.enterpriseCta}</a>
                    ) : (
                      <Link href="/signup" className={featured ? styles.btnPrimary : styles.btnGhost}>{c.pricing.cta}</Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={styles.section}>
          <div className={`${styles.container} ${styles.narrow}`}>
            <h2 className={styles.h2}>{c.faqTitle}</h2>
            <div className={styles.faq}>
              {FAQS[lang].map(f => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.finalCta}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.finalCta.title}</h2>
            <p className={styles.sectionSub}>{c.finalCta.sub}</p>
            <div className={`${styles.ctaRow} ${styles.center}`}>
              <Link href="/signup" className={styles.btnPrimary}>{c.finalCta.cta}</Link>
              <a href={DEMO_MAILTO(lang)} className={styles.btnGhost}>{c.finalCta.cta2}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div>
            <p className={styles.footBrand}>Zahir Guest</p>
            <p className={styles.footTag}>{c.footer.tagline}</p>
          </div>
          <div>
            <p className={styles.footHead}>{c.footer.product}</p>
            <a href={`${base}#features`}>{c.nav.features}</a>
            <a href={`${base}#pricing`}>{c.nav.pricing}</a>
            <a href={`${base}#faq`}>{c.nav.faq}</a>
            <Link href="/login">{c.nav.login}</Link>
          </div>
          <div>
            <p className={styles.footHead}>{c.footer.contact}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <a href={DEMO_MAILTO(lang)}>{c.hero.cta2}</a>
          </div>
        </div>
        <p className={styles.copy}>© {new Date().getFullYear()} Zahir Guest · {c.footer.by}. {c.footer.rights}</p>
      </footer>
    </div>
  )
}
