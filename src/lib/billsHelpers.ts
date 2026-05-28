// Helpers shared by /me/bills (citizen) and /work/finance (operator)
import type { StringKey } from './i18n'

export type BillKind =
  | 'property_tax' | 'business_tax' | 'utility' | 'stormwater'
  | 'parking_ticket' | 'traffic_citation' | 'red_light_camera'
  | 'ambulance' | 'code_violation' | 'building_permit'
  | 'dog_tag' | 'parks_permit' | 'other_fee'

export type BillStatus = 'draft' | 'open' | 'due_soon' | 'overdue' | 'paid' | 'cancelled' | 'in_collections' | 'payment_plan'

export interface CitizenBill {
  id: string
  ticket_number: string
  kind: BillKind
  status: BillStatus
  citizen_id: string | null
  source_system: string | null
  source_ref: string | null
  subject: string
  description: string | null
  amount_cents: number
  fee_cents: number
  total_cents: number
  paid_cents: number
  issued_at: string
  due_at: string | null
  paid_at: string | null
  service_address: string | null
  council_district: number | null
  department_id: string | null
  case_id: string | null
  metadata: Record<string, unknown> | null
}

export interface CitizenLite { id: string; full_name: string | null; display_name: string | null; email: string }

export function billStatusKey(s: BillStatus): StringKey {
  return `bills.status.${s}` as StringKey
}
export function billKindKey(k: BillKind): StringKey {
  return `bills.kind.${k}` as StringKey
}

export function formatMoney(cents: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function statusTone(s: BillStatus): { bg: string; text: string; ring: string } {
  switch (s) {
    case 'paid':           return { bg: 'bg-jax-success/15', text: 'text-jax-success', ring: 'ring-jax-success/30' }
    case 'overdue':        return { bg: 'bg-jax-red/15',     text: 'text-jax-red',     ring: 'ring-jax-red/30' }
    case 'in_collections': return { bg: 'bg-jax-red/15',     text: 'text-jax-red',     ring: 'ring-jax-red/30' }
    case 'due_soon':       return { bg: 'bg-jax-warn/15',    text: 'text-jax-warn',    ring: 'ring-jax-warn/30' }
    case 'payment_plan':   return { bg: 'bg-jax-blue/15',    text: 'text-jax-blue',    ring: 'ring-jax-blue/30' }
    case 'cancelled':      return { bg: 'bg-jax-gray-2/30',  text: 'text-jax-gray-3',  ring: 'ring-jax-gray-2/40' }
    default:               return { bg: 'bg-jax-blue/15',    text: 'text-jax-blue',    ring: 'ring-jax-blue/30' }
  }
}

const KIND_COLORS: Record<BillKind, string> = {
  property_tax:     '#0B2D55',
  business_tax:     '#1E5BC6',
  utility:          '#047857',
  stormwater:       '#0E7490',
  parking_ticket:   '#B91C1C',
  traffic_citation: '#B91C1C',
  red_light_camera: '#7E22CE',
  ambulance:        '#7F1D1D',
  code_violation:   '#D97706',
  building_permit:  '#0B2D55',
  dog_tag:          '#D4A437',
  parks_permit:     '#047857',
  other_fee:        '#697586',
}
export function kindColor(k: BillKind): string { return KIND_COLORS[k] || '#1E5BC6' }

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function dueLabel(b: CitizenBill, locale?: string): string {
  if (b.paid_at) return new Date(b.paid_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  if (!b.due_at) return '—'
  return new Date(b.due_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Bills that can be paid right now (used by Pay all CTA + cart). */
export function isPayable(b: CitizenBill): boolean {
  return b.status === 'open' || b.status === 'due_soon' || b.status === 'overdue'
}

export const SOURCE_LABELS: Record<string, { label: string; replaces: string }> = {
  duval_tax_collector:     { label: 'Duval County Tax Collector',  replaces: 'county-taxes.net/fl-duval' },
  duval_tax_collector_btr: { label: 'Duval Tax — Business Tax',     replaces: 'duval.county-taxes.com' },
  jea_obp:                 { label: 'JEA',                          replaces: 'jea.com/OBP' },
  coj_stormwater:          { label: 'COJ Stormwater Utility',       replaces: 'cityfeespublic.coj.net' },
  coj_parking:             { label: 'COJ Public Parking',           replaces: 'pay-parking-tickets' },
  duval_clerk:             { label: 'Duval Clerk of Courts',        replaces: 'epay.duvalclerk.com' },
  photonotice:             { label: 'PhotoNotice',                  replaces: 'photonotice.com' },
  bill2pay:                { label: 'Bill2Pay (JFRD)',              replaces: 'pay.bill2pay.com/client/jaxfire' },
  coj_code_enforcement:    { label: 'COJ Code Enforcement',         replaces: 'issuing department' },
  tyler_energov:           { label: 'Tyler EnerGov',                replaces: 'JAXEPICS.coj.net' },
  coj_animal_care:         { label: 'COJ Animal Care',              replaces: 'jacksonville.gov/animal-care' },
  coj_parks:               { label: 'COJ Parks & Recreation',       replaces: 'jacksonville.gov/parks' },
  coj_city_fees:           { label: 'COJ City Fees',                replaces: 'cityfeespublic.coj.net' },
}
