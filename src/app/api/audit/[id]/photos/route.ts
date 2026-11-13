import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { canWorkOnAudit } from '@/lib/auditAccess'
import {
  PHOTO_BUCKET, PHOTO_MIME, MAX_UPLOAD_BYTES, MAX_PHOTOS_PER_CAMPAIGN, MAX_PHOTOS_PER_STANDARD,
  canEditPhotos, loadPhotoCampaign,
} from '@/lib/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Add a photo to a standard (multipart: standard_id + file [+ photo_id]). The browser already shrinks the image.
// photo_id (created on the phone, offline mode) makes the upload safe to repeat: a photo already received is not
// stored twice.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const campaign = await loadPhotoCampaign(supabase, params.id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (!canWorkOnAudit(user, campaign)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canEditPhotos(user, campaign)) return NextResponse.json({ error: 'Audit is closed', code: 'audit_closed' }, { status: 409 })

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const standardId = String(form.get('standard_id') ?? '')
  const file = form.get('file')
  const photoId = String(form.get('photo_id') ?? '')
  if (photoId && !UUID.test(photoId)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // Repeated upload of a photo already received (the phone did not get the answer the first time)
  if (photoId) {
    const { data: existing } = await supabase.from('audit_photos').select('id, campaign_id').eq('id', photoId).maybeSingle()
    if (existing) {
      if (existing.campaign_id !== campaign.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      return NextResponse.json({ ok: true, id: existing.id, already: true })
    }
  }
  if (!standardId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ext = PHOTO_MIME[file.type]
  if (!ext) return NextResponse.json({ error: msg('Photo must be JPG, PNG or WebP.', 'La photo doit être au format JPG, PNG ou WebP.') }, { status: 400 })
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: msg('Photo is too large.', 'La photo est trop volumineuse.') }, { status: 413 })

  // The standard must belong to this campaign's questionnaire; its section is stored with the photo
  const { data: standard } = await supabase.from('template_standards').select('id, section_id').eq('id', standardId).maybeSingle()
  if (!standard) return NextResponse.json({ error: 'Unknown standard' }, { status: 400 })
  const { data: section } = await supabase.from('template_sections').select('id, domain_id').eq('id', standard.section_id).maybeSingle()
  const { data: domain } = section
    ? await supabase.from('template_domains').select('template_id').eq('id', section.domain_id).maybeSingle()
    : { data: null }
  if (!domain || domain.template_id !== campaign.template_id) {
    return NextResponse.json({ error: 'Standard does not belong to this audit' }, { status: 400 })
  }

  const { count: total } = await supabase.from('audit_photos').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id)
  if ((total ?? 0) >= MAX_PHOTOS_PER_CAMPAIGN) {
    return NextResponse.json({ error: msg(`Maximum ${MAX_PHOTOS_PER_CAMPAIGN} photos per audit.`, `Maximum ${MAX_PHOTOS_PER_CAMPAIGN} photos par audit.`) }, { status: 400 })
  }
  const { count: forStandard } = await supabase.from('audit_photos').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('standard_id', standardId)
  if ((forStandard ?? 0) >= MAX_PHOTOS_PER_STANDARD) {
    return NextResponse.json({ error: msg(`Maximum ${MAX_PHOTOS_PER_STANDARD} photos per standard.`, `Maximum ${MAX_PHOTOS_PER_STANDARD} photos par standard.`) }, { status: 400 })
  }

  const id = photoId || crypto.randomUUID()
  const path = `${campaign.tenant_id}/${campaign.id}/${id}.${ext}`
  // upsert: a repeated upload whose first attempt stored the file but not the row overwrites it
  const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true })
  if (upErr) {
    console.error('[photos] upload failed:', upErr.message)
    return NextResponse.json({ error: msg('Upload failed. Please try again.', "Échec de l'envoi. Veuillez réessayer.") }, { status: 500 })
  }

  const { data: row, error } = await supabase
    .from('audit_photos')
    .insert({ id, campaign_id: campaign.id, section_id: standard.section_id, standard_id: standardId, storage_path: path })
    .select('id')
    .single()
  if (error || !row) {
    // Two copies of the same upload arriving together: the other one created the row
    if (photoId && error?.code === '23505') return NextResponse.json({ ok: true, id, already: true })
    await supabase.storage.from(PHOTO_BUCKET).remove([path])
    return NextResponse.json({ error: error?.message ?? 'Could not save photo' }, { status: 500 })
  }

  // Same behaviour as answering: the audit starts when the first data comes in
  if (campaign.status === 'assigned') await supabase.from('campaigns').update({ status: 'in_progress' }).eq('id', campaign.id).eq('status', 'assigned')

  return NextResponse.json({ ok: true, id: row.id })
}

// Remove a photo: /api/audit/[id]/photos?photo_id=...
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const photoId = new URL(request.url).searchParams.get('photo_id') ?? ''

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const campaign = await loadPhotoCampaign(supabase, params.id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (!canWorkOnAudit(user, campaign)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canEditPhotos(user, campaign)) return NextResponse.json({ error: 'Audit is closed', code: 'audit_closed' }, { status: 409 })

  if (!UUID.test(photoId)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { data: photo } = await supabase.from('audit_photos').select('id, storage_path').eq('id', photoId).eq('campaign_id', campaign.id).maybeSingle()
  // Already removed (e.g. a deletion queued offline and sent twice): nothing left to do
  if (!photo) return NextResponse.json({ ok: true, already: true })

  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path])
  const { error } = await supabase.from('audit_photos').delete().eq('id', photo.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
