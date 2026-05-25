import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import type { User } from '@/types'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Get authenticated user
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // Get user profile from our users table
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userProfile) {
    // User authenticated but no profile — account setup issue
    await supabase.auth.signOut()
    redirect('/login?error=no_profile')
  }

  return (
    <div className={styles.shell}>
      <Sidebar user={userProfile as User} />
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
