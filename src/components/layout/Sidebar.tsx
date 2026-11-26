'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { prepareLogout } from '@/lib/offline/session'
import type { User } from '@/types'
import FeedbackWidget from './FeedbackWidget'
import styles from './Sidebar.module.css'
import { ZIcon, ZahirMark } from '@/components/icons/ZahirIcons'

interface NavItem {
  href: string
  labelEn: string
  labelFr: string
  icon: React.ReactNode
  roles: string[]
  exact?: boolean
  activePrefix?: string
  group: NavGroup
}

type NavGroup = 'follow' | 'prepare' | 'visit' | 'manage' | 'help'

const GROUPS: { id: NavGroup; en: string; fr: string }[] = [
  { id: 'follow', en: 'Follow', fr: 'Suivre' },
  { id: 'prepare', en: 'Prepare', fr: 'Préparer' },
  { id: 'visit', en: 'Visit', fr: 'Visiter' },
  { id: 'manage', en: 'Manage', fr: 'Administrer' },
  { id: 'help', en: '', fr: '' },
]

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    labelEn: 'Dashboard',
    group: 'follow',
    labelFr: 'Tableau de bord',
    icon: <ZIcon name="ledger" />,
    roles: ['super_admin', 'tenant_admin', 'auditor'],
    exact: true,
  },
  {
    // PM/DM: Dashboard = analytics
    href: '/dashboard/reports',
    labelEn: 'Dashboard',
    group: 'follow',
    labelFr: 'Tableau de bord',
    icon: <ZIcon name="ledger" />,
    roles: ['client_admin', 'property_manager', 'department_manager'],
    exact: true,
  },
  {
    href: '/dashboard/campaigns',
    labelEn: 'Campaigns',
    group: 'prepare',
    labelFr: 'Campagnes',
    icon: <ZIcon name="calendar" />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    href: '/dashboard',
    labelEn: 'My Audits',
    group: 'visit',
    labelFr: 'Mes Audits',
    icon: <ZIcon name="keyhole" />,
    roles: ['auditor'],
    exact: true,
  },
  {
    href: '/dashboard/analytics',
    labelEn: 'Analytics',
    group: 'follow',
    labelFr: 'Analyses',
    icon: <ZIcon name="curve" />,
    roles: ['super_admin', 'tenant_admin', 'client_admin'],
  },
  {
    href: '/dashboard/clients',
    labelEn: 'Clients',
    group: 'manage',
    labelFr: 'Clients',
    icon: <ZIcon name="card" />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    href: '/dashboard/properties',
    labelEn: 'Properties',
    group: 'prepare',
    labelFr: 'Établissements',
    icon: <ZIcon name="facade" />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    // PM/DM: Reports = published campaigns list
    href: '/dashboard/campaigns',
    labelEn: 'Reports',
    group: 'follow',
    labelFr: 'Rapports',
    icon: <ZIcon name="seal" />,
    roles: ['client_admin', 'property_manager', 'department_manager'],
  },
  {
    href: '/dashboard/questionnaires',
    labelEn: 'Questionnaires',
    group: 'prepare',
    labelFr: 'Questionnaires',
    icon: <ZIcon name="notebook" />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    href: '/dashboard/users',
    labelEn: 'Users',
    group: 'manage',
    labelFr: 'Utilisateurs',
    icon: <ZIcon name="badge" />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    href: '/dashboard/billing',
    labelEn: 'Billing',
    group: 'manage',
    labelFr: 'Facturation',
    icon: <ZIcon name="receipt" />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    href: '/dashboard/help',
    labelEn: 'Help',
    group: 'help',
    labelFr: 'Aide',
    icon: <ZIcon name="bell" />,
    roles: ['super_admin', 'tenant_admin', 'auditor', 'client_admin', 'property_manager', 'department_manager'],
  },
  {
    href: '/superadmin',
    labelEn: 'Platform',
    group: 'manage',
    labelFr: 'Plateforme',
    icon: <ZIcon name="key" />,
    roles: ['super_admin'],
  },
  {
    href: '/dashboard/branding',
    labelEn: 'Branding',
    group: 'manage',
    labelFr: 'Marque',
    icon: <ZIcon name="stamp" />,
    roles: ['super_admin', 'tenant_admin'],
  },
]

const ROLE_LABELS: Record<string, { en: string; fr: string }> = {
  super_admin: { en: 'Super Admin', fr: 'Super Admin' },
  tenant_admin: { en: 'Admin', fr: 'Administrateur' },
  auditor: { en: 'Auditor', fr: 'Auditeur' },
  property_manager: { en: 'Property Manager', fr: 'Directeur' },
  department_manager: { en: 'Dept. Manager', fr: 'Chef de département' },
}

export interface SidebarBrand {
  brandName: string | null
  logoUrl: string | null
}

export default function Sidebar({ user, brand }: { user: User; brand?: SidebarBrand }) {
  const pathname = usePathname()
  const [lang, setLang] = useState<'en' | 'fr'>(user.default_language === 'en' ? 'en' : 'fr')
  const [switching, setSwitching] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isPM = user.role === 'property_manager' || user.role === 'department_manager' || user.role === 'client_admin'
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleLogout() {
    // Offline mode: warn about changes not sent yet, then erase what this phone keeps
    if (!(await prepareLogout(user.id, lang))) return
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleLanguageSwitch(newLang: 'en' | 'fr') {
    if (newLang === lang || switching) return
    setSwitching(true)
    setLang(newLang)
    try {
      await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      })
      window.location.reload()
    } catch {
      setLang(lang)
    } finally {
      setSwitching(false)
    }
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    // For PM Reports item pointing to /dashboard/campaigns — active on campaigns and review pages
    if (isPM && item.labelEn === 'Reports') {
      return pathname.startsWith('/dashboard/campaigns')
    }
    return pathname.startsWith(item.href)
  }

  return (
    <>
      <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.brand}>
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className={styles.brandLogo} />
          ) : (
            <div className={styles.logoMark} aria-hidden="true">
              <ZahirMark size={28} color="var(--color-ivory)" />
            </div>
          )}
          <span className={styles.wordmark}>{brand?.brandName ?? 'Zahir Guest'}</span>
          <button className={styles.mobileCloseBtn} onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <nav className={styles.nav}>
          {GROUPS.map(g => {
            const items = visibleItems.filter(item => item.group === g.id)
            if (!items.length) return null
            return (
              <div key={g.id} className={styles.navGroup}>
                {g.id !== 'help' && <p className={styles.navGroupTitle}>{lang === 'en' ? g.en : g.fr}</p>}
                {items.map(item => (
                  <Link
                    key={`${item.href}-${item.labelEn}`}
                    href={item.href}
                    data-tour={item.href}
                    className={`${styles.navItem} ${isActive(item) ? styles.navItemActive : ''}`}
                    aria-current={isActive(item) ? 'page' : undefined}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{lang === 'en' ? item.labelEn : item.labelFr}</span>
                  </Link>
                ))}
              </div>
            )
          })}
        </nav>

        <FeedbackWidget lang={lang} />

        <div className={styles.langToggle}>
          <button onClick={() => handleLanguageSwitch('fr')} className={`${styles.langBtn} ${lang === 'fr' ? styles.langBtnActive : ''}`} disabled={switching}>FR</button>
          <span className={styles.langDivider}>|</span>
          <button onClick={() => handleLanguageSwitch('en')} className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`} disabled={switching}>EN</button>
        </div>

        <div className={styles.bottom}>
          <Link href="/dashboard/profile" className={styles.userInfo} title={lang === 'en' ? 'My profile' : 'Mon profil'}>
            <div className={styles.userAvatar}>{user.name.charAt(0).toUpperCase()}</div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{ROLE_LABELS[user.role]?.[lang] ?? user.role}</span>
            </div>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} aria-label={lang === 'en' ? 'Sign out' : 'Se déconnecter'}>
            <ZIcon name="door" size={18} dot={false} />
          </button>
        </div>
      </aside>
    </>
  )
}
