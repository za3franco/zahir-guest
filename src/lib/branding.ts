// White-label branding: resolved per tenant. Only plans with whiteLabel=true (Professional,
// Enterprise, internal) get their own brand; everyone else sees Zahir Guest.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { limitsFor } from '@/lib/plans'

export const DEFAULT_ACCENT = '#C8A45A'

export interface TenantBranding {
  whiteLabel: boolean // plan allows custom branding
  brandName: string | null // null = show "Zahir Guest"
  logoUrl: string | null
  accent: string // hex, always valid
}

export const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function hexToRgba(hex: string, alpha: number): string {
  const h = HEX_RE.test(hex) ? hex : DEFAULT_ACCENT
  const n = parseInt(h.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

export function brandingFromTenant(tenant: any): TenantBranding {
  const limits = limitsFor(tenant?.subscription_tier, tenant?.subscription_status)
  const cfg = tenant?.branding_config ?? {}
  const whiteLabel = limits.whiteLabel
  const accent = HEX_RE.test(cfg.primary_color ?? '') ? cfg.primary_color : DEFAULT_ACCENT
  return {
    whiteLabel,
    brandName: whiteLabel && cfg.brand_name ? String(cfg.brand_name) : null,
    logoUrl: whiteLabel && cfg.logo_url ? String(cfg.logo_url) : null,
    accent: whiteLabel ? accent : DEFAULT_ACCENT,
  }
}

export async function getTenantBranding(
  tenantId: string,
  client?: SupabaseClient<any, any, any>
): Promise<TenantBranding> {
  const supabase =
    client ?? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await supabase
    .from('tenants')
    .select('subscription_tier, subscription_status, branding_config')
    .eq('id', tenantId)
    .single()
  return brandingFromTenant(data)
}
