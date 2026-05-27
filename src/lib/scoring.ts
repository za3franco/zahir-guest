/**
 * ZAHIR GUEST — SCORING ENGINE
 * 
 * Scoring methodology:
 * - Section score = MEET ÷ (total standards − N/A) × 100
 * - Domain score = weighted average of section scores (equal weight v1)
 * - Hotel overall = weighted average of domain scores (equal weight v1)
 * - Performance classification breakdown per section and overall
 * - Emotional score tracked separately (1–5)
 */

export type AuditResponseValue = 'meet' | 'below' | 'na' | null

export interface ScoringStandard {
  id: string
  section_id: string
  performance_classification: string
  is_critical: boolean
  question_en: string
  question_fr: string
  display_order: number
}

export interface ScoringResponse {
  standard_id: string
  response: AuditResponseValue
  auditor_note?: string | null
}

export interface ScoringSection {
  id: string
  domain_id: string
  name_en: string
  name_fr: string
  display_order: number
  weight: number
}

export interface ScoringDomain {
  id: string
  name_en: string
  name_fr: string
  display_order: number
  weight: number
}

export interface ScoringEmotionalRating {
  section_id: string
  rating: number
}

export interface StandardResult {
  standard_id: string
  question_en: string
  question_fr: string
  performance_classification: string
  is_critical: boolean
  display_order: number
  response: AuditResponseValue
  auditor_note?: string | null
}

export interface ClassificationBreakdown {
  total: number
  meet: number
  below: number
  na: number
  scored: number // total - na
  meet_percent: number | null
}

export interface SectionScore {
  section_id: string
  name_en: string
  name_fr: string
  display_order: number
  total: number
  meet: number
  below: number
  na: number
  scored: number
  score_percent: number | null
  emotional_rating: number | null
  classification_breakdown: Record<string, ClassificationBreakdown>
  standards: StandardResult[]
  critical_failures: StandardResult[]
}

export interface DomainScore {
  domain_id: string
  name_en: string
  name_fr: string
  display_order: number
  score_percent: number | null
  sections: SectionScore[]
}

export interface OverallClassificationBreakdown {
  EFFICIENCY: ClassificationBreakdown
  SERVICE: ClassificationBreakdown
  SALES_OPPORTUNITY: ClassificationBreakdown
  EMOTIONAL_INTELLIGENCE: ClassificationBreakdown
  CLEANLINESS: ClassificationBreakdown
  PRODUCT: ClassificationBreakdown
}

export interface ReportScores {
  overall_percent: number | null
  total_standards: number
  total_meet: number
  total_below: number
  total_na: number
  total_scored: number
  domains: DomainScore[]
  classification_breakdown: OverallClassificationBreakdown
  average_emotional_rating: number | null
  calculated_at: string
}

const CLASSIFICATIONS = [
  'EFFICIENCY',
  'SERVICE',
  'SALES_OPPORTUNITY',
  'EMOTIONAL_INTELLIGENCE',
  'CLEANLINESS',
  'PRODUCT',
] as const

function emptyClassificationBreakdown(): ClassificationBreakdown {
  return { total: 0, meet: 0, below: 0, na: 0, scored: 0, meet_percent: null }
}

function emptyOverallBreakdown(): OverallClassificationBreakdown {
  return {
    EFFICIENCY: emptyClassificationBreakdown(),
    SERVICE: emptyClassificationBreakdown(),
    SALES_OPPORTUNITY: emptyClassificationBreakdown(),
    EMOTIONAL_INTELLIGENCE: emptyClassificationBreakdown(),
    CLEANLINESS: emptyClassificationBreakdown(),
    PRODUCT: emptyClassificationBreakdown(),
  }
}

function calcPercent(meet: number, scored: number): number | null {
  if (scored === 0) return null
  return Math.round((meet / scored) * 100 * 10) / 10 // one decimal place
}

export function calculateScores(
  domains: ScoringDomain[],
  sections: ScoringSection[],
  standards: ScoringStandard[],
  responses: ScoringResponse[],
  emotionalRatings: ScoringEmotionalRating[]
): ReportScores {
  // Build lookup maps
  const responseMap = new Map<string, ScoringResponse>()
  responses.forEach(r => responseMap.set(r.standard_id, r))

  const emotionalMap = new Map<string, number>()
  emotionalRatings.forEach(e => emotionalMap.set(e.section_id, e.rating))

  // Sort domains and sections by display_order
  const sortedDomains = [...domains].sort((a, b) => a.display_order - b.display_order)
  const sortedSections = [...sections].sort((a, b) => a.display_order - b.display_order)

  // Overall counters
  let totalMeet = 0
  let totalBelow = 0
  let totalNa = 0
  const overallClassification = emptyOverallBreakdown()
  const emotionalRatingValues: number[] = []

  const domainScores: DomainScore[] = sortedDomains.map(domain => {
    const domainSections = sortedSections.filter(s => s.domain_id === domain.id)
    const sectionScoreValues: number[] = []

    const sectionScores: SectionScore[] = domainSections.map(section => {
      const sectionStandards = standards
        .filter(s => s.section_id === section.id)
        .sort((a, b) => a.display_order - b.display_order)

      let meet = 0, below = 0, na = 0
      const classBreakdown: Record<string, ClassificationBreakdown> = {}
      CLASSIFICATIONS.forEach(c => { classBreakdown[c] = emptyClassificationBreakdown() })

      const standardResults: StandardResult[] = sectionStandards.map(std => {
        const r = responseMap.get(std.id)
        const response = r?.response ?? null
        const classification = std.performance_classification

        // Count responses
        if (response === 'meet') {
          meet++
          if (classBreakdown[classification]) {
            classBreakdown[classification].meet++
            classBreakdown[classification].total++
          }
        } else if (response === 'below') {
          below++
          if (classBreakdown[classification]) {
            classBreakdown[classification].below++
            classBreakdown[classification].total++
          }
        } else if (response === 'na') {
          na++
          if (classBreakdown[classification]) {
            classBreakdown[classification].na++
            classBreakdown[classification].total++
          }
        }
        // null responses (unanswered) counted as na for scoring purposes
        else {
          na++
          if (classBreakdown[classification]) {
            classBreakdown[classification].na++
            classBreakdown[classification].total++
          }
        }

        return {
          standard_id: std.id,
          question_en: std.question_en,
          question_fr: std.question_fr,
          performance_classification: std.performance_classification,
          is_critical: std.is_critical,
          display_order: std.display_order,
          response,
          auditor_note: r?.auditor_note ?? null,
        }
      })

      const scored = meet + below // exclude na from denominator
      const score_percent = calcPercent(meet, scored)

      // Update classification scored/percent
      CLASSIFICATIONS.forEach(c => {
        const cb = classBreakdown[c]
        cb.scored = cb.meet + cb.below
        cb.meet_percent = calcPercent(cb.meet, cb.scored)
      })

      // Update overall classification
      CLASSIFICATIONS.forEach(c => {
        const cb = classBreakdown[c]
        overallClassification[c].total += cb.total
        overallClassification[c].meet += cb.meet
        overallClassification[c].below += cb.below
        overallClassification[c].na += cb.na
      })

      // Accumulate totals
      totalMeet += meet
      totalBelow += below
      totalNa += na

      if (score_percent !== null) {
        sectionScoreValues.push(score_percent)
      }

      const emotionalRating = emotionalMap.get(section.id) ?? null
      if (emotionalRating !== null) {
        emotionalRatingValues.push(emotionalRating)
      }

      const criticalFailures = standardResults.filter(
        s => s.is_critical && s.response === 'below'
      )

      return {
        section_id: section.id,
        name_en: section.name_en,
        name_fr: section.name_fr,
        display_order: section.display_order,
        total: sectionStandards.length,
        meet,
        below,
        na,
        scored,
        score_percent,
        emotional_rating: emotionalRating,
        classification_breakdown: classBreakdown,
        standards: standardResults,
        critical_failures: criticalFailures,
      }
    })

    // Domain score = average of section scores (equal weight v1)
    const domainScore = sectionScoreValues.length > 0
      ? Math.round((sectionScoreValues.reduce((a, b) => a + b, 0) / sectionScoreValues.length) * 10) / 10
      : null

    return {
      domain_id: domain.id,
      name_en: domain.name_en,
      name_fr: domain.name_fr,
      display_order: domain.display_order,
      score_percent: domainScore,
      sections: sectionScores,
    }
  })

  // Overall score = average of domain scores (equal weight v1)
  const domainScoreValues = domainScores
    .map(d => d.score_percent)
    .filter((s): s is number => s !== null)

  const overall_percent = domainScoreValues.length > 0
    ? Math.round((domainScoreValues.reduce((a, b) => a + b, 0) / domainScoreValues.length) * 10) / 10
    : null

  // Finalise overall classification breakdown
  CLASSIFICATIONS.forEach(c => {
    const cb = overallClassification[c]
    cb.scored = cb.meet + cb.below
    cb.meet_percent = calcPercent(cb.meet, cb.scored)
  })

  const totalScored = totalMeet + totalBelow

  const average_emotional_rating = emotionalRatingValues.length > 0
    ? Math.round((emotionalRatingValues.reduce((a, b) => a + b, 0) / emotionalRatingValues.length) * 10) / 10
    : null

  return {
    overall_percent,
    total_standards: totalMeet + totalBelow + totalNa,
    total_meet: totalMeet,
    total_below: totalBelow,
    total_na: totalNa,
    total_scored: totalScored,
    domains: domainScores,
    classification_breakdown: overallClassification,
    average_emotional_rating,
    calculated_at: new Date().toISOString(),
  }
}
