import Image from 'next/image'
import Link from 'next/link'
import { COPY, FAQS, type Lang } from '@/lib/landingContent'
import { madPaymentsEnabled } from '@/lib/currency'
import { PLAN_NAMES, PRICE_GRID, type PlanTier } from '@/lib/plans'
import { DEMO_MAILTO, SITE_URL, SUPPORT_EMAIL } from '@/lib/site'
import LandingPricing from '@/components/pricing/LandingPricing'
import LandingNav from './LandingNav'
import styles from './landing.module.css'

// Layout rhythm (requested: never dark app screens on a dark page):
//   hero dark (light report page + phone stand out) → light sections for the product tour, audience,
//   pricing and FAQ → dark for features, steps, final call to action and footer.

function jsonLd(lang: Lang) {
  const url = lang === 'en' ? `${SITE_URL}/en` : SITE_URL
  const tiers: PlanTier[] = ['starter', 'professional', 'enterprise']
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
      offers: tiers.map(t => ({
        '@type': 'Offer',
        name: PLAN_NAMES[t][lang],
        price: String(PRICE_GRID.EUR[t].base),
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

function Phone({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className={styles.phone}>
      <Image src={src} alt={alt} width={640} height={1385} sizes="(max-width: 700px) 60vw, 300px" priority={priority} />
    </div>
  )
}

function Browser({ src, alt, width, height, address }: { src: string; alt: string; width: number; height: number; address: string }) {
  return (
    <div className={styles.browser}>
      <div className={styles.browserBar} aria-hidden="true">
        <span /><span /><span />
        <em>{address}</em>
      </div>
      <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 900px) 92vw, 640px" />
    </div>
  )
}

export default function LandingPage({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const base = lang === 'en' ? '/en' : ''
  const tour = c.tour

  return (
    <div className={styles.page} lang={lang}>
      {jsonLd(lang).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}

      <LandingNav lang={lang} labels={c.nav} />

      <main>
        {/* HERO — dark; the light report page and the phone give the contrast */}
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

            <div className={styles.heroVisual}>
              <div className={styles.heroPaper}>
                <Image
                  src="/landing/report-domains.webp"
                  alt={lang === 'en' ? 'Audit report: scores by domain and by type of standard' : "Rapport d'audit : scores par domaine et par type de standard"}
                  width={1200}
                  height={1235}
                  sizes="(max-width: 900px) 80vw, 460px"
                  priority
                />
              </div>
              <div className={styles.heroPhone}>
                <Phone src={`/landing/audit-${lang}.webp`} alt={lang === 'en' ? 'Mobile audit screen' : "Écran d'audit sur mobile"} priority />
              </div>
              <span className={styles.demoTag}>{tour.caption}</span>
            </div>
          </div>
        </section>

        {/* AUDIENCE — light */}
        <section className={`${styles.section} ${styles.light}`}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.audience.title}</h2>
            <div className={styles.grid4}>
              {c.audience.items.map(i => (
                <div key={i.t} className={styles.lightCard}>
                  <h3 className={styles.h3}>{i.t}</h3>
                  <p>{i.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT TOUR — white, real screens */}
        <section id="product" className={`${styles.section} ${styles.white}`}>
          <div className={styles.container}>
            <p className={`${styles.eyebrow} ${styles.eyebrowDark} ${styles.centerText}`}>{tour.eyebrow}</p>
            <h2 className={styles.h2}>{tour.title}</h2>
            <p className={styles.sectionSub}>{tour.sub}</p>

            {tour.items.map((item, i) => (
              <div key={item.t} className={`${styles.tourRow} ${i % 2 === 1 ? styles.tourRowReverse : ''}`}>
                <div className={styles.tourText}>
                  <span className={styles.tourNum}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={styles.tourTitle}>{item.t}</h3>
                  <p>{item.d}</p>
                  <ul className={styles.tick}>
                    {item.points.map(pt => <li key={pt}>{pt}</li>)}
                  </ul>
                </div>
                <div className={styles.tourVisual}>
                  {i === 0 && (
                    <div className={styles.phonePair}>
                      <Phone src={`/landing/audit-overview-${lang}.webp`} alt={lang === 'en' ? 'Audit progress overview' : "Vue d'ensemble de l'audit"} />
                      <Phone src={`/landing/audit-${lang}.webp`} alt={lang === 'en' ? 'Answering standards' : 'Réponse aux standards'} />
                    </div>
                  )}
                  {i === 1 && (
                    <div className={styles.paperStack}>
                      <div className={styles.paperBack}>
                        <Image src="/landing/report-cover.webp" alt={lang === 'en' ? 'Report cover' : 'Couverture du rapport'} width={900} height={1272} sizes="260px" />
                      </div>
                      <div className={styles.paperFront}>
                        <Image src="/landing/report-domains.webp" alt={lang === 'en' ? 'Score dashboard of the report' : 'Tableau de bord du rapport'} width={1200} height={1235} sizes="(max-width: 900px) 80vw, 460px" />
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <Browser
                      src={`/landing/analytics-${lang}.webp`}
                      alt={lang === 'en' ? 'Portfolio analytics' : 'Analyses du portefeuille'}
                      width={1600}
                      height={1075}
                      address="zahirguest.com/dashboard/analytics"
                    />
                  )}
                  <p className={styles.caption}>{tour.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES — dark */}
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

        {/* HOW — dark */}
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

        {/* PRICING — light */}
        <section id="pricing" className={`${styles.section} ${styles.light}`}>
          <div className={styles.container}>
            <h2 className={styles.h2}>{c.pricing.title}</h2>
            <p className={styles.sectionSub}>{c.pricing.sub}</p>
            <LandingPricing lang={lang} madEnabled={madPaymentsEnabled()} demoHref={DEMO_MAILTO(lang)} />
          </div>
        </section>

        {/* FAQ — white */}
        <section id="faq" className={`${styles.section} ${styles.white}`}>
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

        {/* FINAL CTA — dark */}
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
            <a href={`${base}#product`}>{tour.eyebrow}</a>
            <a href={`${base}#features`}>{c.nav.features}</a>
            <a href={`${base}#pricing`}>{c.nav.pricing}</a>
            <a href={`${base}#faq`}>{c.nav.faq}</a>
            <Link href="/login">{c.nav.login}</Link>
          </div>
          <div>
            <p className={styles.footHead}>{c.footer.contact}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <a href={DEMO_MAILTO(lang)}>{c.hero.cta2}</a>
            <Link href={lang === 'en' ? '/en/privacy' : '/privacy'}>{lang === 'en' ? 'Privacy policy' : 'Confidentialité'}</Link>
            <Link href={lang === 'en' ? '/en/terms' : '/terms'}>{lang === 'en' ? 'Terms' : 'Conditions générales'}</Link>
          </div>
        </div>
        <p className={styles.copy}>© {new Date().getFullYear()} Zahir Guest · {c.footer.by}. {c.footer.rights}</p>
      </footer>
    </div>
  )
}
