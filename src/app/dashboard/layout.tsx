import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Sidebar from '@/components/layout/Sidebar'
import type { User } from '@/types'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  // Log cookie names for debugging
  console.log('[dashboard/layout] cookies present:', allCookies.map(c => c.name))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Can't set cookies in Server Component layouts
        },
      },
    }
  )

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  console.log('[dashboard/layout] authUser:', authUser?.id ?? 'null', 'error:', authError?.message ?? 'none')

  if (!authUser) {
    console.log('[dashboard/layout] no user — redirecting to login')
    redirect('/login')
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  console.log('[dashboard/layout] userProfile:', userProfile?.email ?? 'null', 'error:', profileError?.message ?? 'none')

  if (!userProfile) {
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
