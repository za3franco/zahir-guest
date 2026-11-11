import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { brandingFromTenant, HEX_RE } from '@/lib/branding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 1024 * 1024
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

// Saves brand name, accent colour and logo (multipart form). Plan must include white-label.
export async function POST(request: Request) {
  const user = await requireUser()
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_tier, subscription_status, branding_config')
    .eq('id', user.tenant_id)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  if (!brandingFromTenant(tenant).whiteLabel) {
    return NextResponse.json(
      {
        error: msg(
          'White-label branding is available on the Professional and Enterprise plans.',
          'La marque blanche est disponible avec les forfaits Professional et Enterprise.'
        ),
        code: 'plan_limit',
      },
      { status: 402 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const brandName = String(form.get('brand_name') ?? '').trim().slice(0, 80)
  const color = String(form.get('primary_color') ?? '').trim()
  const removeLogo = form.get('remove_logo') === '1'
  const file = form.get('logo')

  if (color && !HEX_RE.test(color)) {
    return NextResponse.json({ error: msg('Invalid colour (use #RRGGBB).', 'Couleur invalide (format #RRGGBB).') }, { status: 400 })
  }

  const cfg: Record<string, any> = { ...(tenant.branding_config ?? {}) }
  if (brandName) cfg.brand_name = brandName
  else delete cfg.brand_name
  if (color) cfg.primary_color = color
  else delete cfg.primary_color

  if (file instanceof File && file.size > 0) {
    const ext = EXT[file.type]
    if (!ext) {
      return NextResponse.json({ error: msg('Logo must be PNG, JPG or WebP.', 'Le logo doit être au format PNG, JPG ou WebP.') }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: msg('Logo must be under 1 MB.', 'Le logo doit faire moins de 1 Mo.') }, { status: 400 })
    }
    const path = `${user.tenant_id}/logo-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('tenant-logos')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (upErr) {
      console.error('[branding] upload failed:', upErr.message)
      return NextResponse.json({ error: msg('Logo upload failed.', "Échec de l'envoi du logo.") }, { status: 500 })
    }
    cfg.logo_url = supabase.storage.from('tenant-logos').getPublicUrl(path).data.publicUrl
  } else if (removeLogo) {
    delete cfg.logo_url
  }

  const { error } = await supabase.from('tenants').update({ branding_config: cfg }).eq('id', user.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, logo_url: cfg.logo_url ?? null })
}
