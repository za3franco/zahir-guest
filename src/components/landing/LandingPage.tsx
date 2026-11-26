import Image from 'next/image'
import Link from 'next/link'
import { COPY, FAQS, MAISON, type Lang } from '@/lib/landingContent'
import { madPaymentsEnabled } from '@/lib/currency'
import { PLAN_NAMES, PRICE_GRID, type PlanTier } from '@/lib/plans'
import { CONTACT_HREF, SITE_URL, SUPPORT_EMAIL } from '@/lib/site'
import LandingPricing from '@/components/pricing/LandingPricing'
import LandingNav from './LandingNav'
import { PhoneAudit, PortfolioBrowser, ReportCover, ReportSheet } from './AppVignettes'
import { ZIcon, ZahirMark, type IconName } from '@/components/icons/ZahirIcons'
import styles from './landing.module.css'

// « Maison » direction (26 Nov 2026), same family as Za3fran.io: ivory ground, ink text, copper used sparingly,
// hairlines instead of cards, real photography. Journey: hero → two doors (hotels / audit firms) → one visit in
// three moments → the product screen by screen → sample report → features → founders → pricing → FAQ → final call.

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

const FEATURE_ICONS: IconName[] = ['keyhole', 'notebook', 'curve', 'seal', 'facade', 'badge']

export default function LandingPage({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const m = MAISON[lang]
  const base = lang === 'en' ? '/en' : ''
  const tour = c.tour
  const visuals = [<PhoneAudit key="p" lang={lang} />, <ReportCover key="r" lang={lang} />, <PortfolioBrowser key="b" lang={lang} />]

  return (
    <div className={styles.page} lang={lang}>
      {jsonLd(lang).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}

      <LandingNav lang={lang} labels={c.nav} />

      <main>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.wrap}>
            <p className={styles.kicker}>{c.hero.eyebrow}</p>
            <h1 className={styles.h1}>{c.hero.title}</h1>
            <div className={styles.heroRow}>
              <p className={styles.lead}>{c.hero.sub}</p>
              <div className={styles.heroActions}>
                <div className={styles.ctas}>
                  <a href="#exemple" className={styles.btn}>{m.heroCta}</a>
                  <Link href="/signup" className={`${styles.btn} ${styles.ghost}`}>{m.heroCta2}</Link>
                </div>
                <p className={styles.note}>{c.hero.note}</p>
              </div>
            </div>
            <figure className={styles.heroImg}>
              <Image src="/landing/visite.webp" alt={m.heroAlt} width={1448} height={1086} sizes="(max-width: 1280px) 100vw, 1200px" priority />
              <figcaption className={styles.fiche}>
                <span className={styles.ficheLabel}>{m.note.label}</span>
                {m.note.text}
                <span className={styles.ficheTag}>{m.note.tag}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* TWO DOORS */}
        <section className={styles.doorsSec}>
          <div className={`${styles.wrap} ${styles.doors}`}>
            {m.doors.map(d => (
              <div key={d.id} id={d.id} className={styles.door}>
                <p className={styles.kicker}>{d.kicker}</p>
                <h2 className={styles.doorTitle}>{d.title}</h2>
                <p className={styles.body}>{d.d}</p>
                <ul className={styles.list}>{d.points.map(p => <li key={p}>{p}</li>)}</ul>
                {d.href === 'signup'
                  ? <Link href="/signup" className={styles.go}>{d.cta} →</Link>
                  : <a href={CONTACT_HREF(lang, 'landing-firms')} className={styles.go}>{d.cta} →</a>}
              </div>
            ))}
          </div>
        </section>

        {/* ONE VISIT, THREE MOMENTS */}
        <section id="how" className={styles.sec}>
          <div className={styles.wrap}>
            <div className={styles.headRow}>
              <p className={styles.kicker}>{m.times.kicker}</p>
              <h2 className={styles.h2}>{m.times.title}</h2>
            </div>
            <div className={styles.times}>
              {m.times.items.map((t, i) => (
                <div key={t.t} className={styles.time}>
                  <ZIcon name={(['calendar', 'keyhole', 'seal'] as IconName[])[i]} size={40} />
                  <p className={styles.when}>{t.when}</p>
                  <h3 className={styles.h3}>{t.t}</h3>
                  <p className={styles.body}>{t.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT, SCREEN BY SCREEN */}
        <section id="product" className={`${styles.sec} ${styles.tint}`}>
          <div className={styles.wrap}>
            <div className={styles.headRow}>
              <p className={styles.kicker}>{tour.eyebrow}</p>
              <div>
                <h2 className={styles.h2}>{tour.title}</h2>
                <p className={styles.sub}>{tour.sub}</p>
              </div>
            </div>
            {tour.items.map((item, i) => (
              <div key={item.t} className={`${styles.tourRow} ${i % 2 === 1 ? styles.tourRev : ''}`}>
                <div className={styles.tourText}>
                  <p className={styles.when}>{String(i + 1).padStart(2, '0')}</p>
                  <h3 className={styles.tourTitle}>{item.t}</h3>
                  <p className={styles.body}>{item.d}</p>
                  <ul className={styles.list}>{item.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
                </div>
                <div className={styles.tourVisual}>
                  {visuals[i]}
                  <p className={styles.caption}>{tour.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SAMPLE REPORT */}
        <section id="exemple" className={styles.sec}>
          <div className={`${styles.wrap} ${styles.split}`}>
            <div>
              <p className={styles.kicker}>{m.example.kicker}</p>
              <h2 className={styles.h2}>{m.example.title}</h2>
              <p className={styles.body}>{m.example.d}</p>
              <Link href="/signup" className={styles.go}>{m.example.cta} →</Link>
            </div>
            <ReportSheet lang={lang} />
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className={`${styles.sec} ${styles.tint}`}>
          <div className={styles.wrap}>
            <div className={styles.headRow}>
              <p className={styles.kicker}>{m.featuresKicker}</p>
              <div>
                <h2 className={styles.h2}>{c.features.title}</h2>
                <p className={styles.sub}>{c.features.sub}</p>
              </div>
            </div>
            <div className={styles.features}>
              {c.features.items.map((f, i) => (
                <article key={f.t} className={styles.feature}>
                  <ZIcon name={FEATURE_ICONS[i] ?? 'ledger'} size={32} />
                  <div>
                    <h3 className={styles.featureTitle}>{f.t}</h3>
                    <p className={styles.body}>{f.d}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FOUNDERS */}
        <section className={styles.sec}>
          <div className={styles.wrap}>
            <div className={styles.split}>
              <figure className={styles.photo}>
                <Image src="/landing/fondateurs.webp" alt="" width={1400} height={788} sizes="(max-width: 900px) 100vw, 600px" />
              </figure>
              <div>
                <p className={styles.kicker}>{m.founders.kicker}</p>
                <h2 className={styles.h2}>{m.founders.title}</h2>
                <p className={styles.body}>{m.founders.d}</p>
                <a href="https://www.za3fran.io" className={styles.go}>{m.founders.link} →</a>
              </div>
            </div>
            <div className={styles.people}>
              {m.founders.people.map(p => (
                <div key={p.name} className={styles.person}>
                  <Image src={p.photo} alt={p.name} width={160} height={160} className={styles.personImg} />
                  <div>
                    <h3 className={styles.personName}>{p.name}</h3>
                    <p className={styles.personRole}>{p.role}</p>
                    <p className={styles.body}>{p.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className={`${styles.sec} ${styles.tint}`}>
          <div className={styles.wrap}>
            <div className={styles.headRow}>
              <p className={styles.kicker}>{c.nav.pricing}</p>
              <div>
                <h2 className={styles.h2}>{c.pricing.title}</h2>
                <p className={styles.sub}>{c.pricing.sub}</p>
              </div>
            </div>
            <LandingPricing lang={lang} madEnabled={madPaymentsEnabled()} demoHref={CONTACT_HREF(lang, 'pricing')} />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={styles.sec}>
          <div className={styles.wrap}>
            <div className={styles.headRow}>
              <p className={styles.kicker}>FAQ</p>
              <h2 className={styles.h2}>{c.faqTitle}</h2>
            </div>
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

        {/* FINAL CALL */}
        <section className={styles.final}>
          <div className={`${styles.wrap} ${styles.finalInner}`}>
            <div>
              <h2 className={styles.finalTitle}>{c.finalCta.title}</h2>
              <p className={styles.finalSub}>{c.finalCta.sub}</p>
            </div>
            <div className={styles.ctas}>
              <Link href="/signup" className={`${styles.btn} ${styles.btnLight}`}>{c.finalCta.cta}</Link>
              <a href={CONTACT_HREF(lang)} className={`${styles.btn} ${styles.ghostLight}`}>{c.finalCta.cta2}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footGrid}`}>
          <div>
            <p className={styles.footBrand}><ZahirMark size={26} /> Zahir Guest</p>
            <p className={styles.footTag}>{c.footer.tagline}</p>
          </div>
          <div>
            <p className={styles.footHead}>{c.footer.product}</p>
            <a href={`${base}#product`}>{tour.eyebrow}</a>
            <a href={`${base}#exemple`}>{c.nav.example}</a>
            <a href={`${base}#pricing`}>{c.nav.pricing}</a>
            <a href={`${base}#faq`}>{c.nav.faq}</a>
            <Link href="/login">{c.nav.login}</Link>
          </div>
          <div>
            <p className={styles.footHead}>{c.footer.contact}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <a href={CONTACT_HREF(lang)}>{c.hero.cta2}</a>
            <a href="https://www.za3fran.io">Za3fran.io</a>
          </div>
          <div>
            <p className={styles.footHead}>{lang === 'en' ? 'Legal' : 'Légal'}</p>
            <Link href={lang === 'en' ? '/en/privacy' : '/privacy'}>{lang === 'en' ? 'Privacy policy' : 'Confidentialité'}</Link>
            <Link href={lang === 'en' ? '/en/terms' : '/terms'}>{lang === 'en' ? 'Terms' : 'Conditions générales'}</Link>
          </div>
        </div>
        <p className={`${styles.wrap} ${styles.copy}`}>© {new Date().getFullYear()} Zahir Guest · {c.footer.by}. {c.footer.rights}</p>
      </footer>
    </div>
  )
}
