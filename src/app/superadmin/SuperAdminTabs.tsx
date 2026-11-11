'use client'

import { usePathname } from 'next/navigation'
import styles from './superadmin.module.css'

const TABS = [
  { href: '/superadmin', label: 'Overview' },
  { href: '/superadmin/sales', label: 'Sales' },
]

export default function SuperAdminTabs() {
  const path = usePathname()
  return (
    <nav className={styles.tabs}>
      {TABS.map(t => (
        <a key={t.href} href={t.href} className={`${styles.tab} ${path === t.href ? styles.tabActive : ''}`}>{t.label}</a>
      ))}
    </nav>
  )
}
