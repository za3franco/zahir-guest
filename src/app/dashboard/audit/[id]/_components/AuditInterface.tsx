'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import SyncStatus, { SyncNotices } from './SyncStatus'
import { AuditSync, type SyncView } from '@/lib/offline/auditSync'
import { auditStore, deviceHasWork, purgeOld, requestPersistentStorage } from '@/lib/offline/store'
import type { User } from '@/types'
import styles from './AuditInterface.module.css'
import SectionAudit from './SectionAudit'
import AuditOverview from './AuditOverview'
import AuditSubmit from './AuditSubmit'

export interface Domain {
  id: string
  name_en: string
  name_fr: string
  display_order: number
}

export interface Section {
  id: string
  domain_id: string
  name_en: string
  name_fr: string
  display_order: number
  is_optional: boolean
}

export interface Standard {
  id: string
  section_id: string
  question_en: string
  question_fr: string
  performance_classification: string
  display_order: number
  is_critical: boolean
  guidance_en?: string | null
  guidance_fr?: string | null
}

export interface ResponseMap {
  [standardId: string]: {
    response: 'meet' | 'below' | 'na' | null
    note: string
  }
}

export interface EmotionalRatingMap {
  [sectionId: string]: number
}

interface Props {
  campaign: any
  domains: Domain[]
  sections: Section[]
  standards: Standard[]
  existingResponses: any[]
  existingEmotionalRatings: any[]
  existingPhotos: { id: string; standard_id: string | null }[]
  user: User
  /** The workspace has the offline mode: changes are kept on the phone until the server has them */
  offlineEnabled: boolean
}

export default function AuditInterface({
  campaign,
  domains,
  sections,
  standards,
  existingResponses,
  existingEmotionalRatings,
  existingPhotos,
  user,
  offlineEnabled,
}: Props) {
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  // ── Synchronisation ──────────────────────────────────────
  // Every answer, note and rating is applied at once, kept on the phone and sent in the background
  // (src/lib/offline/auditSync.ts). There is no "save" button.
  const [engine, setEngine] = useState<AuditSync | null>(null)
  useEffect(() => {
    let e: AuditSync | null = null
    let cancelled = false
    void (async () => {
    // Offline mode switched off for the workspace: changes still on this phone are sent all the same
    const store = auditStore(offlineEnabled || (await deviceHasWork(user.id, campaign.id)))
    if (cancelled) return
    e = new AuditSync({
      campaignId: campaign.id,
      userId: user.id,
      campaignName: campaign.name,
      store,
      serverResponses: existingResponses,
      serverRatings: existingEmotionalRatings,
      serverPhotos: existingPhotos,
    })
    setEngine(e)
    void e.init()
    if (store.persistent) {
      void requestPersistentStorage()
      void purgeOld(store)
    }
    })()
    return () => { cancelled = true; e?.dispose() }
    // the engine lives as long as the page; props are only its starting point
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id, user.id, offlineEnabled])

  const initialView = useMemo<SyncView>(() => {
    const responses: SyncView['responses'] = {}
    existingResponses.forEach((r: any) => { responses[r.standard_id] = { response: r.response ?? null, note: r.auditor_note ?? '' } })
    const ratings: SyncView['ratings'] = {}
    existingEmotionalRatings.forEach((r: any) => { ratings[r.section_id] = r.rating })
    const photos: SyncView['photos'] = {}
    existingPhotos.forEach(p => { if (p.standard_id) (photos[p.standard_id] ??= []).push({ id: p.id, src: `/api/photos/${p.id}`, pending: false }) })
    return { responses, ratings, photos, rejectedReasons: [], pending: 0, rejected: 0, state: 'idle', sending: false, lastSyncAt: null, conflicts: 0, persistent: offlineEnabled, ready: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const view = useSyncExternalStore(
    cb => (engine ? engine.subscribe(cb) : () => {}),
    () => (engine ? engine.getView() : initialView),
    () => initialView,
  )
  const responses: ResponseMap = view.responses
  const emotionalRatings: EmotionalRatingMap = view.ratings

  const [currentView, setCurrentView] = useState<'overview' | 'section' | 'submit'>('overview')
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null)

  const sectionName = (s: Section) => lang === 'en' ? s.name_en : s.name_fr
  const domainName = (d: Domain) => lang === 'en' ? d.name_en : d.name_fr

  // Calculate section completion
  function getSectionProgress(sectionId: string) {
    const sectionStandards = standards.filter(s => s.section_id === sectionId)
    const answered = sectionStandards.filter(s => responses[s.id]?.response != null)
    return { total: sectionStandards.length, answered: answered.length }
  }

  function getSectionComplete(sectionId: string) {
    const { total, answered } = getSectionProgress(sectionId)
    return total > 0 && answered === total
  }

  // Calculate overall progress
  const totalStandards = standards.length
  const answeredStandards = standards.filter(s => responses[s.id]?.response != null).length
  const overallPercent = totalStandards > 0 ? Math.round((answeredStandards / totalStandards) * 100) : 0

  function handleResponseChange(standardId: string, response: 'meet' | 'below' | 'na' | null, note: string) {
    const prev = responses[standardId]
    // Only the note changed: wait until the auditor stops typing before sending
    const typing = (prev?.response ?? null) === response && (prev?.note ?? '') !== note
    engine?.setResponse(standardId, response, note, { typing })
  }

  function handleEmotionalRatingChange(sectionId: string, rating: number) {
    engine?.setRating(sectionId, rating)
  }

  const retry = () => { void engine?.retry() }
  const saving = view.sending || view.pending > 0

  function openSection(sectionId: string) {
    setCurrentSectionId(sectionId)
    setCurrentView('section')
    window.scrollTo(0, 0)
  }

  function goToOverview() {
    setCurrentView('overview')
    setCurrentSectionId(null)
    window.scrollTo(0, 0)
  }

  function goToSubmit() {
    void engine?.flush()
    setCurrentView('submit')
    window.scrollTo(0, 0)
  }

  const currentSection = sections.find(s => s.id === currentSectionId) ?? null
  const currentDomain = currentSection
    ? domains.find(d => d.id === currentSection.domain_id) ?? null
    : null
  const currentStandards = currentSection
    ? standards.filter(s => s.section_id === currentSection.id)
    : []

  // Find next section
  const currentSectionIndex = currentSection
    ? sections.findIndex(s => s.id === currentSection.id)
    : -1
  const nextSection = currentSectionIndex >= 0 && currentSectionIndex < sections.length - 1
    ? sections[currentSectionIndex + 1]
    : null

  const status = <SyncStatus lang={lang} view={view} onRetry={retry} />
  const notices = (
    <SyncNotices
      lang={lang}
      view={view}
      onDismissConflicts={() => engine?.dismissConflicts()}
      onDiscardRejected={() => { void engine?.discardRejected() }}
    />
  )

  if (currentView === 'submit') {
    return (
      <>{status}<AuditSubmit
        sync={view}
        notices={notices}
        onSync={retry}
        onSubmitted={() => { void engine?.forget() }}
        campaign={campaign}
        sections={sections}
        domains={domains}
        standards={standards}
        responses={responses}
        emotionalRatings={emotionalRatings}
        getSectionProgress={getSectionProgress}
        onBack={goToOverview}
        lang={lang}
      /></>
    )
  }

  if (currentView === 'section' && currentSection) {
    return (
      <SectionAudit
        saveStatus={<SyncStatus lang={lang} view={view} onRetry={retry} inline />}
        campaign={campaign}
        section={currentSection}
        domain={currentDomain}
        standards={currentStandards}
        responses={responses}
        photos={view.photos}
        onAddPhoto={(standardId, blob) => engine ? engine.addPhoto(standardId, blob) : Promise.resolve(null)}
        onRemovePhoto={id => { void engine?.removePhoto(id) }}
        emotionalRating={emotionalRatings[currentSection.id] ?? null}
        onResponseChange={handleResponseChange}
        onEmotionalRatingChange={handleEmotionalRatingChange}
        onBack={goToOverview}
        onNext={nextSection ? () => openSection(nextSection.id) : goToSubmit}
        hasNext={!!nextSection}
        saving={saving}
        lang={lang}
        sectionName={sectionName(currentSection)}
        domainName={currentDomain ? domainName(currentDomain) : ''}
      />
    )
  }

  return (
    <>{status}<AuditOverview
      notices={notices}
      offlineReady={view.persistent && view.ready}
      campaign={campaign}
      domains={domains}
      sections={sections}
      getSectionProgress={getSectionProgress}
      getSectionComplete={getSectionComplete}
      emotionalRatings={emotionalRatings}
      overallPercent={overallPercent}
      answeredStandards={answeredStandards}
      totalStandards={totalStandards}
      onOpenSection={openSection}
      onSubmit={goToSubmit}
      lang={lang}
      domainName={domainName}
      sectionName={sectionName}
    /></>
  )
}
