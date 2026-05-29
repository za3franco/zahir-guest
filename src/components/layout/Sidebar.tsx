'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  labelEn: string
  labelFr: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    labelEn: 'Dashboard',
    labelFr: 'Tableau de bord',
    icon: <IconDashboard />,
    roles: ['super_admin', 'tenant_admin', 'auditor', 'property_manager'],
  },
  {
    href: '/dashboard/campaigns',
    labelEn: 'Campaigns',
    labelFr: 'Campagnes',
    icon: <IconCampaigns />,
    roles: ['super_admin', 'tenant_admin'],
  },
  {
    href: '/dashboard',
    labelEn: 'My Audits',
    labelFr: 'Mes Audits',
    icon: <IconAudit />,
    roles: ['auditor'],
  },
  {
    href: '/dashboard/properties',
    labelEn: 'Properties',
    labelFr: 'Établissements',
    icon: <IconProperties />,
    roles: ['super_admin', 'tenant_admin'],
  },
  // Reports link added in ZG-2 when client portal is built
  {
    href: '/dashboard/users',
    labelEn: 'Users',
    labelFr: 'Utilisateurs',
    icon: <IconUsers />,
    roles: ['super_admin', 'tenant_admin'],
  },
]

const ROLE_LABELS: Record<string, { en: string; fr: string }> = {
  super_admin: { en: 'Super Admin', fr: 'Super Admin' },
  tenant_admin: { en: 'Admin', fr: 'Administrateur' },
  auditor: { en: 'Auditor', fr: 'Auditeur' },
  property_manager: { en: 'Property Manager', fr: 'Directeur' },
}

interface SidebarProps {
  user: User
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [lang, setLang] = useState<'en' | 'fr'>(
    user.default_language === 'en' ? 'en' : 'fr'
  )
  const [switching, setSwitching] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  // Close sidebar on route change — scroll handled by ScrollToTop component
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleLogout() {
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

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logoMark} aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
            <circle cx="20" cy="20" r="7" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.5" fill="none"/>
            <circle cx="20" cy="20" r="13" stroke="#C8A45A" strokeWidth="0.5" strokeOpacity="0.25" fill="none"/>
            <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
            <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
            <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
            <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
          </svg>
        </div>
        <span className={styles.wordmark}>Zahir Guest</span>
        {/* Close button on mobile */}
        <button
          className={styles.mobileCloseBtn}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className={styles.nav} aria-label={lang === 'en' ? 'Main navigation' : 'Navigation principale'}>
        {visibleItems.map(item => (
          <Link
            key={`${item.href}-${item.labelEn}`}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>
              {lang === 'en' ? item.labelEn : item.labelFr}
            </span>
          </Link>
        ))}
      </nav>

      {/* Language toggle */}
      <div className={styles.langToggle}>
        <button
          onClick={() => handleLanguageSwitch('fr')}
          className={`${styles.langBtn} ${lang === 'fr' ? styles.langBtnActive : ''}`}
          disabled={switching}
          aria-pressed={lang === 'fr'}
        >
          FR
        </button>
        <span className={styles.langDivider}>|</span>
        <button
          onClick={() => handleLanguageSwitch('en')}
          className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
          disabled={switching}
          aria-pressed={lang === 'en'}
        >
          EN
        </button>
      </div>

      {/* Bottom — user info + logout */}
      <div className={styles.bottom}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>
              {ROLE_LABELS[user.role]?.[lang] ?? user.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={styles.logoutBtn}
          aria-label={lang === 'en' ? 'Sign out' : 'Se déconnecter'}
          title={lang === 'en' ? 'Sign out' : 'Se déconnecter'}
        >
          <IconLogout />
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger button — only visible on small screens */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay — closes sidebar when tapping outside on mobile */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {sidebarContent}
    </>
  )
}

// ─── Icons ───────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconCampaigns() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function IconAudit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  )
}

function IconProperties() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  )
}

function IconReports() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
