// Zahir Guest pictograms: objects of the trade (ledger, keyhole, notebook, sealed report…) drawn on a 32 grid,
// thin square-cut stroke in the current text colour, and one brass dot per icon (the detail the auditor notices).
// Replaces the generic Feather-style icons.

type IconProps = { size?: number; dot?: boolean; title?: string }

function Base({ d, cx, cy, size = 20, dot = true, title }: IconProps & { d: string; cx: number; cy: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={size <= 22 ? 1.7 : 1.35}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={d} />
      {dot && <circle cx={cx} cy={cy} r={1.9} fill="var(--color-gold)" stroke="none" />}
    </svg>
  )
}

export const ICON_PATHS = {
  ledger: { d: 'M16 9v19M16 9C13 7 8 7 4 8v19c4-1 9-1 12 1 3-2 8-2 12-1V8c-4-1-9-1-12 1z', cx: 22, cy: 15 },
  calendar: { d: 'M5 7h22v20H5zM10 4v6M22 4v6M5 13h22', cx: 21, cy: 21 },
  keyhole: { d: 'M8 28V14a8 8 0 0 1 16 0v14zM16 20v4', cx: 16, cy: 18 },
  notebook: { d: 'M9 4h17v24H9zM6 8h5M6 13h5M6 18h5M6 23h5M14 10h8M14 15h8M14 20h5', cx: 22, cy: 24 },
  curve: { d: 'M4 26h24M8 26v-2M14 26v-2M20 26v-2M26 26v-2M5 21l6-6 5 3 10-10', cx: 26, cy: 8 },
  card: { d: 'M4 9h24v15H4zM8 19a3 3 0 1 1 6 0M17 14h7M17 18h5', cx: 11, cy: 14 },
  facade: { d: 'M3 28h26M7 28V12h18v16M5 12l11-6 11 6M13 28v-6a3 3 0 0 1 6 0v6M9 16h3M20 16h3', cx: 16, cy: 9 },
  seal: { d: 'M7 3h13l5 5v21H7zM20 3v5h5M12 9h5M12 13h8M14 23l-1 5M18 23l1 5M20 20a4 4 0 1 1-8 0a4 4 0 1 1 8 0', cx: 16, cy: 20 },
  badge: { d: 'M7 6h18v22H7zM13 9h6M11 25a5 5 0 0 1 10 0M19 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0', cx: 21, cy: 10 },
  bell: { d: 'M4 25h24M7 25a9 9 0 0 1 18 0M16 16v-4M13 12h6', cx: 20, cy: 21 },
  key: { d: 'M15 11a5 5 0 1 1-10 0a5 5 0 1 1 10 0M14 14l12 12M21 21l3-3M24 24l2-2', cx: 10, cy: 11 },
  cloche: { d: 'M4 25h24M6 25a10 10 0 0 1 20 0M14 13h4', cx: 16, cy: 11 },
  camera: { d: 'M4 10h24v16H4zM11 10l2-3h6l2 3M20 18a4 4 0 1 1-8 0a4 4 0 1 1 8 0', cx: 24, cy: 14 },
  flag: { d: 'M8 29V4M8 6h17l-4 5 4 5H8', cx: 8, cy: 29 },
  receipt: { d: 'M8 3h16v26l-3-2-2 2-3-2-3 2-2-2-3 2zM12 9h8M12 13h8M12 17h5', cx: 20, cy: 22 },
  stamp: { d: 'M13 4h6v8h-6zM8 12h16v6H8zM6 22h20M6 27h20', cx: 16, cy: 15 },
  door: { d: 'M6 4h14v24H6zM13 16h1M20 16h9M25 12l4 4-4 4', cx: 13, cy: 16 },
  envelope: { d: 'M4 8h24v17H4zM4 8l12 10 12-10', cx: 24, cy: 22 },
  // Establishment types
  hotel: { d: 'M7 28V5h18v23M3 28h26M11 9h2M19 9h2M11 14h2M19 14h2M11 19h2M19 19h2M14 28v-5h4v5', cx: 21, cy: 24 },
  riad: { d: 'M4 28V9h24v19M3 28h26M4 9l2-3h20l2 3M12 28v-7a4 4 0 0 1 8 0v7M8 13h3M21 13h3', cx: 16, cy: 14 },
  resort: { d: 'M12 26V14M12 14c-3-4-7-4-9-2M12 14c3-4 7-4 9-2M12 14c-1-5 1-8 4-9M3 28c3-2 5-2 8 0s5 2 8 0 5-2 8 0', cx: 25, cy: 8 },
  guesthouse: { d: 'M5 14l11-9 11 9M8 12v16h16V12M14 28v-6h4v6M3 28h26M19 16h2', cx: 11, cy: 17 },
  apartment: { d: 'M8 28V4h16v24M3 28h26M8 10h16M8 16h16M8 22h16M14 28v-3h4v3', cx: 20, cy: 7 },
  pavilion: { d: 'M3 28h26M7 28V13M25 28V13M5 13h22M5 13l11-7 11 7M12 28v-6a4 4 0 0 1 8 0v6', cx: 16, cy: 10 },
} as const

export type IconName = keyof typeof ICON_PATHS

export function ZIcon({ name, ...rest }: IconProps & { name: IconName }) {
  const p = ICON_PATHS[name]
  return <Base d={p.d} cx={p.cx} cy={p.cy} {...rest} />
}

/** The Zahir Guest mark: an arch (the door of the house) with a keyhole, the brass dot where the eye goes. */
export function ZahirMark({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.4" aria-hidden="true" focusable="false">
      <path d="M6 29V14a10 10 0 0 1 20 0v15" />
      <path d="M10 29V15a6 6 0 0 1 12 0v14" />
      <path d="M16 21v3" />
      <path d="M3 29h26" />
      <circle cx="16" cy="19" r="1.8" fill="var(--color-gold)" stroke="none" />
    </svg>
  )
}

const TYPE_ICON: Record<string, IconName> = { hotel: 'hotel', riad: 'riad', resort: 'resort', guesthouse: 'guesthouse', apartment: 'apartment', other: 'pavilion' }

/** Pictogram of an establishment type (hotel, riad, resort, guesthouse, apartment, other). */
export function PropertyTypeIcon({ type, size = 20, title }: { type: string | null | undefined; size?: number; title?: string }) {
  return <ZIcon name={TYPE_ICON[type ?? ''] ?? 'hotel'} size={size} title={title} />
}
