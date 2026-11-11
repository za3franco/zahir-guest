import { requireSuperAdmin } from '@/lib/auth'
import styles from './superadmin.module.css'
import SuperAdminTabs from './SuperAdminTabs'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin()
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brand}>Zahir Guest</span>
          <span className={styles.badge}>Platform</span>
          <SuperAdminTabs />
        </div>
        <div className={styles.headerRight}>
          <span className={styles.who}>{admin.email}</span>
          <a href="/dashboard" className={styles.backLink}>← Dashboard</a>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
