// Supabase client for the Liftori-Jacksonville tenant.
// URL + publishable key hardcoded as fallback per Liftori memory:
// EXPO_PUBLIC_*/VITE_* env inlining can fail silently in production bundles.

import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://gnacmyygtmefgojwngpx.supabase.co'
const FALLBACK_KEY = 'sb_publishable_n_oAkkKt6B5RWJl_LJYOFw_Gku6yxE3'

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})

export type UserRole = 'super_admin' | 'city_employee' | 'citizen'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  role: UserRole
  department_id: string | null
  title: string | null
  phone: string | null
  avatar_url: string | null
  street_address: string | null
  city: string | null
  state: string | null
  zip: string | null
  council_district: number | null
  evac_zone: string | null
  hauler: string | null
  re_number: string | null
  last_seen_at: string | null
  status: string | null
  language: 'en' | 'es' | null
}

export interface Department {
  id: string
  slug: string
  name: string
  description: string | null
  color_hex: string
  icon: string | null
  phone: string | null
  email: string | null
  hours_of_operation: string | null
  default_sla_hours: number
}
