import Link from 'next/link'
import { PRIVACY, TERMS, type Lang } from '@/lib/legalContent'
import styles from './legal.module.css'

export default function LegalPage({ kind, lang }: { kind: 'privacy' | 'terms'; lang: Lang }) {
  const doc = (kind === 'privacy' ? PRIVACY : TERMS)[lang]
  const home = lang === 'en' ? '/en' : '/'
  const other = kind === 'privacy' ? 'terms' : 'privacy'
  const prefix = lang === 'en' ? '/en' : ''
  const L = lang === 'en'
    ? { back: '← Back to Zahir Guest', other: other === 'terms' ? 'Terms of use and sale' : 'Privacy policy', switch: 'Français', login: 'Sign in' }
    : { back: '← Retour à Zahir Guest', other: other === 'terms' ? "Conditions générales" : 'Politique de confidentialité', switch: 'English', login: 'Se connecter' }
  const switchHref = lang === 'en' ? `/${kind}` : `/en/${kind}`
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={home} className={styles.brand}>Zahir Guest</Link>
        <nav className={styles.nav}>
          <Link href={switchHref} hrefLang={lang === 'en' ? 'fr' : 'en'}>{L.switch}</Link>
          <Link href="/login">{L.login}</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Link href={home} className={styles.back}>{L.back}</Link>
        <h1 className={styles.title}>{doc.title}</h1>
        <p className={styles.intro}>{doc.intro}</p>
        {doc.sections.map(s => (
          <section key={s.h} className={styles.section}>
            <h2>{s.h}</h2>
            {s.p.map((t, i) => <p key={i}>{t}</p>)}
          </section>
        ))}
        <p className={styles.other}><Link href={`${prefix}/${other}`}>{L.other} →</Link></p>
      </main>
    </div>
  )
}
