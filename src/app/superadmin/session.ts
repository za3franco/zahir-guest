import { cache } from 'react'
import { requireSuperAdmin } from '@/lib/auth'
import { saLang } from '@/lib/superadminText'

/** The super admin of this request and their language, loaded once even when the layout and the page both ask. */
export const getSuperAdmin = cache(async () => {
  const admin = await requireSuperAdmin()
  return { admin, lang: saLang(admin) }
})
