import styles from './superadmin.module.css'
import SuperAdminTabs from './SuperAdminTabs'
import SuperAdminLang from './SuperAdminLang'
import { getSuperAdmin } from './session'
import { SA } from '@/lib/superadminText'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, lang } = await getSuperAdmin()
  const t = SA[lang]
  return (
    <div className={styles.shell} lang={lang}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brand}>Zahir Guest</span>
          <span className={styles.badge}>{t.platform}</span>
          <SuperAdminTabs lang={lang} />
        </div>
        <div className={styles.headerRight}>
          <span className={styles.who}>{admin.email}</span>
          <SuperAdminLang lang={lang} />
          <a href="/dashboard" className={styles.backLink}>{t.backToDashboard}</a>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
