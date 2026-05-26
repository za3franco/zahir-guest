'use client'

import { useState, useEffect, useCallback } from 'react'
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
  user: User
}

export default function AuditInterface({
  campaign,
  domains,
  sections,
  standards,
  existingResponses,
  existingEmotionalRatings,
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

  const [responses, setResponses] = useState<ResponseMap>(initialResponses)
  const [emotionalRatings, setEmotionalRatings] = useState<EmotionalRatingMap>(initialEmotional)
  const [currentView, setCurrentView] = useState<'overview' | 'section' | 'submit'>('overview')
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  // Save a single response
  const saveResponse = useCallback(async (
    standardId: string,
    response: 'meet' | 'below' | 'na' | null,
    note: string
  ) => {
    setSaving(true)
    try {
      await fetch(`/api/audit/${campaign.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standard_id: standardId, response, auditor_note: note }),
      })
    } finally {
      setSaving(false)
    }
  }, [campaign.id])

  // Save emotional rating
  const saveEmotionalRating = useCallback(async (sectionId: string, rating: number) => {
    try {
      await fetch(`/api/audit/${campaign.id}/emotional-rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId, rating }),
      })
    } catch {
      // silent fail
    }
  }, [campaign.id])

  function handleResponseChange(standardId: string, response: 'meet' | 'below' | 'na' | null, note: string) {
    setResponses(prev => ({ ...prev, [standardId]: { response, note } }))
    saveResponse(standardId, response, note)
  }

  function handleEmotionalRatingChange(sectionId: string, rating: number) {
    setEmotionalRatings(prev => ({ ...prev, [sectionId]: rating }))
    saveEmotionalRating(sectionId, rating)
  }

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

  if (currentView === 'submit') {
    return (
      <AuditSubmit
        campaign={campaign}
        sections={sections}
        domains={domains}
        standards={standards}
        responses={responses}
        emotionalRatings={emotionalRatings}
        getSectionProgress={getSectionProgress}
        onBack={goToOverview}
        lang={lang}
      />
    )
  }

  if (currentView === 'section' && currentSection) {
    return (
      <SectionAudit
        campaign={campaign}
        section={currentSection}
        domain={currentDomain}
        standards={currentStandards}
        responses={responses}
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
    <AuditOverview
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
    />
  )
}
