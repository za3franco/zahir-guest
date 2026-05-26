import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()

  const updateData: Record<string, any> = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.property_id !== undefined) updateData.property_id = body.property_id
  if (body.template_id !== undefined) updateData.template_id = body.template_id
  if (body.auditor_user_id !== undefined) updateData.auditor_user_id = body.auditor_user_id
  if (body.visit_window_start !== undefined) updateData.visit_window_start = body.visit_window_start
  if (body.visit_window_end !== undefined) updateData.visit_window_end = body.visit_window_end
  if (body.admin_notes !== undefined) updateData.admin_notes = body.admin_notes

  const { error } = await supabaseAdmin
    .from('campaigns')
    .update(updateData)
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
