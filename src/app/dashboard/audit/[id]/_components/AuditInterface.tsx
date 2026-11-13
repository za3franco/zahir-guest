'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import SaveStatus from './SaveStatus'
import type { User } from '@/types'
import styles from './AuditInterface.module.css'
import SectionAudit from './SectionAudit'
import AuditOverview from './AuditOverview'
import AuditSubmit from './AuditSubmit'
import type { PhotoRef } from './StandardPhotos'

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
}: Props) {
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  // Build response map from existing responses
  const initialResponses: ResponseMap = {}
  existingResponses.forEach((r: any) => {
    initialResponses[r.standard_id] = {
      response: r.response ?? null,
      note: r.auditor_note ?? '',
    }
  })

  // Build emotional rating map
  const initialEmotional: EmotionalRatingMap = {}
  existingEmotionalRatings.forEach((r: any) => {
    initialEmotional[r.section_id] = r.rating
  })

  const initialPhotos: Record<string, PhotoRef[]> = {}
  existingPhotos.forEach(p => {
    if (p.standard_id) (initialPhotos[p.standard_id] ??= []).push({ id: p.id })
  })
  const [photos, setPhotos] = useState<Record<string, PhotoRef[]>>(initialPhotos)
  const [responses, setResponses] = useState<ResponseMap>(initialResponses)
  const [emotionalRatings, setEmotionalRatings] = useState<EmotionalRatingMap>(initialEmotional)
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

  // ── Autosave ─────────────────────────────────────────────
  // Every answer, note and rating is saved as it changes; there is no "save" button.
  // Notes are saved 700 ms after the auditor stops typing (one request instead of one per key).
  // Failed saves are kept and retried when the auditor taps "Retry" or when the next save succeeds.
  type Job = { url: string; body: unknown }
  const [pending, setPending] = useState(0)
  const [typing, setTyping] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const failed = useRef(new Map<string, Job>())
  const noteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const noteJobs = useRef(new Map<string, Job>())

  // Saves of the same standard / section go out one after the other, and only the latest value is sent:
  // an older request can never arrive after a newer one and overwrite it.
  const latest = useRef(new Map<string, Job>())
  const chains = useRef(new Map<string, Promise<void>>())

  const send = useCallback((key: string, job: Job, keepalive = false) => {
    latest.current.set(key, job)
    failed.current.delete(key) // superseded by this newer value
    setFailedCount(failed.current.size)
    setPending(n => n + 1)
    const run = async () => {
      if (latest.current.get(key) !== job) return // a newer value is queued behind us
      try {
        const res = await fetch(job.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.body),
          keepalive,
        })
        // A redirect means the session expired (sent to /login): not saved
        if (!res.ok || res.redirected) throw new Error(String(res.status))
        if (latest.current.get(key) === job) latest.current.delete(key)
      } catch {
        if (latest.current.get(key) === job) failed.current.set(key, job)
      }
    }
    const p = (chains.current.get(key) ?? Promise.resolve()).then(run).finally(() => {
      if (chains.current.get(key) === p) chains.current.delete(key)
      setFailedCount(failed.current.size)
      setPending(n => n - 1)
    })
    chains.current.set(key, p)
    return p
  }, [])

  const retryFailed = useCallback(() => {
    for (const [key, job] of Array.from(failed.current.entries())) send(key, job)
  }, [send])

  const flushNotes = useCallback((keepalive = false) => {
    for (const [id, timer] of Array.from(noteTimers.current.entries())) {
      clearTimeout(timer)
      const job = noteJobs.current.get(id)
      if (job) send(`r:${id}`, job, keepalive)
    }
    noteTimers.current.clear()
    noteJobs.current.clear()
    setTyping(0)
  }, [send])

  // Leaving the page or switching app: send any note still being typed
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushNotes(true) }
    const onPageHide = () => flushNotes(true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flushNotes])

  // Coming back online: retry what failed
  useEffect(() => {
    window.addEventListener('online', retryFailed)
    return () => window.removeEventListener('online', retryFailed)
  }, [retryFailed])

  const responseJob = (standardId: string, response: 'meet' | 'below' | 'na' | null, note: string): Job => ({
    url: `/api/audit/${campaign.id}/response`,
    body: { standard_id: standardId, response, auditor_note: note },
  })

  function handleResponseChange(standardId: string, response: 'meet' | 'below' | 'na' | null, note: string) {
    const prev = responses[standardId]
    setResponses(p => ({ ...p, [standardId]: { response, note } }))
    const job = responseJob(standardId, response, note)
    const onlyNote = (prev?.response ?? null) === response && (prev?.note ?? '') !== note

    const existing = noteTimers.current.get(standardId)
    if (existing) clearTimeout(existing)

    if (onlyNote) {
      noteJobs.current.set(standardId, job)
      noteTimers.current.set(standardId, setTimeout(() => {
        noteTimers.current.delete(standardId)
        noteJobs.current.delete(standardId)
        setTyping(noteTimers.current.size)
        send(`r:${standardId}`, job)
      }, 700))
      setTyping(noteTimers.current.size)
    } else {
      noteTimers.current.delete(standardId)
      noteJobs.current.delete(standardId)
      setTyping(noteTimers.current.size)
      send(`r:${standardId}`, job)
    }
    if (failed.current.size > 0) retryFailed()
  }

  function handleEmotionalRatingChange(sectionId: string, rating: number) {
    setEmotionalRatings(prev => ({ ...prev, [sectionId]: rating }))
    send(`e:${sectionId}`, { url: `/api/audit/${campaign.id}/emotional-rating`, body: { section_id: sectionId, rating } })
  }

  const saving = pending > 0 || typing > 0

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
    flushNotes()
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

  const status = <SaveStatus lang={lang} saving={saving} failed={failedCount} onRetry={retryFailed} />

  if (currentView === 'submit') {
    return (
      <>{status}<AuditSubmit
        unsaved={failedCount}
        saving={saving}
        onRetry={retryFailed}
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
        saveStatus={<SaveStatus lang={lang} saving={saving} failed={failedCount} onRetry={retryFailed} inline />}
        campaign={campaign}
        section={currentSection}
        domain={currentDomain}
        standards={currentStandards}
        responses={responses}
        photos={photos}
        onPhotosChange={(standardId, list) => setPhotos(prev => ({ ...prev, [standardId]: list }))}
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
