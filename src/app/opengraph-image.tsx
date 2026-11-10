import { ImageResponse } from 'next/og'

export const alt = 'Zahir Guest — Mystery guest audit platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0D1B2A', color: '#F4F1EC' }}>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', color: '#C8A45A' }}>Zahir Guest</div>
        <div style={{ display: 'flex', fontSize: 84, lineHeight: 1.05, marginTop: 28, fontFamily: 'serif' }}>Reveal what cannot be unseen.</div>
        <div style={{ display: 'flex', fontSize: 30, color: '#9B9488', marginTop: 36 }}>Mystery guest audit platform for hospitality</div>
        <div style={{ display: 'flex', width: 120, height: 4, background: '#C8A45A', marginTop: 48 }} />
      </div>
    ),
    size
  )
}
