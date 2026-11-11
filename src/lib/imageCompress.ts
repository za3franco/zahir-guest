// Client-side: shrink a phone photo (often 4-10 MB) to a ~150-300 KB JPEG before upload.

async function loadSource(file: File): Promise<{ src: CanvasImageSource; width: number; height: number; close: () => void }> {
  // Preferred path: createImageBitmap (respects EXIF orientation in current browsers)
  try {
    const bmp = await createImageBitmap(file)
    return { src: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close?.() }
  } catch {
    // Fallback: <img> element (Safari iOS auto-orients images drawn to a canvas)
    const url = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('unreadable image'))
      i.src = url
    })
    return { src: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  }
}

export async function compressImage(file: File, maxSide = 1400, quality = 0.72): Promise<File> {
  const { src, width, height, close } = await loadSource(file)
  try {
    const scale = Math.min(1, maxSide / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(src, 0, 0, w, h)
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('compression failed')
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
  } finally {
    close()
  }
}
