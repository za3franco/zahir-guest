import { requireUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import ScrollToTop from '@/components/ScrollToTop'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className={styles.shell}>
      <Sidebar user={user} />
      <main className={styles.main}>
        <ScrollToTop />
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
