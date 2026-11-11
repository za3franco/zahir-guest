import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { PHOTO_BUCKET, canViewPhotos, loadPhotoCampaign } from '@/lib/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Authenticated photo viewer: checks the visitor may see this campaign, then redirects to a short-lived signed URL.
// Photos are never public; reports and screens reference /api/photos/<id>.
export async function GET(_req: Request, { params }: { params: { photoId: string } }) {
  const user = await requireUser()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: photo } = await supabase.from('audit_photos').select('campaign_id, storage_path').eq('id', params.photoId).maybeSingle()
  if (!photo) return new NextResponse('Not found', { status: 404 })

  const campaign = await loadPhotoCampaign(supabase, photo.campaign_id)
  if (!campaign || !(await canViewPhotos(supabase, user, campaign))) return new NextResponse('Forbidden', { status: 403 })

  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 300)
  if (error || !data?.signedUrl) return new NextResponse('Unavailable', { status: 502 })

  const res = NextResponse.redirect(data.signedUrl, 302)
  res.headers.set('Cache-Control', 'private, max-age=240')
  return res
}
