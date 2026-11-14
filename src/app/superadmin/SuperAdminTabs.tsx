'use client'

import { usePathname } from 'next/navigation'
import { SA, type Lang } from '@/lib/superadminText'
import styles from './superadmin.module.css'

export default function SuperAdminTabs({ lang }: { lang: Lang }) {
  const path = usePathname()
  const t = SA[lang]
  const tabs = [
    { href: '/superadmin', label: t.tabOverview },
    { href: '/superadmin/sales', label: t.tabSales },
  ]
  return (
    <nav className={styles.tabs}>
      {tabs.map(tab => (
        <a key={tab.href} href={tab.href} className={`${styles.tab} ${path === tab.href ? styles.tabActive : ''}`}>{tab.label}</a>
      ))}
    </nav>
  )
}
