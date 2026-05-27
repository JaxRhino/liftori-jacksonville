import { useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

/**
 * Keeps the current authenticated agent's presence fresh.
 * - Calls heartbeat() RPC every 30s while the tab is visible
 * - Calls set_away() RPC when the tab loses focus
 * - Calls set_offline() RPC on sign-out / unmount
 */
export function usePresence() {
  const { user, role } = useAuth()

  useEffect(() => {
    // Only agents have presence (citizens don't show "online" indicators)
    if (!user || (role !== 'city_employee' && role !== 'super_admin')) return

    let interval: number | undefined
    let cancelled = false

    function beat() {
      if (cancelled) return
      supabase.rpc('heartbeat').then(() => {})
    }

    function onVisibility() {
      if (document.hidden) {
        supabase.rpc('set_away').then(() => {})
      } else {
        beat()
      }
    }

    function onBeforeUnload() {
      // Best-effort offline signal. Browsers may abort fetch on unload, so
      // we rely on the server-side decay (last_seen_at > 5 min) as the
      // ultimate truth. This is just a hint for cleaner state during normal nav.
      supabase.rpc('set_offline').then(() => {})
    }

    // Initial beat
    beat()
    // Periodic
    interval = window.setInterval(beat, 30_000)
    // Visibility + lifecycle
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [user, role])
}
