import { requireUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
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
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
