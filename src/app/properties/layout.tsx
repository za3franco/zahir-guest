import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import type { User } from '@/types'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()
  if (!userProfile) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={userProfile as User} />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width)', padding: '2.5rem', maxWidth: 1200 }}>
        <div style={{ animation: 'fadeUp 0.35s ease forwards' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
