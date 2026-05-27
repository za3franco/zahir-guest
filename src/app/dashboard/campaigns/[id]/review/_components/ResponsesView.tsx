'use client'

import { useState } from 'react'
import styles from './ResponsesView.module.css'

interface Props {
  domains: any[]
  sections: any[]
  standards: any[]
  responses: any[]
  lang: string
}

export default function ResponsesView({ domains, sections, standards, responses, lang }: Props) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(domains.map(d => d.id)))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'below' | 'meet' | 'na' | 'unanswered'>('all')

  const responseMap = new Map<string, any>()
  responses.forEach(r => responseMap.set(r.standard_id, r))

  function toggleDomain(id: string) {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filters = [
    { key: 'all', en: 'All', fr: 'Tous' },
    { key: 'below', en: 'Below only', fr: 'Non conformes' },
    { key: 'meet', en: 'Meet only', fr: 'Conformes' },
    { key: 'na', en: 'N/A', fr: 'N/A' },
    { key: 'unanswered', en: 'Unanswered', fr: 'Sans réponse' },
  ]

  const sortedDomains = [...domains].sort((a, b) => a.display_order - b.display_order)
  const sortedSections = [...sections].sort((a, b) => a.display_order - b.display_order)
  const sortedStandards = [...standards].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className={styles.container}>
      {/* Filter bar */}
      <div className={styles.filterBar}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ''}`}
          >
            {lang === 'en' ? f.en : f.fr}
          </button>
        ))}
      </div>

      {/* Domain/Section/Standard tree */}
      {sortedDomains.map(domain => {
        const domainSections = sortedSections.filter(s => s.domain_id === domain.id)
        const domainName = lang === 'en' ? domain.name_en : domain.name_fr
        const isExpanded = expandedDomains.has(domain.id)

        // Count below in this domain
        const domainStandards = sortedStandards.filter(std =>
          domainSections.some(s => s.id === std.section_id)
        )
        const belowCount = domainStandards.filter(std => {
          const r = responseMap.get(std.id)
          return r?.response === 'below'
        }).length

        return (
          <div key={domain.id} className={styles.domain}>
            <button
              onClick={() => toggleDomain(domain.id)}
              className={styles.domainHeader}
            >
              <div className={styles.domainLeft}>
                <span className={styles.domainChevron}>{isExpanded ? '▼' : '›'}</span>
                <span className={styles.domainName}>{domainName}</span>
              </div>
              {belowCount > 0 && (
                <span className={styles.belowBadge}>
                  {belowCount} {lang === 'en' ? 'below' : 'non conf.'}
                </span>
              )}
            </button>

            {isExpanded && domainSections.map(section => {
              const sectionStandards = sortedStandards.filter(s => s.section_id === section.id)
              const sectionName = lang === 'en' ? section.name_en : section.name_fr
              const isSectionExpanded = expandedSections.has(section.id)

              const filteredStandards = sectionStandards.filter(std => {
                const r = responseMap.get(std.id)
                const response = r?.response ?? null
                if (filter === 'all') return true
                if (filter === 'below') return response === 'below'
                if (filter === 'meet') return response === 'meet'
                if (filter === 'na') return response === 'na'
                if (filter === 'unanswered') return response === null
                return true
              })

              if (filteredStandards.length === 0 && filter !== 'all') return null

              const sectionBelow = sectionStandards.filter(std =>
                responseMap.get(std.id)?.response === 'below'
              ).length
              const sectionMeet = sectionStandards.filter(std =>
                responseMap.get(std.id)?.response === 'meet'
              ).length

              return (
                <div key={section.id} className={styles.section}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={styles.sectionHeader}
                  >
                    <div className={styles.sectionLeft}>
                      <span className={styles.sectionChevron}>{isSectionExpanded ? '▼' : '›'}</span>
                      <span className={styles.sectionName}>{sectionName}</span>
                    </div>
                    <div className={styles.sectionStats}>
                      <span className={styles.statMeet}>✓ {sectionMeet}</span>
                      <span className={styles.statBelow}>✗ {sectionBelow}</span>
                    </div>
                  </button>

                  {isSectionExpanded && (
                    <div className={styles.standardsList}>
                      {filteredStandards.map((std, index) => {
                        const r = responseMap.get(std.id)
                        const response = r?.response ?? null
                        const note = r?.auditor_note ?? null
                        const question = lang === 'en' ? std.question_en : std.question_fr

                        return (
                          <div
                            key={std.id}
                            className={`${styles.standard} ${
                              response === 'meet' ? styles.standardMeet :
                              response === 'below' ? styles.standardBelow :
                              response === 'na' ? styles.standardNa :
                              styles.standardUnanswered
                            }`}
                          >
                            <div className={styles.standardHeader}>
                              <span className={styles.standardNum}>{index + 1}</span>
                              {std.is_critical && (
                                <span className={styles.criticalTag}>
                                  {lang === 'en' ? 'Critical' : 'Critique'}
                                </span>
                              )}
                              <span className={styles.classTag}>{std.performance_classification}</span>
                            </div>
                            <p className={styles.question}>{question}</p>
                            <div className={styles.responseBadge}>
                              {response === 'meet' && (
                                <span className={styles.badgeMeet}>
                                  {lang === 'en' ? 'MEET' : 'CONFORME'}
                                </span>
                              )}
                              {response === 'below' && (
                                <span className={styles.badgeBelow}>
                                  {lang === 'en' ? 'BELOW' : 'NON CONFORME'}
                                </span>
                              )}
                              {response === 'na' && (
                                <span className={styles.badgeNa}>N/A</span>
                              )}
                              {response === null && (
                                <span className={styles.badgeUnanswered}>
                                  {lang === 'en' ? 'Unanswered' : 'Sans réponse'}
                                </span>
                              )}
                            </div>
                            {note && (
                              <div className={styles.note}>
                                <span className={styles.noteIcon}>📝</span>
                                <p className={styles.noteText}>{note}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
