// ─────────────────────────────────────────────
// ZAHIR GUEST — DATABASE TYPES
// ─────────────────────────────────────────────

export type UserRole = 'super_admin' | 'tenant_admin' | 'auditor' | 'property_manager'
export type Language = 'en' | 'fr' | 'bilingual'
export type CampaignStatus = 'assigned' | 'in_progress' | 'submitted' | 'under_review' | 'finalized' | 'published'
export type AuditResponse = 'meet' | 'below' | 'na'
export type PerformanceClassification = 'EFFICIENCY' | 'SERVICE' | 'SALES_OPPORTUNITY' | 'EMOTIONAL_INTELLIGENCE' | 'CLEANLINESS' | 'PRODUCT'
export type SubscriptionTier = 'za3fran_internal' | 'starter' | 'professional' | 'enterprise'
export type PropertyCategory = '5_star' | '4_star' | '3_star' | '2_star' | '1_star' | 'unrated'
export type PropertyType = 'hotel' | 'riad' | 'resort' | 'guesthouse' | 'apartment' | 'other'

export interface Tenant {
  id: string
  name: string
  slug: string
  branding_config: {
    primary_color?: string
    secondary_color?: string
    logo_url?: string | null
    brand_name?: string
  }
  subscription_tier: SubscriptionTier
  subscription_status: string
  stripe_customer_id?: string | null
  created_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  name: string
  role: UserRole
  default_language: Language
  created_at: string
  last_login?: string | null
}

export interface Property {
  id: string
  tenant_id: string
  name: string
  category: PropertyCategory
  type: PropertyType
  city?: string | null
  country: string
  contact_name?: string | null
  contact_email?: string | null
  property_manager_user_id?: string | null
  is_archived: boolean
  created_at: string
}

export interface QuestionnaireTemplate {
  id: string
  tenant_id?: string | null
  name: string
  tier: string
  language: Language
  version: number
  is_active: boolean
  created_at: string
}

export interface TemplateDomain {
  id: string
  template_id: string
  name_en: string
  name_fr: string
  display_order: number
  weight: number
}

export interface TemplateSection {
  id: string
  domain_id: string
  name_en: string
  name_fr: string
  display_order: number
  is_optional: boolean
  weight: number
}

export interface TemplateStandard {
  id: string
  section_id: string
  question_en: string
  question_fr: string
  performance_classification: PerformanceClassification
  display_order: number
  is_critical: boolean
  guidance_en?: string | null
  guidance_fr?: string | null
}

export interface Campaign {
  id: string
  tenant_id: string
  property_id: string
  template_id: string
  name: string
  auditor_user_id?: string | null
  visit_window_start?: string | null
  visit_window_end?: string | null
  status: CampaignStatus
  outlet_names: Record<string, string>
  admin_notes?: string | null
  created_at: string
  submitted_at?: string | null
  published_at?: string | null
  // Joined fields
  property?: Property
  auditor?: User
  template?: QuestionnaireTemplate
}

export interface AuditResponseRecord {
  id: string
  campaign_id: string
  standard_id: string
  response?: AuditResponse | null
  auditor_note?: string | null
  flagged_for_review: boolean
  created_at: string
  updated_at: string
}

export interface AuditEmotionalRating {
  id: string
  campaign_id: string
  section_id: string
  rating: 1 | 2 | 3 | 4 | 5
  primary_emotion?: string | null
  created_at: string
}

export interface AuditPhoto {
  id: string
  campaign_id: string
  section_id: string
  standard_id?: string | null
  storage_path: string
  caption?: string | null
  uploaded_at: string
}

export interface AuditReport {
  id: string
  campaign_id: string
  tenant_id: string
  report_html?: string | null
  report_json: Record<string, unknown>
  pdf_url?: string | null
  executive_summary?: string | null
  ai_recommendations?: string | null
  model_used?: string | null
  language: Language
  generated_at: string
  published_at?: string | null
}

// ─────────────────────────────────────────────
// UI / Computed types
// ─────────────────────────────────────────────

export interface SectionScore {
  section_id: string
  section_name_en: string
  section_name_fr: string
  total: number
  met: number
  below: number
  na: number
  score_percent: number | null
  emotional_rating?: number | null
  emotional_label?: string | null
}

export interface DomainScore {
  domain_id: string
  domain_name_en: string
  domain_name_fr: string
  score_percent: number | null
  sections: SectionScore[]
}

export interface ReportScores {
  overall_percent: number | null
  domains: DomainScore[]
  classification_breakdown: Record<PerformanceClassification, { total: number; below: number; percent_below: number }>
}

export const EMOTIONAL_LABELS: Record<number, { en: string; fr: string }> = {
  5: { en: 'Pampered', fr: 'Choyé(e)' },
  4: { en: 'Delighted', fr: 'Ravi(e)' },
  3: { en: 'Content', fr: 'Satisfait(e)' },
  2: { en: 'Disappointed', fr: 'Déçu(e)' },
  1: { en: 'Frustrated', fr: 'Frustré(e)' },
}

export const CLASSIFICATION_LABELS: Record<PerformanceClassification, { en: string; fr: string }> = {
  EFFICIENCY: { en: 'Efficiency', fr: 'Efficacité' },
  SERVICE: { en: 'Service', fr: 'Service' },
  SALES_OPPORTUNITY: { en: 'Sales Opportunity', fr: 'Opportunité Commerciale' },
  EMOTIONAL_INTELLIGENCE: { en: 'Emotional Intelligence', fr: 'Intelligence Émotionnelle' },
  CLEANLINESS: { en: 'Cleanliness', fr: 'Propreté' },
  PRODUCT: { en: 'Product', fr: 'Produit' },
}

export const STATUS_LABELS: Record<CampaignStatus, { en: string; fr: string; color: string }> = {
  assigned: { en: 'Assigned', fr: 'Assignée', color: '#9B9488' },
  in_progress: { en: 'In Progress', fr: 'En cours', color: '#C8A45A' },
  submitted: { en: 'Submitted', fr: 'Soumise', color: '#E8C87A' },
  under_review: { en: 'Under Review', fr: 'En révision', color: '#D4882A' },
  finalized: { en: 'Finalized', fr: 'Finalisée', color: '#4A7C6B' },
  published: { en: 'Published', fr: 'Publiée', color: '#4A7C6B' },
}
