import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { sendAuditorAssignedEmail } from '@/lib/emailNotifications'

export async function POST(request: Request) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      tenant_id: user.tenant_id,
      name: body.name,
      property_id: body.property_id,
      template_id: body.template_id,
      auditor_user_id: body.auditor_user_id ?? null,
      visit_window_start: body.visit_window_start ?? null,
      visit_window_end: body.visit_window_end ?? null,
      status: 'assigned',
      outlet_names: {},
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send auditor assignment email if auditor was assigned
  if (body.auditor_user_id) {
    try {
      const [{ data: auditor }, { data: property }] = await Promise.all([
        supabaseAdmin.from('users').select('name, email, default_language').eq('id', body.auditor_user_id).single(),
        supabaseAdmin.from('properties').select('name, city').eq('id', body.property_id).single(),
      ])

      if (auditor && property) {
        await sendAuditorAssignedEmail({
          auditorName: auditor.name,
          auditorEmail: auditor.email,
          campaignName: body.name,
          propertyName: property.name,
          propertyCity: property.city ?? null,
          visitWindowStart: body.visit_window_start ?? null,
          visitWindowEnd: body.visit_window_end ?? null,
          assignedByName: user.name,
          lang: auditor.default_language === 'en' ? 'en' : 'fr',
        })
      }
    } catch (emailErr) {
      console.error('Assignment email error:', emailErr)
      // Don't fail campaign creation if email fails
    }
  }

  return NextResponse.json({ id: data.id })
}
