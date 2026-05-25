import { requireUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        padding: '2.5rem',
        maxWidth: 1200,
        animation: 'fadeUp 0.35s ease forwards'
      }}>
        {children}
      </main>
    </div>
  )
}
