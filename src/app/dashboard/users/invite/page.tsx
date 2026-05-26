export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import InviteForm from './_components/InviteForm'

export default async function InviteUserPage() {
  const user = await requireUser()
  return <InviteForm user={user} />
}
