import type { Profile, Department, UserRole } from './supabase'
export type { Profile, Department, UserRole }

export type RequestStatus =
  | 'new' | 'triaged' | 'assigned' | 'in_progress' | 'on_hold'
  | 'awaiting_citizen' | 'resolved' | 'closed' | 'cancelled' | 'duplicate'

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent' | 'emergency'

export type RequestSource =
  | 'web' | 'mobile' | 'phone' | 'email' | 'walk_in' | 'social' | 'voice_ai' | 'chat_ai' | 'integration'

export interface ServiceRequest {
  id: string
  ticket_number: string
  subject: string
  description: string | null
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  department_id: string | null
  assigned_to: string | null
  citizen_id: string | null
  citizen_name: string | null
  citizen_email: string | null
  citizen_phone: string | null
  service_address: string | null
  apt_unit: string | null
  landmark: string | null
  city: string | null
  state: string | null
  zip: string | null
  lat: number | null
  lng: number | null
  council_district: number | null
  evac_zone: string | null
  re_number: string | null
  sla_due_at: string | null
  resolved_at: string | null
  closed_at: string | null
  appointment_at: string | null
  est_completion_at: string | null
  ai_summary: string | null
  ai_suggested_category: string | null
  ai_suggested_department_id: string | null
  ai_suggested_priority: RequestPriority | null
  tags: string[]
  duplicate_of: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

// Joined shape returned by our queue queries
export interface ServiceRequestRow extends ServiceRequest {
  department: Pick<Department, 'id' | 'slug' | 'name' | 'color_hex' | 'icon'> | null
  assignee: Pick<Profile, 'id' | 'full_name' | 'display_name' | 'avatar_url' | 'status'> | null
  citizen: Pick<Profile, 'id' | 'full_name' | 'display_name' | 'email' | 'phone'> | null
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  awaiting_citizen: 'Awaiting Citizen',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
  duplicate: 'Duplicate',
}

export const PRIORITY_ORDER: RequestPriority[] = ['emergency','urgent','high','normal','low']

export function priorityTone(p: RequestPriority) {
  switch (p) {
    case 'emergency': return 'bg-red-700 text-white'
    case 'urgent':    return 'bg-jax-red/15 text-jax-red'
    case 'high':      return 'bg-jax-warn/15 text-jax-warn'
    case 'normal':    return 'bg-jax-blue/15 text-jax-blue'
    case 'low':       return 'bg-jax-gray-2/40 text-jax-gray-4'
  }
}

export function statusTone(s: RequestStatus) {
  switch (s) {
    case 'new':
    case 'triaged':           return 'bg-jax-blue/15 text-jax-blue'
    case 'assigned':
    case 'in_progress':       return 'bg-jax-warn/15 text-jax-warn'
    case 'on_hold':
    case 'awaiting_citizen':  return 'bg-jax-gray-2/40 text-jax-gray-4'
    case 'resolved':          return 'bg-jax-success/15 text-jax-success'
    case 'closed':
    case 'cancelled':
    case 'duplicate':         return 'bg-jax-gray-2/40 text-jax-gray-4'
  }
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.floor((now - t) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function slaState(due: string | null): 'breached' | 'soon' | 'ok' | 'none' {
  if (!due) return 'none'
  const ms = new Date(due).getTime() - Date.now()
  if (ms < 0) return 'breached'
  if (ms < 4 * 3600 * 1000) return 'soon'
  return 'ok'
}
