import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Handle both JSON body and HTML form submission
  let archived = false
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    archived = formData.get('archived') === '1'
  } else {
    const body = await request.json().catch(() => ({}))
    archived = body.archived === '1' || body.archived === true
  }

  const { error } = await supabaseAdmin
    .from('properties')
    .update({ is_archived: archived })
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL('/properties', request.url))
}
